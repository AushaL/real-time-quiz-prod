import { INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ClerkService } from "../src/auth/clerk.service";
import { configureApp } from "../src/bootstrap";
import { assertTestDatabase } from "../src/config/test-database";
import { CloudinaryService } from "../src/media/cloudinary.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RealtimeBusService } from "../src/realtime/realtime-bus.service";
import { RedisService } from "../src/redis/redis.service";
import { InMemoryRealtimeBus } from "./support/in-memory-realtime-bus";

const ADMIN_TOKEN = "admin-token";
const PLAYER_TOKEN = "player-token";
const ADMIN_EMAIL = "admin@test.dev";

class InMemoryRedisService {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.store.get(key) ?? "0") + 1;
    this.store.set(key, String(next));
    return next;
  }

  getClient(): null {
    return null;
  }

  isAvailable(): boolean {
    return false;
  }
}

class FakeCloudinaryService {
  private counter = 0;

  async upload(): Promise<{ url: string; publicId: string }> {
    this.counter += 1;
    return {
      url: `https://cdn.test/file-${this.counter}.png`,
      publicId: `pid-${this.counter}`,
    };
  }

  async destroy(): Promise<void> {}

  createUploadSignature() {
    return {
      cloudName: "test-cloud",
      apiKey: "test-key",
      timestamp: 1_700_000_000,
      folder: "quiz-media",
      signature: "test-signature",
      uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/auto/upload",
    };
  }
}

class FakeClerkService {
  async verifyToken(token: string): Promise<string> {
    if (token === ADMIN_TOKEN) return "user_admin";
    if (token === PLAYER_TOKEN) return "user_player";
    throw new UnauthorizedException("Unauthorized - you must be logged in");
  }

  async getPrimaryEmail(userId: string): Promise<string | null> {
    if (userId === "user_admin") return ADMIN_EMAIL;
    return "player@test.dev";
  }
}

function questionsPayload(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, index) => ({
    questionText: `Question ${index}?`,
    questionType: "text",
    options: ["A", "B", "C"],
    correctAnswerIndex: 0,
    explanation: `Explanation ${index}`,
    ...overrides,
  }));
}

describe("Quiz API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seedQuizId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    // Guards against wiping the development database when Jest is started
    // directly instead of through `npm run test:e2e`.
    assertTestDatabase();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useClass(InMemoryRedisService)
      .overrideProvider(CloudinaryService)
      .useClass(FakeCloudinaryService)
      .overrideProvider(ClerkService)
      .useClass(FakeClerkService)
      .overrideProvider(RealtimeBusService)
      .useClass(InMemoryRealtimeBus)
      .compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.player.deleteMany();

    const seed = await prisma.quiz.create({
      data: {
        title: "Seed quiz",
        description: "Seed description",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "classic",
        questions: {
          create: questionsPayload(4).map((question, position) => ({
            position,
            questionText: question.questionText,
            questionType: "text",
            options: question.options,
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation,
          })),
        },
      },
    });
    seedQuizId = seed.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/health", () => {
    it("reports the database as reachable", async () => {
      await http()
        .get("/api/health")
        .expect(200)
        .expect({ status: "ok", database: "up" });
    });
  });

  describe("GET /api/quizzes", () => {
    it("returns the list in the legacy _id shape", async () => {
      const response = await http().get("/api/quizzes").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const quiz = response.body.find((item: { _id: string }) => item._id === seedQuizId);
      expect(quiz).toMatchObject({
        title: "Seed quiz",
        difficulty: 1,
        mode: "classic",
      });
      expect(quiz.questions).toHaveLength(4);
      expect(quiz.questions[0]).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          questionText: expect.any(String),
          questionType: "text",
          options: ["A", "B", "C"],
        }),
      );
    });

    it("filters by difficulty, type and mode", async () => {
      const matching = await http()
        .get("/api/quizzes?difficulty=1&type=text&mode=classic&sortBy=difficulty&sortOrder=asc")
        .expect(200);
      expect(matching.body).toHaveLength(1);

      const notMatching = await http().get("/api/quizzes?difficulty=4").expect(200);
      expect(notMatching.body).toHaveLength(0);
    });
  });

  describe("GET /api/quizzes/:id", () => {
    it("returns a single quiz", async () => {
      const response = await http().get(`/api/quizzes/${seedQuizId}`).expect(200);
      expect(response.body._id).toBe(seedQuizId);
    });

    it("returns 404 with a message for an unknown quiz", async () => {
      const response = await http().get("/api/quizzes/does-not-exist").expect(404);
      expect(response.body.message).toBe("Quiz not found");
    });
  });

  describe("POST /api/auth/callback", () => {
    it("requires a Clerk token", async () => {
      const response = await http()
        .post("/api/auth/callback")
        .send({ id: "user_player" })
        .expect(401);
      expect(response.body.message).toBe("Unauthorized - you must be logged in");
    });

    it("creates the player from the token subject, not the body", async () => {
      await http()
        .post("/api/auth/callback")
        .set("Authorization", `Bearer ${PLAYER_TOKEN}`)
        .send({
          id: "spoofed_id",
          firstName: "Ada",
          lastName: "Lovelace",
          imageUrl: "https://img.test/ada.png",
        })
        .expect(200)
        .expect({ success: true });

      const player = await prisma.player.findUnique({
        where: { clerkId: "user_player" },
      });
      expect(player).toMatchObject({
        fullName: "Ada Lovelace",
        imageUrl: "https://img.test/ada.png",
      });
      expect(
        await prisma.player.findUnique({ where: { clerkId: "spoofed_id" } }),
      ).toBeNull();
    });

    it("is idempotent on repeated sign-ins", async () => {
      await http()
        .post("/api/auth/callback")
        .set("Authorization", `Bearer ${PLAYER_TOKEN}`)
        .send({ firstName: "Ada" })
        .expect(200);

      expect(await prisma.player.count()).toBe(1);
    });
  });

  describe("GET /api/admin/check", () => {
    it("rejects unauthenticated calls", async () => {
      const response = await http().get("/api/admin/check").expect(401);
      expect(response.body.message).toBe("Unauthorized - you must be logged in");
    });

    it("rejects non-admin users", async () => {
      const response = await http()
        .get("/api/admin/check")
        .set("Authorization", `Bearer ${PLAYER_TOKEN}`)
        .expect(403);
      expect(response.body.message).toBe("Unauthorized - you must be an admin");
    });

    it("accepts the admin user", async () => {
      await http()
        .get("/api/admin/check")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .expect(200)
        .expect({ admin: true });
    });
  });

  describe("admin quiz CRUD", () => {
    const createRequest = (questions: unknown[]) =>
      http()
        .post("/api/admin/quiz")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .field("title", "New quiz")
        .field("description", "New description")
        .field("difficulty", "1")
        .field("variant", "multiple_choice")
        .field("mode", "live")
        .field("questions", JSON.stringify(questions));

    it("validates required fields", async () => {
      const response = await http()
        .post("/api/admin/quiz")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .field("title", "Only a title")
        .expect(400);
      expect(response.body.message).toBe("Missing required quiz fields");
    });

    it("validates the question count against difficulty", async () => {
      const response = await createRequest(questionsPayload(2)).expect(400);
      expect(response.body.message).toBe(
        "For difficulty 1 expected exactly 4 questions, got 2.",
      );
    });

    it("creates a quiz and invalidates the list cache", async () => {
      const before = await http().get("/api/quizzes?mode=live").expect(200);
      expect(before.body).toHaveLength(0);

      const response = await createRequest(questionsPayload(4)).expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: "Quiz created successfully",
        data: { title: "New quiz", mode: "live" },
      });
      expect(response.body.data._id).toEqual(expect.any(String));
      expect(response.body.data.questions).toHaveLength(4);

      const list = await http().get("/api/quizzes?mode=live").expect(200);
      expect(list.body.map((item: { _id: string }) => item._id)).toContain(
        response.body.data._id,
      );
    });

    it("requires a file for image questions", async () => {
      const questions = questionsPayload(4, { questionType: "text" });
      questions[0].questionType = "image";

      const response = await createRequest(questions).expect(400);
      expect(response.body.message).toBe(
        "Missing required file for question at index 0 (image type)",
      );
    });

    it("uploads media for image questions", async () => {
      const questions = questionsPayload(4, { questionType: "text" });
      questions[0].questionType = "image";

      const response = await createRequest(questions)
        .attach("question_0_file", Buffer.from("image-bytes"), {
          filename: "question.png",
          contentType: "image/png",
        })
        .expect(201);

      expect(response.body.data.questions[0].mediaUrl).toMatch(
        /^https:\/\/cdn\.test\/file-\d+\.png$/,
      );
    });

    it("updates a quiz and replaces its questions", async () => {
      const created = await createRequest(questionsPayload(4)).expect(201);
      const id = created.body.data._id;

      const response = await http()
        .put(`/api/admin/quiz/${id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .field("title", "Updated quiz")
        .field("description", "Updated description")
        .field("difficulty", "1")
        .field("variant", "multiple_choice")
        .field("mode", "offline")
        .field("questions", JSON.stringify(questionsPayload(4, { questionText: "Edited?" })))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Quiz updated successfully",
        data: { title: "Updated quiz", mode: "offline" },
      });
      expect(response.body.data.questions[0].questionText).toBe("Edited?");

      const fetched = await http().get(`/api/quizzes/${id}`).expect(200);
      expect(fetched.body.title).toBe("Updated quiz");
    });

    it("returns 404 when updating an unknown quiz", async () => {
      const response = await http()
        .put("/api/admin/quiz/does-not-exist")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .field("title", "Updated quiz")
        .field("description", "Updated description")
        .field("difficulty", "1")
        .field("variant", "multiple_choice")
        .field("mode", "offline")
        .field("questions", JSON.stringify(questionsPayload(4)))
        .expect(404);
      expect(response.body.message).toBe("Quiz not found");
    });

    it("deletes a quiz", async () => {
      const created = await createRequest(questionsPayload(4)).expect(201);
      const id = created.body.data._id;

      await http()
        .delete(`/api/admin/quiz/${id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .expect(200)
        .expect({ message: "Quiz deleted successfully" });

      await http().get(`/api/quizzes/${id}`).expect(404);
    });

    it("requires admin rights for the upload signature", async () => {
      await http()
        .post("/api/media/signature")
        .set("Authorization", `Bearer ${PLAYER_TOKEN}`)
        .expect(403);

      const response = await http()
        .post("/api/media/signature")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .expect(201);
      expect(response.body).toMatchObject({
        cloudName: "test-cloud",
        folder: "quiz-media",
        signature: "test-signature",
      });
    });
  });
});
