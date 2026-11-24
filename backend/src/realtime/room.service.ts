import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type {
  AnswerResult,
  ChatMessage,
  JoinSnapshot,
  PlayerInfo,
  PublicQuestion,
  RevealPayload,
  RoomPlayer,
  RoomRecord,
  RoomState,
  RoomStatus,
  StoredQuestion,
} from "./room.types";

export const MAX_PLAYERS = 4;
export const ROOM_TTL_SECONDS = 60 * 60 * 2;
export const CHAT_LIMIT = 100;
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const ROOM_STORE_UNAVAILABLE = "Хранилище комнат недоступно";

/**
 * The subset of Redis commands room state uses. Keeping the interface narrow
 * lets tests plug an in-memory store in place of ioredis.
 */
export interface RoomStoreClient {
  hgetall(key: string): Promise<Record<string, string>>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, data: Record<string, string>): Promise<number>;
  hset(key: string, field: string, value: string): Promise<number>;
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hlen(key: string): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  rpush(key: string, value: string): Promise<number>;
  lrem(key: string, count: number, value: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex: "EX", ttl: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

interface StoredPlayerInfo extends PlayerInfo {
  connected: boolean;
  socketId?: string;
}

const roomKey = (code: string) => `room:${code}`;
const playersKey = (code: string) => `room:${code}:players`;
const orderKey = (code: string) => `room:${code}:order`;
const scoresKey = (code: string) => `room:${code}:scores`;
const questionsKey = (code: string) => `room:${code}:questions`;
const answersKey = (code: string, index: number) => `room:${code}:answers:${index}`;
const chatKey = (code: string) => `room:${code}:chat`;
const revealKey = (code: string, index: number) => `room:${code}:reveal:${index}`;

const QUESTIONS_INCLUDE = {
  questions: { orderBy: { position: "asc" as const } },
};

@Injectable()
export class RoomService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async getRoom(code: string): Promise<RoomRecord | null> {
    const raw = await this.client().hgetall(roomKey(code));
    if (!raw.quizId) return null;

    return {
      code,
      quizId: raw.quizId,
      hostId: raw.hostId ?? "",
      status: (raw.status as RoomStatus) || "lobby",
      currentQuestionIndex: Number(raw.currentQuestionIndex ?? 0),
      total: Number(raw.total ?? 0),
      maxPlayers: Number(raw.maxPlayers ?? MAX_PLAYERS),
      revealed: raw.revealed === "1",
    };
  }

  async getPlayers(code: string): Promise<RoomPlayer[]> {
    const client = this.client();
    const [order, players, scores] = await Promise.all([
      client.lrange(orderKey(code), 0, -1),
      client.hgetall(playersKey(code)),
      client.hgetall(scoresKey(code)),
    ]);

    const seen = new Set<string>();
    const result: RoomPlayer[] = [];

    for (const id of order) {
      if (seen.has(id) || players[id] === undefined) continue;
      seen.add(id);

      const info = parsePlayerInfo(players[id]);
      result.push({
        id,
        name: info.name || "Игрок",
        avatarUrl: info.avatarUrl || "",
        connected: info.connected !== false,
        score: Number(scores[id] ?? 0),
      });
    }

    return result;
  }

  async getQuestions(code: string): Promise<StoredQuestion[] | null> {
    const raw = await this.client().get(questionsKey(code));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredQuestion[];
    } catch {
      return null;
    }
  }

  async getChat(code: string): Promise<ChatMessage[]> {
    const messages = await this.client().lrange(chatKey(code), 0, -1);
    return messages.flatMap((message) => {
      try {
        return [JSON.parse(message) as ChatMessage];
      } catch {
        return [];
      }
    });
  }

  async getRoomState(code: string): Promise<RoomState | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    const [players, chat] = await Promise.all([
      this.getPlayers(code),
      this.getChat(code),
    ]);

    return { code, room, players, chat };
  }

  /**
   * Everything a (re)joining socket needs to render the room. Restores the
   * current question, the player's own answer and an active reveal.
   */
  async getJoinSnapshot(code: string, playerId: string): Promise<JoinSnapshot | null> {
    const state = await this.getRoomState(code);
    if (!state) return null;

    const snapshot: JoinSnapshot = { ...state };

    if (state.room.status === "playing" || state.room.status === "finished") {
      const questions = await this.getQuestions(code);
      const index = state.room.currentQuestionIndex;
      const question = questions?.[index];

      if (question) {
        snapshot.question = toPublicQuestion(question);
        const answer = await this.client().hget(answersKey(code, index), playerId);
        if (answer !== null) snapshot.myAnswer = Number(answer);

        snapshot.reveal = state.room.revealed
          ? await this.getReveal(code, index)
          : null;
      }

      if (state.room.status === "finished") {
        snapshot.result = sortedByScore(state.players);
      }
    }

    return snapshot;
  }

  async getReveal(code: string, index: number): Promise<RevealPayload | null> {
    const raw = await this.client().get(revealKey(code, index));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RevealPayload;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Room lifecycle
  // ---------------------------------------------------------------------------

  async createRoom(
    quizId: string,
    hostId: string,
    info: PlayerInfo,
    socketId?: string,
  ): Promise<{ code: string }> {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new Error("Квиз не найден");

    const client = this.client();
    let code: string | null = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = generateCode();
      const created = await client.hsetnx(roomKey(candidate), "quizId", quizId);
      if (created === 1) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Не удалось создать комнату");

    await client.hset(roomKey(code), {
      hostId,
      status: "lobby",
      currentQuestionIndex: "0",
      total: "0",
      maxPlayers: String(MAX_PLAYERS),
      revealed: "0",
    });
    await client.expire(roomKey(code), ROOM_TTL_SECONDS);

    await this.addPlayer(code, hostId, info, socketId);
    await this.expireSecondaryKeys(code);

    return { code };
  }

  async joinRoom(
    code: string,
    playerId: string,
    info: PlayerInfo,
    socketId?: string,
  ): Promise<{ code: string; rejoined: boolean }> {
    const room = await this.getRoom(code);
    if (!room) throw new Error("Комната не найдена");

    const players = await this.getPlayers(code);
    const existing = players.find((player) => player.id === playerId);

    // A player who reloaded the tab or lost the connection during a game must
    // be able to take their seat back instead of being rejected.
    if (existing) {
      await this.addPlayer(code, playerId, info, socketId);
      await this.expireSecondaryKeys(code);
      return { code, rejoined: true };
    }

    if (room.status !== "lobby") throw new Error("Игра уже началась");
    if (players.length >= room.maxPlayers) throw new Error("Комната заполнена");

    await this.addPlayer(code, playerId, info, socketId);
    await this.expireSecondaryKeys(code);
    return { code, rejoined: false };
  }

  /**
   * Removes the player from a lobby or marks them disconnected mid-game.
   * `socketId` guards against a stale socket (from before a reconnect)
   * touching the player's fresh presence.
   */
  async leaveRoom(
    code: string,
    playerId: string,
    socketId?: string,
  ): Promise<RoomPlayer[] | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    if (socketId && !(await this.ownsSocket(code, playerId, socketId))) {
      return this.getPlayers(code);
    }

    await this.removePlayer(code, playerId);

    const remaining = await this.getPlayers(code);
    if (remaining.length === 0) {
      await this.deleteRoom(code);
      return null;
    }

    if (room.hostId === playerId) {
      await this.client().hset(roomKey(code), "hostId", remaining[0].id);
    }

    return remaining;
  }

  async markDisconnected(
    code: string,
    playerId: string,
    socketId?: string,
  ): Promise<void> {
    if (socketId && !(await this.ownsSocket(code, playerId, socketId))) return;

    const raw = await this.client().hget(playersKey(code), playerId);
    if (!raw) return;

    const info = parsePlayerInfo(raw);
    info.connected = false;
    delete info.socketId;
    await this.client().hset(playersKey(code), playerId, JSON.stringify(info));
  }

  async deleteRoom(code: string): Promise<void> {
    const room = await this.getRoom(code);
    const keys = [
      roomKey(code),
      playersKey(code),
      orderKey(code),
      scoresKey(code),
      questionsKey(code),
      chatKey(code),
    ];
    if (room && room.total > 0) {
      for (let index = 0; index < room.total; index += 1) {
        keys.push(answersKey(code, index), revealKey(code, index));
      }
    }
    await this.client().del(...keys);
  }

  // ---------------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------------

  async startGame(code: string, hostId: string): Promise<{ questions: StoredQuestion[] }> {
    const room = await this.getRoom(code);
    if (!room) throw new Error("Комната не найдена");
    if (room.hostId !== hostId) throw new Error("Только хост может начать игру");
    if (room.status !== "lobby") throw new Error("Игра уже началась");

    const players = await this.getPlayers(code);
    if (players.length < 2) throw new Error("Нужно минимум 2 игрока");

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: room.quizId },
      include: QUESTIONS_INCLUDE,
    });
    if (!quiz) throw new Error("Квиз не найден");

    const questions: StoredQuestion[] = quiz.questions.map((question) => ({
      questionText: question.questionText,
      questionType: question.questionType,
      ...(question.mediaUrl ? { mediaUrl: question.mediaUrl } : {}),
      options: question.options,
      correctAnswerIndex: question.correctAnswerIndex,
      ...(question.explanation ? { explanation: question.explanation } : {}),
    }));
    if (questions.length === 0) throw new Error("В квизе нет вопросов");

    const client = this.client();
    await client.set(
      questionsKey(code),
      JSON.stringify(questions),
      "EX",
      ROOM_TTL_SECONDS,
    );
    await client.hset(roomKey(code), {
      status: "playing",
      currentQuestionIndex: "0",
      total: String(questions.length),
      revealed: "0",
    });

    return { questions };
  }

  async answerQuestion(
    code: string,
    playerId: string,
    questionIndex: number,
    answerIndex: number,
  ): Promise<AnswerResult> {
    const room = await this.getRoom(code);
    if (!room) throw new Error("Комната не найдена");
    if (room.status !== "playing") return { allAnswered: false };
    if (questionIndex !== room.currentQuestionIndex) return { allAnswered: false };

    const client = this.client();
    const key = answersKey(code, questionIndex);
    await client.hsetnx(key, playerId, String(answerIndex));
    await client.expire(key, ROOM_TTL_SECONDS);

    const activePlayers = (await this.getPlayers(code)).filter(
      (player) => player.connected,
    );
    const answered = await client.hlen(key);

    return {
      allAnswered: activePlayers.length > 0 && answered >= activePlayers.length,
      answered,
      total: activePlayers.length,
    };
  }

  async isCurrentQuestionAnswered(code: string): Promise<boolean> {
    const room = await this.getRoom(code);
    if (!room || room.status !== "playing") return false;

    const activePlayers = (await this.getPlayers(code)).filter(
      (player) => player.connected,
    );
    const answered = await this.client().hlen(
      answersKey(code, room.currentQuestionIndex),
    );
    return activePlayers.length > 0 && answered >= activePlayers.length;
  }

  /**
   * Scores the current question. The per-question HSETNX lock makes the
   * operation idempotent when the timeout job and the "everybody answered"
   * path race each other (Vercel Queues deliver at least once).
   */
  async reveal(code: string, expectedIndex?: number): Promise<RevealPayload | null> {
    const room = await this.getRoom(code);
    if (!room || room.status !== "playing" || room.revealed) return null;
    if (expectedIndex !== undefined && expectedIndex !== room.currentQuestionIndex) {
      return null;
    }

    const questions = await this.getQuestions(code);
    const index = room.currentQuestionIndex;
    const question = questions?.[index];
    if (!questions || !question) return null;

    const client = this.client();
    const claimed = await client.hsetnx(roomKey(code), `revealLock:${index}`, "1");
    if (claimed === 0) return null;

    const correctIndex = question.correctAnswerIndex;
    const [players, answers] = await Promise.all([
      this.getPlayers(code),
      client.hgetall(answersKey(code, index)),
    ]);

    const results = players.map((player) => {
      const raw = answers[player.id];
      return {
        id: player.id,
        correct: raw !== undefined && Number(raw) === correctIndex,
      };
    });

    for (const result of results) {
      if (result.correct) {
        await client.hincrby(scoresKey(code), result.id, 1);
      }
    }

    await client.hset(roomKey(code), "revealed", "1");

    const updatedPlayers = await this.getPlayers(code);
    const payload: RevealPayload = {
      questionIndex: index,
      correctIndex,
      results,
      players: updatedPlayers,
      isLast: index >= questions.length - 1,
    };
    if (question.explanation) payload.explanation = question.explanation;

    await client.set(
      revealKey(code, index),
      JSON.stringify(payload),
      "EX",
      ROOM_TTL_SECONDS,
    );

    return payload;
  }

  async advance(
    code: string,
    expectedIndex?: number,
  ): Promise<{ finished: boolean; index?: number } | null> {
    const room = await this.getRoom(code);
    if (!room || room.status !== "playing" || !room.revealed) return null;
    if (expectedIndex !== undefined && expectedIndex !== room.currentQuestionIndex) {
      return null;
    }

    const client = this.client();
    const claimed = await client.hsetnx(
      roomKey(code),
      `advanceLock:${room.currentQuestionIndex}`,
      "1",
    );
    if (claimed === 0) return null;

    const next = room.currentQuestionIndex + 1;
    if (next >= room.total) {
      await client.hset(roomKey(code), "status", "finished");
      return { finished: true };
    }

    await client.hset(roomKey(code), {
      currentQuestionIndex: String(next),
      revealed: "0",
    });
    await client.del(answersKey(code, room.currentQuestionIndex));

    return { finished: false, index: next };
  }

  async addChat(code: string, playerId: string, text: string): Promise<ChatMessage> {
    const client = this.client();
    const raw = await client.hget(playersKey(code), playerId);
    const info = raw ? parsePlayerInfo(raw) : null;

    const message: ChatMessage = {
      playerId,
      name: info?.name || "Игрок",
      avatarUrl: info?.avatarUrl || "",
      text,
      createdAt: new Date().toISOString(),
    };

    await client.rpush(chatKey(code), JSON.stringify(message));
    await client.ltrim(chatKey(code), -CHAT_LIMIT, -1);

    return message;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private client(): RoomStoreClient {
    const client = this.redis.getClient();
    if (!client || !this.redis.isAvailable()) {
      throw new Error(ROOM_STORE_UNAVAILABLE);
    }
    return client as unknown as RoomStoreClient;
  }

  private async ownsSocket(
    code: string,
    playerId: string,
    socketId: string,
  ): Promise<boolean> {
    const raw = await this.client().hget(playersKey(code), playerId);
    if (!raw) return false;
    return parsePlayerInfo(raw).socketId === socketId;
  }

  private async addPlayer(
    code: string,
    playerId: string,
    info: PlayerInfo,
    socketId?: string,
  ): Promise<void> {
    const client = this.client();
    const existing = await client.hget(playersKey(code), playerId);
    const stored: StoredPlayerInfo = {
      name: info.name || "Игрок",
      avatarUrl: info.avatarUrl || "",
      connected: true,
      ...(socketId ? { socketId } : {}),
    };

    await client.hset(playersKey(code), playerId, JSON.stringify(stored));

    if (!existing) {
      await client.rpush(orderKey(code), playerId);
      await client.hsetnx(scoresKey(code), playerId, "0");
    }
  }

  private async removePlayer(code: string, playerId: string): Promise<void> {
    const client = this.client();
    await client.hdel(playersKey(code), playerId);
    await client.hdel(scoresKey(code), playerId);
    await client.lrem(orderKey(code), 0, playerId);
  }

  private async expireSecondaryKeys(code: string): Promise<void> {
    const client = this.client();
    await Promise.all(
      [playersKey(code), orderKey(code), scoresKey(code), chatKey(code)].map((key) =>
        client.expire(key, ROOM_TTL_SECONDS),
      ),
    );
  }
}

export function generateCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function toPublicQuestion(question: StoredQuestion): PublicQuestion {
  return {
    questionText: question.questionText,
    questionType: question.questionType,
    ...(question.mediaUrl ? { mediaUrl: question.mediaUrl } : {}),
    options: question.options,
  };
}

function sortedByScore(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((a, b) => b.score - a.score);
}

function parsePlayerInfo(raw: string): StoredPlayerInfo {
  try {
    return JSON.parse(raw) as StoredPlayerInfo;
  } catch {
    return { name: "Игрок", avatarUrl: "", connected: true };
  }
}
