import { INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";
import { ClerkService } from "../src/auth/clerk.service";
import { configureApp } from "../src/bootstrap";
import { assertTestDatabase } from "../src/config/test-database";
import { CloudinaryService } from "../src/media/cloudinary.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RealtimeBusService } from "../src/realtime/realtime-bus.service";
import { RedisService } from "../src/redis/redis.service";
import { FakeRoomStore } from "./support/fake-room-store";
import { InMemoryRealtimeBus } from "./support/in-memory-realtime-bus";

const TOKEN_P1 = "token-p1";
const TOKEN_P2 = "token-p2";
const CLERK_P1 = "clerk-p1";
const CLERK_P2 = "clerk-p2";

class SocketRedisService {
  private readonly values = new Map<string, string>();

  constructor(private readonly store: FakeRoomStore) {}

  isAvailable(): boolean {
    return true;
  }

  getClient(): FakeRoomStore {
    return this.store;
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.values.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown): Promise<void> {
    this.values.set(key, JSON.stringify(value));
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.values.delete(key);
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.values.get(key) ?? "0") + 1;
    this.values.set(key, String(next));
    return next;
  }
}

class FakeCloudinaryService {
  async upload(): Promise<{ url: string; publicId: string }> {
    return { url: "https://cdn.test/file.png", publicId: "pid-1" };
  }

  async destroy(): Promise<void> {}

  createUploadSignature() {
    return {
      cloudName: "test-cloud",
      apiKey: "test-key",
      timestamp: 1,
      folder: "quiz-media",
      signature: "sig",
      uploadUrl: "https://api.cloudinary.com/test",
    };
  }
}

class FakeClerkService {
  async verifyToken(token: string): Promise<string> {
    if (token === TOKEN_P1) return CLERK_P1;
    if (token === TOKEN_P2) return CLERK_P2;
    throw new UnauthorizedException("Unauthorized - you must be logged in");
  }

  async getPrimaryEmail(): Promise<string | null> {
    return null;
  }
}

interface Ack {
  ok: boolean;
  message?: string;
  code?: string;
  room?: {
    code: string;
    status: string;
    currentQuestionIndex: number;
    total: number;
    hostId: string;
    revealed: boolean;
  };
  players?: { id: string; name: string; connected: boolean; score: number }[];
  chat?: unknown[];
  question?: { questionText: string };
  myAnswer?: number;
  reveal?: { correctIndex: number } | null;
  result?: { id: string; score: number }[];
}

function emitAck<T = Ack>(
  socket: Socket,
  event: string,
  payload?: unknown,
): Promise<T> {
  return new Promise((resolve) => {
    if (payload === undefined) socket.emit(event, resolve);
    else socket.emit(event, payload, resolve);
  });
}

function nextEvent<T = unknown>(
  socket: Socket,
  event: string,
  predicate?: (payload: T) => boolean,
): Promise<T> {
  return new Promise((resolve) => {
    const handler = (payload: T) => {
      if (predicate && !predicate(payload)) return;
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

describe("Realtime multiplayer (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let quizId: string;
  let port: number;
  const sockets: Socket[] = [];

  const connect = (token?: string, name?: string): Socket => {
    const socket = io(`http://127.0.0.1:${port}`, {
      auth: token ? { token, name } : {},
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
      timeout: 5_000,
    });
    sockets.push(socket);
    return socket;
  };

  const connectAndWait = async (token: string, name?: string): Promise<Socket> => {
    const socket = connect(token, name);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", (error: Error) => reject(error));
    });
    return socket;
  };

  beforeAll(async () => {
    assertTestDatabase();

    const store = new FakeRoomStore();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue(new SocketRedisService(store))
      .overrideProvider(CloudinaryService)
      .useClass(FakeCloudinaryService)
      .overrideProvider(ClerkService)
      .useClass(FakeClerkService)
      .overrideProvider(RealtimeBusService)
      .useClass(InMemoryRealtimeBus)
      .compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    await app.listen(0, "127.0.0.1");
    port = (app.getHttpServer().address() as AddressInfo).port;

    prisma = app.get(PrismaService);
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.player.deleteMany();

    await prisma.player.createMany({
      data: [
        { clerkId: CLERK_P1, fullName: "Ada", imageUrl: "https://img.test/ada.png" },
        { clerkId: CLERK_P2, fullName: "Bob", imageUrl: "" },
      ],
    });

    const quiz = await prisma.quiz.create({
      data: {
        title: "Live quiz",
        description: "Two questions",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "live",
        questions: {
          create: [0, 1].map((position) => ({
            position,
            questionText: `Question ${position}?`,
            questionType: "text",
            options: ["A", "B", "C"],
            correctAnswerIndex: 0,
            explanation: `Explanation ${position}`,
          })),
        },
      },
    });
    quizId = quiz.id;
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
  });

  it("rejects a socket without a valid Clerk token", async () => {
    const socket = connect("invalid-token");
    const error = await new Promise<Error>((resolve) => {
      socket.once("connect_error", resolve);
    });

    expect(error.message).toBe("unauthorized");
    expect(socket.connected).toBe(false);
  });

  it("plays a full game, supports reconnect/rejoin and chat", async () => {
    const p1 = await connectAndWait(TOKEN_P1, "Ada from client");
    const p2 = await connectAndWait(TOKEN_P2, "Bob");

    // Missing quiz payload and unknown rooms keep the legacy messages.
    const missingQuiz = await emitAck(p1, "room:create", {});
    expect(missingQuiz).toEqual({ ok: false, message: "quizId обязателен" });

    const unknownRoom = await emitAck(p2, "room:join", { code: "ZZZZZZ" });
    expect(unknownRoom).toEqual({ ok: false, message: "Комната не найдена" });

    const created = await emitAck(p1, "room:create", { quizId });
    expect(created.ok).toBe(true);
    expect(created.room).toMatchObject({
      status: "lobby",
      hostId: CLERK_P1,
      total: 0,
    });
    expect(created.players).toEqual([
      expect.objectContaining({
        id: CLERK_P1,
        name: "Ada", // profile from PostgreSQL wins over the handshake name
        connected: true,
        score: 0,
      }),
    ]);

    const code = created.code as string;
    expect(code).toHaveLength(6);

    // Existing players are told about the newcomer.
    const joinedUpdate = nextEvent(p1, "room:update");
    const joined = await emitAck(p2, "room:join", { code: code.toLowerCase() });
    expect(joined.ok).toBe(true);
    expect(joined.players).toHaveLength(2);
    await expect(joinedUpdate).resolves.toMatchObject({
      code,
      players: expect.arrayContaining([
        expect.objectContaining({ id: CLERK_P2, connected: true }),
      ]),
    });

    // Only the host can start.
    const notHost = await emitAck(p2, "game:start");
    expect(notHost).toEqual({
      ok: false,
      message: "Только хост может начать игру",
    });

    const questionPayload = nextEvent<{
      index: number;
      total: number;
      question: Record<string, unknown>;
    }>(p1, "game:question");
    const questionPayloadP2 = nextEvent<{ index: number }>(p2, "game:question");

    const startAck = await emitAck(p1, "game:start");
    expect(startAck).toEqual({ ok: true });

    const firstQuestion = await questionPayload;
    await expect(questionPayloadP2).resolves.toMatchObject({ index: 0 });
    expect(firstQuestion).toMatchObject({
      index: 0,
      total: 2,
      question: {
        questionText: "Question 0?",
        questionType: "text",
        options: ["A", "B", "C"],
      },
    });
    // Nothing that reveals the answer may reach the client before the reveal.
    expect(firstQuestion.question).not.toHaveProperty("correctAnswerIndex");
    expect(firstQuestion.question).not.toHaveProperty("explanation");

    const p1Answer = await emitAck(p1, "game:answer", {
      questionIndex: 0,
      answerIndex: 0,
    });
    expect(p1Answer).toMatchObject({ ok: true, allAnswered: false });

    const revealP1 = nextEvent<{
      questionIndex: number;
      correctIndex: number;
      results: { id: string; correct: boolean }[];
      players: { id: string; score: number }[];
      isLast: boolean;
    }>(p1, "game:reveal");
    const p2Answer = await emitAck(p2, "game:answer", {
      questionIndex: 0,
      answerIndex: 1,
    });
    expect(p2Answer).toMatchObject({ ok: true, allAnswered: true });

    const reveal = await revealP1;
    expect(reveal).toMatchObject({
      questionIndex: 0,
      correctIndex: 0,
      isLast: false,
    });
    expect(reveal.results).toEqual([
      { id: CLERK_P1, correct: true },
      { id: CLERK_P2, correct: false },
    ]);
    expect(reveal.players.find((player) => player.id === CLERK_P1)?.score).toBe(1);

    // The reveal delay is shortened in the e2e environment.
    const secondQuestion = await nextEvent<{ index: number; question: { questionText: string } }>(
      p1,
      "game:question",
    );
    expect(secondQuestion).toMatchObject({
      index: 1,
      question: { questionText: "Question 1?" },
    });

    // Reconnect during a game: the player takes the same seat back and gets
    // the current question back in the join acknowledgement.
    const disconnectedUpdate = nextEvent(
      p1,
      "room:update",
      (payload: { players: { id: string; connected: boolean }[] }) =>
        payload.players.find((player) => player.id === CLERK_P2)?.connected === false,
    );
    p2.disconnect();
    await expect(disconnectedUpdate).resolves.toBeDefined();

    const p2Again = await connectAndWait(TOKEN_P2, "Bob");
    const reconnectUpdate = nextEvent(
      p1,
      "room:update",
      (payload: { players: { id: string; connected: boolean }[] }) =>
        payload.players.find((player) => player.id === CLERK_P2)?.connected === true,
    );
    const rejoined = await emitAck(p2Again, "room:join", { code });
    expect(rejoined).toMatchObject({
      ok: true,
      code,
      room: { status: "playing", currentQuestionIndex: 1 },
      question: { questionText: "Question 1?" },
    });
    await expect(reconnectUpdate).resolves.toBeDefined();

    // Chat is broadcast to everyone in the room.
    const chatP1 = nextEvent<{ playerId: string; name: string; text: string }>(
      p1,
      "chat:message",
    );
    const chatP2 = nextEvent<{ playerId: string; text: string }>(
      p2Again,
      "chat:message",
    );
    p1.emit("chat:send", { text: "  Hello room  " });
    await expect(chatP1).resolves.toMatchObject({
      playerId: CLERK_P1,
      name: "Ada",
      text: "Hello room",
    });
    await expect(chatP2).resolves.toMatchObject({
      playerId: CLERK_P1,
      text: "Hello room",
    });

    // Both players finish the last question.
    const resultP1 = nextEvent<{ players: { id: string; score: number }[] }>(
      p1,
      "game:result",
    );
    await emitAck(p1, "game:answer", { questionIndex: 1, answerIndex: 0 });
    const finalReveal = nextEvent(p1, "game:reveal");
    await emitAck(p2Again, "game:answer", { questionIndex: 1, answerIndex: 0 });
    await expect(finalReveal).resolves.toMatchObject({
      questionIndex: 1,
      correctIndex: 0,
      isLast: true,
    });

    const result = await resultP1;
    expect(result.players).toEqual([
      expect.objectContaining({ id: CLERK_P1, score: 2 }),
      expect.objectContaining({ id: CLERK_P2, score: 1 }),
    ]);

    // Leaving after the game keeps the player in the scoreboard, now offline.
    const leftUpdate = nextEvent(
      p1,
      "room:update",
      (payload: { players: { id: string; connected: boolean }[] }) =>
        payload.players.find((player) => player.id === CLERK_P2)?.connected === false,
    );
    p2Again.emit("room:leave");
    await expect(leftUpdate).resolves.toBeDefined();

    p1.emit("room:leave");
  });
});
