import { NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { QuizCacheService } from "./quiz-cache.service";
import type { QuizWithQuestions } from "./quiz.mapper";
import { QuizzesService } from "./quizzes.service";
import type { QuizWriteInput } from "./quiz-write";

function buildQuizRow(overrides: Partial<QuizWithQuestions> = {}): QuizWithQuestions {
  const now = new Date("2026-01-02T03:04:05.000Z");
  return {
    id: "quiz-1",
    title: "Capitals",
    description: "World capitals",
    difficulty: 1,
    variant: "multiple_choice",
    mode: "classic",
    createdAt: now,
    updatedAt: now,
    questions: [
      {
        id: "q-1",
        quizId: "quiz-1",
        position: 0,
        questionText: "Capital of France?",
        questionType: "text",
        mediaUrl: null,
        mediaPublicId: null,
        options: ["Paris", "Rome"],
        correctAnswerIndex: 0,
        explanation: null,
      },
    ],
    ...overrides,
  };
}

function buildInput(): QuizWriteInput {
  return {
    title: "Capitals",
    description: "World capitals",
    difficulty: 1,
    variant: "multiple_choice",
    mode: "classic",
    questions: [
      {
        questionText: "Capital of France?",
        questionType: "text",
        mediaUrl: null,
        mediaPublicId: null,
        options: ["Paris", "Rome"],
        correctAnswerIndex: 0,
        explanation: null,
      },
    ],
  };
}

describe("QuizzesService", () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const deleteRow = jest.fn();
  const deleteMany = jest.fn();
  const transaction = jest.fn(
    async (callback: (tx: unknown) => unknown) =>
      callback({ question: { deleteMany }, quiz: { update } }),
  );
  const prisma = {
    quiz: { findMany, findUnique, create, update, delete: deleteRow },
    $transaction: transaction,
  } as unknown as PrismaService;

  const cache = {
    getList: jest.fn(),
    setList: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
    invalidate: jest.fn(),
  };
  const cacheService = cache as unknown as QuizCacheService;

  let service: QuizzesService;

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({ question: { deleteMany }, quiz: { update } }),
    );
    service = new QuizzesService(prisma, cacheService);
  });

  it("maps database rows to the _id based client contract", async () => {
    cache.getList.mockResolvedValue(null);
    findMany.mockResolvedValue([buildQuizRow()]);

    const result = await service.findAll({});

    expect(result).toEqual([
      {
        _id: "quiz-1",
        title: "Capitals",
        description: "World capitals",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            _id: "q-1",
            questionText: "Capital of France?",
            questionType: "text",
            options: ["Paris", "Rome"],
            correctAnswerIndex: 0,
          },
        ],
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      },
    ]);
    expect(cache.setList).toHaveBeenCalledTimes(1);
  });

  it("returns cached quizzes without touching the database", async () => {
    const cached = [{ _id: "quiz-1" }];
    cache.getList.mockResolvedValue(cached);

    await expect(service.findAll({})).resolves.toBe(cached);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("translates query parameters into a Prisma filter", async () => {
    cache.getList.mockResolvedValue(null);
    findMany.mockResolvedValue([]);

    await service.findAll({
      difficulty: "2,1",
      mode: "live",
      type: "image,audio",
      sortBy: "difficulty",
      sortOrder: "asc",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          difficulty: { in: [1, 2] },
          mode: { in: ["live"] },
          questions: { some: { questionType: { in: ["audio", "image"] } } },
        },
        orderBy: { difficulty: "asc" },
      }),
    );
  });

  it("defaults to newest first when no sort is requested", async () => {
    cache.getList.mockResolvedValue(null);
    findMany.mockResolvedValue([]);

    await service.findAll({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("throws 404 when the quiz does not exist", async () => {
    cache.getItem.mockResolvedValue(null);
    findUnique.mockResolvedValue(null);

    await expect(service.findById("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findById("missing")).rejects.toThrow("Quiz not found");
  });

  it("serves a quiz from cache", async () => {
    const cached = { _id: "quiz-1" };
    cache.getItem.mockResolvedValue(cached);

    await expect(service.findById("quiz-1")).resolves.toBe(cached);
    expect(findUnique).not.toHaveBeenCalled();
  });

  describe("create", () => {
    it("persists the aggregate with question positions and invalidates the cache", async () => {
      create.mockResolvedValue(buildQuizRow());

      const result = await service.create(buildInput());

      expect(create).toHaveBeenCalledWith({
        data: {
          title: "Capitals",
          description: "World capitals",
          difficulty: 1,
          variant: "multiple_choice",
          mode: "classic",
          questions: {
            create: [
              expect.objectContaining({
                position: 0,
                questionText: "Capital of France?",
                questionType: "text",
              }),
            ],
          },
        },
        include: { questions: { orderBy: { position: "asc" } } },
      });
      expect(cache.invalidate).toHaveBeenCalledWith("quiz-1");
      expect(result).toMatchObject({ _id: "quiz-1" });
    });
  });

  describe("update", () => {
    it("replaces the questions inside a transaction and invalidates the cache", async () => {
      findUnique.mockResolvedValue({ id: "quiz-1" });
      update.mockResolvedValue(buildQuizRow());

      const result = await service.update("quiz-1", buildInput());

      expect(findUnique).toHaveBeenCalledWith({
        where: { id: "quiz-1" },
        select: { id: true },
      });
      expect(deleteMany).toHaveBeenCalledWith({ where: { quizId: "quiz-1" } });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "quiz-1" },
          data: expect.objectContaining({
            title: "Capitals",
            questions: { create: [expect.objectContaining({ position: 0 })] },
          }),
        }),
      );
      expect(cache.invalidate).toHaveBeenCalledWith("quiz-1");
      expect(result).toMatchObject({ _id: "quiz-1" });
    });

    it("throws 404 without writing when the quiz does not exist", async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.update("missing", buildInput())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("returns the media snapshot after deleting and invalidates the cache", async () => {
      const snapshot = {
        id: "quiz-1",
        questions: [{ mediaUrl: "https://cdn/pic.png", mediaPublicId: "pid" }],
      };
      findUnique.mockResolvedValue(snapshot);
      deleteRow.mockResolvedValue({});

      await expect(service.remove("quiz-1")).resolves.toEqual(snapshot);

      expect(deleteRow).toHaveBeenCalledWith({ where: { id: "quiz-1" } });
      expect(cache.invalidate).toHaveBeenCalledWith("quiz-1");
    });

    it("throws 404 and keeps the quiz when it does not exist", async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.remove("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(deleteRow).not.toHaveBeenCalled();
    });
  });

  describe("getMediaSnapshot", () => {
    it("selects only the media fields", async () => {
      const snapshot = { id: "quiz-1", questions: [{ mediaUrl: null, mediaPublicId: null }] };
      findUnique.mockResolvedValue(snapshot);

      await expect(service.getMediaSnapshot("quiz-1")).resolves.toEqual(snapshot);

      expect(findUnique).toHaveBeenCalledWith({
        where: { id: "quiz-1" },
        select: {
          id: true,
          questions: { select: { mediaUrl: true, mediaPublicId: true } },
        },
      });
    });

    it("throws 404 when the quiz does not exist", async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.getMediaSnapshot("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
