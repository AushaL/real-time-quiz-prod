import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "../queue/queue.service";
import { RealtimeBusService, type RealtimeEventName } from "./realtime-bus.service";
import { RoomService, toPublicQuestion } from "./room.service";
import type {
  AnswerResult,
  ChatMessage,
  JoinSnapshot,
  PlayerInfo,
  RevealPayload,
  RoomState,
  StoredQuestion,
} from "./room.types";

export const DEFAULT_QUESTION_TIMEOUT_MS = 60_000;
export const DEFAULT_REVEAL_DELAY_MS = 4_000;

/**
 * Drives the game state machine. All broadcasts go through RealtimeBusService
 * so the same transitions can be executed by a Socket.IO handler or by a
 * Vercel Queues consumer.
 */
@Injectable()
export class GameCoordinatorService {
  private readonly questionTimeoutMs: number;
  private readonly revealDelayMs: number;

  constructor(
    private readonly rooms: RoomService,
    private readonly bus: RealtimeBusService,
    private readonly queue: QueueService,
    config: ConfigService,
  ) {
    this.questionTimeoutMs =
      config.get<number>("QUESTION_TIMEOUT_MS") ?? DEFAULT_QUESTION_TIMEOUT_MS;
    this.revealDelayMs =
      config.get<number>("REVEAL_DELAY_MS") ?? DEFAULT_REVEAL_DELAY_MS;
  }

  async createRoom(
    quizId: string,
    userId: string,
    info: PlayerInfo,
    socketId?: string,
  ): Promise<string> {
    const { code } = await this.rooms.createRoom(quizId, userId, info, socketId);
    await this.publishRoomState(code);
    return code;
  }

  async joinRoom(
    code: string,
    userId: string,
    info: PlayerInfo,
    socketId?: string,
  ): Promise<JoinSnapshot> {
    await this.rooms.joinRoom(code, userId, info, socketId);

    const snapshot = await this.rooms.getJoinSnapshot(code, userId);
    if (!snapshot) throw new Error("Комната не найдена");

    await this.publishRoomState(code);
    return snapshot;
  }

  /**
   * Removes a player from the lobby or marks them offline mid-game. If the
   * remaining connected players have all answered, the question is revealed
   * right away instead of waiting for the timeout job.
   */
  async leaveRoom(code: string, userId: string, socketId?: string): Promise<void> {
    const room = await this.rooms.getRoom(code);
    if (!room) return;

    if (room.status === "lobby") {
      const remaining = await this.rooms.leaveRoom(code, userId, socketId);
      if (remaining === null) return;
      await this.publishRoomState(code);
      return;
    }

    await this.rooms.markDisconnected(code, userId, socketId);
    await this.publishRoomState(code);

    if (await this.rooms.isCurrentQuestionAnswered(code)) {
      await this.reveal(code, room.currentQuestionIndex);
    }
  }

  async startGame(code: string, userId: string): Promise<void> {
    const { questions } = await this.rooms.startGame(code, userId);

    await this.emitQuestion(code, 0, questions);
    await this.publishRoomState(code);
    await this.scheduleQuestionTimeout(code, 0);
  }

  async submitAnswer(
    code: string,
    userId: string,
    questionIndex: number,
    answerIndex: number,
  ): Promise<AnswerResult> {
    const result = await this.rooms.answerQuestion(
      code,
      userId,
      questionIndex,
      answerIndex,
    );

    if (result.allAnswered) {
      await this.reveal(code, questionIndex);
    }

    return result;
  }

  async reveal(
    code: string,
    expectedIndex?: number,
  ): Promise<RevealPayload | null> {
    const payload = await this.rooms.reveal(code, expectedIndex);
    if (!payload) return null;

    await this.publish("game:reveal", code, payload);
    await this.queue.enqueue(
      { type: "advance", code, questionIndex: payload.questionIndex },
      this.revealDelayMs,
    );

    return payload;
  }

  async advance(
    code: string,
    expectedIndex?: number,
  ): Promise<{ finished: boolean; index?: number } | null> {
    const result = await this.rooms.advance(code, expectedIndex);
    if (!result) return null;

    if (result.finished) {
      const state = await this.rooms.getRoomState(code);
      const players = state?.players ?? [];
      const sorted = [...players].sort((a, b) => b.score - a.score);
      await this.publish("game:result", code, { players: sorted });
      await this.publishRoomState(code);
      return result;
    }

    const questions = await this.rooms.getQuestions(code);
    if (questions && result.index !== undefined) {
      await this.emitQuestion(code, result.index, questions);
      await this.scheduleQuestionTimeout(code, result.index);
    }

    return result;
  }

  /** Called by the durable question timeout job. */
  async handleQuestionTimeout(code: string, questionIndex: number): Promise<void> {
    const room = await this.rooms.getRoom(code);
    if (
      !room ||
      room.status !== "playing" ||
      room.revealed ||
      room.currentQuestionIndex !== questionIndex
    ) {
      return;
    }
    await this.reveal(code, questionIndex);
  }

  /** Called by the durable job scheduled after a reveal. */
  async handleAdvance(code: string, questionIndex: number): Promise<void> {
    const room = await this.rooms.getRoom(code);
    if (
      !room ||
      room.status !== "playing" ||
      !room.revealed ||
      room.currentQuestionIndex !== questionIndex
    ) {
      return;
    }
    await this.advance(code, questionIndex);
  }

  async sendChat(code: string, userId: string, text: string): Promise<ChatMessage> {
    const message = await this.rooms.addChat(code, userId, text);
    await this.publish("chat:message", code, message);
    return message;
  }

  async getRoomState(code: string): Promise<RoomState | null> {
    return this.rooms.getRoomState(code);
  }

  private async emitQuestion(
    code: string,
    index: number,
    questions: StoredQuestion[],
  ): Promise<void> {
    const question = questions[index];
    if (!question) return;

    await this.publish("game:question", code, {
      index,
      question: toPublicQuestion(question),
      total: questions.length,
    });
  }

  private async scheduleQuestionTimeout(
    code: string,
    questionIndex: number,
  ): Promise<void> {
    await this.queue.enqueue(
      { type: "question-timeout", code, questionIndex },
      this.questionTimeoutMs,
    );
  }

  private async publishRoomState(code: string): Promise<RoomState | null> {
    const state = await this.rooms.getRoomState(code);
    if (!state) return null;

    await this.publish("room:update", code, {
      code,
      room: state.room,
      players: state.players,
    });
    return state;
  }

  private publish(
    event: RealtimeEventName,
    code: string,
    payload: unknown,
  ): Promise<void> {
    return this.bus.publish({ event, code, payload });
  }
}
