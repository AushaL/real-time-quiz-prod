import type { ConfigService } from "@nestjs/config";
import type { QueueService } from "../queue/queue.service";
import {
  DEFAULT_QUESTION_TIMEOUT_MS,
  DEFAULT_REVEAL_DELAY_MS,
  GameCoordinatorService,
} from "./game-coordinator.service";
import type { RealtimeBusService } from "./realtime-bus.service";
import type { RoomService } from "./room.service";
import type {
  RevealPayload,
  RoomRecord,
  RoomState,
  RoomPlayer,
  StoredQuestion,
} from "./room.types";

const room: RoomRecord = {
  code: "ROOM01",
  quizId: "quiz-1",
  hostId: "p1",
  status: "playing",
  currentQuestionIndex: 0,
  total: 2,
  maxPlayers: 4,
  revealed: false,
};

const players: RoomPlayer[] = [
  { id: "p1", name: "One", avatarUrl: "", connected: true, score: 1 },
  { id: "p2", name: "Two", avatarUrl: "", connected: true, score: 0 },
];

const state: RoomState = { code: "ROOM01", room, players, chat: [] };

const questions: StoredQuestion[] = [
  {
    questionText: "First?",
    questionType: "text",
    options: ["A", "B"],
    correctAnswerIndex: 0,
    explanation: "Because A",
  },
  {
    questionText: "Second?",
    questionType: "text",
    options: ["C", "D"],
    correctAnswerIndex: 1,
  },
];

const revealPayload: RevealPayload = {
  questionIndex: 0,
  correctIndex: 0,
  explanation: "Because A",
  results: [{ id: "p1", correct: true }],
  players,
  isLast: false,
};

describe("GameCoordinatorService", () => {
  const rooms = {
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
    getJoinSnapshot: jest.fn(),
    leaveRoom: jest.fn(),
    markDisconnected: jest.fn(),
    getRoom: jest.fn(),
    isCurrentQuestionAnswered: jest.fn(),
    startGame: jest.fn(),
    answerQuestion: jest.fn(),
    reveal: jest.fn(),
    advance: jest.fn(),
    getRoomState: jest.fn(),
    getQuestions: jest.fn(),
    addChat: jest.fn(),
  };

  const publish = jest.fn().mockResolvedValue(undefined);
  const enqueue = jest.fn().mockResolvedValue(undefined);

  const config = {
    get: jest.fn((key: string) => {
      if (key === "QUESTION_TIMEOUT_MS") return 1_000;
      if (key === "REVEAL_DELAY_MS") return 100;
      return undefined;
    }),
  } as unknown as ConfigService;

  let service: GameCoordinatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    publish.mockResolvedValue(undefined);
    enqueue.mockResolvedValue(undefined);
    rooms.getRoomState.mockResolvedValue(state);
    service = new GameCoordinatorService(
      rooms as unknown as RoomService,
      { publish } as unknown as RealtimeBusService,
      { enqueue } as unknown as QueueService,
      config,
    );
  });

  it("uses the documented default timings", () => {
    expect(DEFAULT_QUESTION_TIMEOUT_MS).toBe(60_000);
    expect(DEFAULT_REVEAL_DELAY_MS).toBe(4_000);
  });

  it("creates a room and broadcasts its state", async () => {
    rooms.createRoom.mockResolvedValue({ code: "ROOM01" });

    await expect(
      service.createRoom("quiz-1", "p1", { name: "One" }, "s1"),
    ).resolves.toBe("ROOM01");

    expect(rooms.createRoom).toHaveBeenCalledWith(
      "quiz-1",
      "p1",
      { name: "One" },
      "s1",
    );
    expect(publish).toHaveBeenCalledWith({
      event: "room:update",
      code: "ROOM01",
      payload: { code: "ROOM01", room: state.room, players: state.players },
    });
  });

  it("returns the join snapshot and broadcasts the new player", async () => {
    rooms.getJoinSnapshot.mockResolvedValue({ ...state });

    await expect(
      service.joinRoom("ROOM01", "p2", { name: "Two" }, "s2"),
    ).resolves.toMatchObject({ code: "ROOM01" });

    expect(rooms.joinRoom).toHaveBeenCalledWith(
      "ROOM01",
      "p2",
      { name: "Two" },
      "s2",
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "room:update" }),
    );
  });

  it("throws when the join snapshot disappeared", async () => {
    rooms.getJoinSnapshot.mockResolvedValue(null);
    await expect(
      service.joinRoom("ROOM01", "p2", { name: "Two" }),
    ).rejects.toThrow("Комната не найдена");
  });

  it("starts the game: first question, room update and durable timeout", async () => {
    rooms.startGame.mockResolvedValue({ questions });

    await service.startGame("ROOM01", "p1");

    expect(publish).toHaveBeenNthCalledWith(1, {
      event: "game:question",
      code: "ROOM01",
      payload: {
        index: 0,
        total: 2,
        question: {
          questionText: "First?",
          questionType: "text",
          options: ["A", "B"],
        },
      },
    });
    expect(publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: "room:update" }),
    );
    expect(enqueue).toHaveBeenCalledWith(
      { type: "question-timeout", code: "ROOM01", questionIndex: 0 },
      1_000,
    );
  });

  it("reveals immediately when everybody answered", async () => {
    rooms.answerQuestion.mockResolvedValue({
      allAnswered: true,
      answered: 2,
      total: 2,
    });
    rooms.reveal.mockResolvedValue(revealPayload);

    await expect(service.submitAnswer("ROOM01", "p1", 0, 0)).resolves.toMatchObject(
      { allAnswered: true },
    );

    expect(publish).toHaveBeenCalledWith({
      event: "game:reveal",
      code: "ROOM01",
      payload: revealPayload,
    });
    expect(enqueue).toHaveBeenCalledWith(
      { type: "advance", code: "ROOM01", questionIndex: 0 },
      100,
    );
  });

  it("does not broadcast when the reveal was already claimed", async () => {
    rooms.answerQuestion.mockResolvedValue({ allAnswered: true });
    rooms.reveal.mockResolvedValue(null);

    await service.submitAnswer("ROOM01", "p1", 0, 0);

    expect(publish).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("emits the next question and schedules its timeout", async () => {
    rooms.advance.mockResolvedValue({ finished: false, index: 1 });
    rooms.getQuestions.mockResolvedValue(questions);

    await expect(service.advance("ROOM01", 0)).resolves.toEqual({
      finished: false,
      index: 1,
    });

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "game:question",
        payload: expect.objectContaining({ index: 1 }),
      }),
    );
    expect(enqueue).toHaveBeenCalledWith(
      { type: "question-timeout", code: "ROOM01", questionIndex: 1 },
      1_000,
    );
  });

  it("broadcasts the sorted result when the last question advanced", async () => {
    rooms.advance.mockResolvedValue({ finished: true });
    rooms.getRoomState.mockResolvedValue({
      ...state,
      players: [
        { id: "p1", name: "One", avatarUrl: "", connected: true, score: 1 },
        { id: "p2", name: "Two", avatarUrl: "", connected: true, score: 3 },
      ],
    });

    await service.advance("ROOM01", 1);

    expect(publish).toHaveBeenCalledWith({
      event: "game:result",
      code: "ROOM01",
      payload: {
        players: [
          { id: "p2", name: "Two", avatarUrl: "", connected: true, score: 3 },
          { id: "p1", name: "One", avatarUrl: "", connected: true, score: 1 },
        ],
      },
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "room:update" }),
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("reveals on a matching question timeout only", async () => {
    rooms.getRoom.mockResolvedValue(room);
    rooms.reveal.mockResolvedValue(revealPayload);

    await service.handleQuestionTimeout("ROOM01", 1);
    expect(rooms.reveal).not.toHaveBeenCalled();

    rooms.getRoom.mockResolvedValue({ ...room, revealed: true });
    await service.handleQuestionTimeout("ROOM01", 0);
    expect(rooms.reveal).not.toHaveBeenCalled();

    rooms.getRoom.mockResolvedValue(room);
    await service.handleQuestionTimeout("ROOM01", 0);
    expect(rooms.reveal).toHaveBeenCalledWith("ROOM01", 0);
  });

  it("advances on a matching advance job only", async () => {
    rooms.getRoom.mockResolvedValue({ ...room, revealed: true });
    rooms.advance.mockResolvedValue({ finished: false, index: 1 });
    rooms.getQuestions.mockResolvedValue(questions);

    await service.handleAdvance("ROOM01", 1);
    expect(rooms.advance).not.toHaveBeenCalled();

    await service.handleAdvance("ROOM01", 0);
    expect(rooms.advance).toHaveBeenCalledWith("ROOM01", 0);
  });

  it("removes the player from a lobby and broadcasts", async () => {
    rooms.getRoom.mockResolvedValue({ ...room, status: "lobby" });
    rooms.leaveRoom.mockResolvedValue([players[1]]);

    await service.leaveRoom("ROOM01", "p1", "s1");

    expect(rooms.leaveRoom).toHaveBeenCalledWith("ROOM01", "p1", "s1");
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "room:update" }),
    );
  });

  it("marks the player offline mid-game and reveals if everyone else answered", async () => {
    rooms.getRoom.mockResolvedValue(room);
    rooms.isCurrentQuestionAnswered.mockResolvedValue(true);
    rooms.reveal.mockResolvedValue(revealPayload);

    await service.leaveRoom("ROOM01", "p2", "s2");

    expect(rooms.markDisconnected).toHaveBeenCalledWith("ROOM01", "p2", "s2");
    expect(rooms.reveal).toHaveBeenCalledWith("ROOM01", 0);
  });

  it("broadcasts chat messages", async () => {
    const message = {
      playerId: "p1",
      name: "One",
      avatarUrl: "",
      text: "Hi",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    rooms.addChat.mockResolvedValue(message);

    await expect(service.sendChat("ROOM01", "p1", "Hi")).resolves.toEqual(message);
    expect(publish).toHaveBeenCalledWith({
      event: "chat:message",
      code: "ROOM01",
      payload: message,
    });
  });
});
