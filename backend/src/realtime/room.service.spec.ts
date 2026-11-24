import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";
import { FakeRoomStore } from "../../test/support/fake-room-store";
import {
  CODE_LENGTH,
  RoomService,
  toPublicQuestion,
  type RoomStoreClient,
} from "./room.service";

const quizRow = {
  id: "quiz-1",
  title: "Quiz",
  description: "",
  difficulty: 1,
  variant: "multiple_choice",
  mode: "classic",
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [
    {
      id: "q-1",
      quizId: "quiz-1",
      position: 0,
      questionText: "First?",
      questionType: "text",
      mediaUrl: null,
      mediaPublicId: null,
      options: ["A", "B"],
      correctAnswerIndex: 0,
      explanation: "Because A",
    },
    {
      id: "q-2",
      quizId: "quiz-1",
      position: 1,
      questionText: "Second?",
      questionType: "image",
      mediaUrl: "https://cdn.test/second.png",
      mediaPublicId: "pid-2",
      options: ["C", "D"],
      correctAnswerIndex: 1,
      explanation: null,
    },
  ],
};

describe("RoomService", () => {
  const store = new FakeRoomStore();
  const findUnique = jest.fn();
  const prisma = { quiz: { findUnique } } as unknown as PrismaService;
  const redis = {
    isAvailable: () => true,
    getClient: () => store as unknown as RoomStoreClient,
  } as unknown as RedisService;

  let service: RoomService;

  beforeEach(() => {
    store.reset();
    findUnique.mockReset();
    findUnique.mockResolvedValue(quizRow);
    service = new RoomService(redis, prisma);
  });

  async function roomWithPlayers(count: number, sockets = false) {
    const { code } = await service.createRoom(
      "quiz-1",
      "p1",
      { name: "One" },
      sockets ? "s1" : undefined,
    );
    for (let index = 2; index <= count; index += 1) {
      await service.joinRoom(
        code,
        `p${index}`,
        { name: `Player ${index}` },
        sockets ? `s${index}` : undefined,
      );
    }
    return code;
  }

  it("creates a room with a short code and the host seated", async () => {
    const { code } = await service.createRoom("quiz-1", "p1", {
      name: "Host",
      avatarUrl: "https://img.test/host.png",
    });

    expect(code).toHaveLength(CODE_LENGTH);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);

    const room = await service.getRoom(code);
    expect(room).toMatchObject({
      code,
      quizId: "quiz-1",
      hostId: "p1",
      status: "lobby",
      total: 0,
      revealed: false,
    });

    const [host] = await service.getPlayers(code);
    expect(host).toMatchObject({
      id: "p1",
      name: "Host",
      avatarUrl: "https://img.test/host.png",
      connected: true,
      score: 0,
    });
  });

  it("rejects creating a room for an unknown quiz", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.createRoom("missing", "p1", { name: "Host" }),
    ).rejects.toThrow("Квиз не найден");
  });

  it("enforces the 4 player cap in the lobby", async () => {
    const code = await roomWithPlayers(4);

    await expect(
      service.joinRoom(code, "p5", { name: "Fifth" }),
    ).rejects.toThrow("Комната заполнена");
  });

  it("rejects new players after the game started but lets a player rejoin", async () => {
    const code = await roomWithPlayers(2, true);
    await service.startGame(code, "p1");
    await service.markDisconnected(code, "p2", "s2");

    await expect(
      service.joinRoom(code, "p3", { name: "Late" }),
    ).rejects.toThrow("Игра уже началась");

    await expect(
      service.joinRoom(code, "p2", { name: "Two" }, "s2-new"),
    ).resolves.toEqual({ code, rejoined: true });

    const players = await service.getPlayers(code);
    expect(players.find((player) => player.id === "p2")).toMatchObject({
      connected: true,
      name: "Two",
    });
  });

  it("only lets the host start the game and requires two players", async () => {
    const { code } = await service.createRoom("quiz-1", "p1", { name: "One" });

    await expect(service.startGame(code, "p1")).rejects.toThrow(
      "Нужно минимум 2 игрока",
    );

    await service.joinRoom(code, "p2", { name: "Two" });
    await expect(service.startGame(code, "p2")).rejects.toThrow(
      "Только хост может начать игру",
    );

    await expect(service.startGame(code, "p1")).resolves.toMatchObject({
      questions: [
        expect.objectContaining({ questionText: "First?", correctAnswerIndex: 0 }),
        expect.objectContaining({ questionText: "Second?", correctAnswerIndex: 1 }),
      ],
    });

    const room = await service.getRoom(code);
    expect(room).toMatchObject({
      status: "playing",
      currentQuestionIndex: 0,
      total: 2,
      revealed: false,
    });
  });

  it("never exposes the correct answer in the public question", () => {
    const publicQuestion = toPublicQuestion({
      questionText: "First?",
      questionType: "text",
      options: ["A", "B"],
      correctAnswerIndex: 0,
      explanation: "Because A",
    });

    expect(publicQuestion).toEqual({
      questionText: "First?",
      questionType: "text",
      options: ["A", "B"],
    });
    expect(publicQuestion).not.toHaveProperty("correctAnswerIndex");
    expect(publicQuestion).not.toHaveProperty("explanation");
  });

  it("counts unique answers from connected players only", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");

    expect(await service.answerQuestion(code, "p1", 0, 0)).toMatchObject({
      allAnswered: false,
      answered: 1,
      total: 2,
    });

    // A duplicate answer must not count twice.
    expect(await service.answerQuestion(code, "p1", 0, 1)).toMatchObject({
      allAnswered: false,
      answered: 1,
    });

    await service.markDisconnected(code, "p2");
    expect(await service.answerQuestion(code, "p1", 0, 0)).toMatchObject({
      allAnswered: true,
      answered: 1,
      total: 1,
    });

    expect(await service.answerQuestion(code, "p1", 1, 0)).toMatchObject({
      allAnswered: false,
    });
  });

  it("scores each reveal once and stores the reveal for reconnects", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");
    await service.answerQuestion(code, "p1", 0, 0);
    await service.answerQuestion(code, "p2", 0, 1);

    const reveal = await service.reveal(code, 0);
    expect(reveal).toMatchObject({
      questionIndex: 0,
      correctIndex: 0,
      explanation: "Because A",
      isLast: false,
      results: [
        { id: "p1", correct: true },
        { id: "p2", correct: false },
      ],
    });
    expect(
      reveal?.players.find((player) => player.id === "p1")?.score,
    ).toBe(1);

    expect(await service.reveal(code, 0)).toBeNull();
    expect(await service.getReveal(code, 0)).toMatchObject({
      questionIndex: 0,
      correctIndex: 0,
    });
    expect((await service.getRoom(code))?.revealed).toBe(true);
  });

  it("ignores reveals for a stale question index", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");

    expect(await service.reveal(code, 1)).toBeNull();
  });

  it("advances only after a reveal and finishes after the last question", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");

    expect(await service.advance(code)).toBeNull();

    await service.reveal(code);
    expect(await service.advance(code, 0)).toEqual({ finished: false, index: 1 });
    expect(await service.advance(code, 0)).toBeNull();
    expect(await service.getRoom(code)).toMatchObject({
      currentQuestionIndex: 1,
      revealed: false,
      status: "playing",
    });

    await service.reveal(code);
    expect(await service.advance(code, 1)).toEqual({ finished: true });
    expect((await service.getRoom(code))?.status).toBe("finished");
  });

  it("transfers the host and deletes an empty room", async () => {
    const code = await roomWithPlayers(2);

    await service.leaveRoom(code, "p1");
    expect((await service.getRoom(code))?.hostId).toBe("p2");

    await service.leaveRoom(code, "p2");
    expect(await service.getRoom(code)).toBeNull();
  });

  it("ignores leave/disconnect from a stale socket after a reconnect", async () => {
    const code = await roomWithPlayers(2, true);

    await service.markDisconnected(code, "p2", "old-socket");
    expect(
      (await service.getPlayers(code)).find((player) => player.id === "p2")
        ?.connected,
    ).toBe(true);

    await service.leaveRoom(code, "p2", "old-socket");
    expect(await service.getPlayers(code)).toHaveLength(2);

    await service.markDisconnected(code, "p2", "s2");
    expect(
      (await service.getPlayers(code)).find((player) => player.id === "p2")
        ?.connected,
    ).toBe(false);
  });

  it("restores the current question, own answer and reveal on rejoin", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");
    await service.answerQuestion(code, "p1", 0, 1);
    await service.reveal(code);

    const snapshot = await service.getJoinSnapshot(code, "p1");
    expect(snapshot).toMatchObject({
      code,
      room: { status: "playing", currentQuestionIndex: 0, revealed: true },
      question: { questionText: "First?" },
      myAnswer: 1,
      reveal: { correctIndex: 0, questionIndex: 0 },
    });
  });

  it("includes the sorted result in a finished room snapshot", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");
    await service.answerQuestion(code, "p1", 0, 0);
    await service.reveal(code);
    await service.advance(code, 0);
    await service.reveal(code);
    await service.advance(code, 1);

    const snapshot = await service.getJoinSnapshot(code, "p2");
    expect(snapshot?.room.status).toBe("finished");
    expect(snapshot?.result?.map((player) => player.id)).toEqual(["p1", "p2"]);
  });

  it("adds chat messages with the player's profile", async () => {
    const code = await roomWithPlayers(1);

    const message = await service.addChat(code, "p1", "Привет");
    expect(message).toMatchObject({
      playerId: "p1",
      name: "One",
      avatarUrl: "",
      text: "Привет",
    });
    expect(await service.getChat(code)).toEqual([message]);
  });

  it("ignores advance requests for a stale question index", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");
    await service.reveal(code);

    expect(await service.advance(code, 5)).toBeNull();
    expect((await service.getRoom(code))?.currentQuestionIndex).toBe(0);
  });

  it("reports whether every connected player answered", async () => {
    expect(await service.isCurrentQuestionAnswered("MISSING")).toBe(false);

    const code = await roomWithPlayers(2);
    expect(await service.isCurrentQuestionAnswered(code)).toBe(false);

    await service.startGame(code, "p1");
    expect(await service.isCurrentQuestionAnswered(code)).toBe(false);

    await service.answerQuestion(code, "p1", 0, 0);
    expect(await service.isCurrentQuestionAnswered(code)).toBe(false);

    await service.answerQuestion(code, "p2", 0, 1);
    expect(await service.isCurrentQuestionAnswered(code)).toBe(true);
  });

  it("deletes per-question keys when the last player leaves a played room", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");
    await service.reveal(code);

    await service.leaveRoom(code, "p1");
    await service.leaveRoom(code, "p2");

    expect(await service.getRoom(code)).toBeNull();
    expect(await service.getQuestions(code)).toBeNull();
  });

  it("tolerates malformed JSON written by an older deployment", async () => {
    const code = await roomWithPlayers(2);
    await service.startGame(code, "p1");

    store.set(`room:${code}:questions`, "{not-json", "EX", 60);
    store.set(`room:${code}:reveal:0`, "{not-json", "EX", 60);
    await store.rpush(`room:${code}:chat`, "not-json");
    await store.hset(`room:${code}:players`, "p1", "{broken");

    expect(await service.getQuestions(code)).toBeNull();
    expect(await service.getReveal(code, 0)).toBeNull();
    expect(await service.getChat(code)).toEqual([]);
    expect(
      (await service.getPlayers(code)).find((player) => player.id === "p1"),
    ).toMatchObject({ name: "Игрок", connected: true });
  });

  it("returns null when leaving a room that no longer exists", async () => {
    expect(await service.leaveRoom("MISSING", "p1")).toBeNull();
  });

  it("reports the room store as unavailable when Redis is down", async () => {
    const offline = new RoomService(
      {
        isAvailable: () => false,
        getClient: () => null,
      } as unknown as RedisService,
      prisma,
    );

    await expect(offline.getRoom("ABCDEF")).rejects.toThrow(
      "Хранилище комнат недоступно",
    );
  });
});
