import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ClerkService } from "../auth/clerk.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameCoordinatorService } from "./game-coordinator.service";
import {
  RealtimeBusService,
  type RealtimeEvent,
} from "./realtime-bus.service";
import type { PlayerInfo } from "./room.types";

interface SocketData {
  userId: string;
  name?: string;
  avatarUrl?: string;
  resolved?: boolean;
  roomCode?: string | null;
}

type GameSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

interface Ack {
  ok: boolean;
  message?: string;
}

const MAX_CHAT_LENGTH = 500;

// CORS is configured on the Socket.IO server by RedisIoAdapter, which reuses
// the same FRONTEND_URL allowlist as the HTTP API.
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private unsubscribe: (() => void) | null = null;

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly clerk: ClerkService,
    private readonly prisma: PrismaService,
    private readonly coordinator: GameCoordinatorService,
    private readonly bus: RealtimeBusService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticate(socket as GameSocket)
        .then(() => next())
        .catch(() => next(new Error("unauthorized")));
    });

    this.unsubscribe = this.bus.subscribe((event) => {
      this.broadcast(event);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  handleDisconnect(socket: GameSocket): void {
    void this.leaveSocketRoom(socket).catch((error: unknown) => {
      this.logger.warn(`Failed to clean up socket ${socket.id}: ${messageOf(error)}`);
    });
  }

  @SubscribeMessage("room:create")
  async handleCreate(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() payload?: { quizId?: string },
  ): Promise<Ack & Record<string, unknown>> {
    const quizId = payload?.quizId;
    if (!quizId) return { ok: false, message: "quizId обязателен" };

    try {
      await this.leaveSocketRoom(socket);
      const info = await this.resolvePlayerInfo(socket);
      const code = await this.coordinator.createRoom(
        quizId,
        socket.data.userId,
        info,
        socket.id,
      );

      await socket.join(code);
      socket.data.roomCode = code;

      const snapshot = await this.coordinator.getRoomState(code);
      if (!snapshot) return { ok: false, message: "Комната не найдена" };
      return { ok: true, ...snapshot };
    } catch (error) {
      return { ok: false, message: messageOf(error) };
    }
  }

  @SubscribeMessage("room:join")
  async handleJoin(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() payload?: { code?: string },
  ): Promise<Ack & Record<string, unknown>> {
    const code = String(payload?.code ?? "").trim().toUpperCase();
    if (!code) return { ok: false, message: "Укажите код комнаты" };

    try {
      if (socket.data.roomCode && socket.data.roomCode !== code) {
        await this.leaveSocketRoom(socket);
      }

      const info = await this.resolvePlayerInfo(socket);
      const snapshot = await this.coordinator.joinRoom(
        code,
        socket.data.userId,
        info,
        socket.id,
      );

      await socket.join(code);
      socket.data.roomCode = code;

      return { ok: true, ...snapshot };
    } catch (error) {
      return { ok: false, message: messageOf(error) };
    }
  }

  @SubscribeMessage("game:start")
  async handleStart(@ConnectedSocket() socket: GameSocket): Promise<Ack> {
    const code = socket.data.roomCode;
    if (!code) return { ok: false, message: "Вы не в комнате" };

    try {
      await this.coordinator.startGame(code, socket.data.userId);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error) };
    }
  }

  @SubscribeMessage("game:answer")
  async handleAnswer(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() payload?: { questionIndex?: number; answerIndex?: number },
  ): Promise<Ack & Record<string, unknown>> {
    const code = socket.data.roomCode;
    if (!code) return { ok: false, message: "Вы не в комнате" };

    try {
      const result = await this.coordinator.submitAnswer(
        code,
        socket.data.userId,
        Number(payload?.questionIndex),
        Number(payload?.answerIndex),
      );
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, message: messageOf(error) };
    }
  }

  @SubscribeMessage("chat:send")
  async handleChat(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() payload?: { text?: string },
  ): Promise<void> {
    const code = socket.data.roomCode;
    if (!code) return;

    const text = String(payload?.text ?? "").trim().slice(0, MAX_CHAT_LENGTH);
    if (!text) return;

    try {
      await this.coordinator.sendChat(code, socket.data.userId, text);
    } catch (error) {
      this.logger.warn(`Chat message failed: ${messageOf(error)}`);
    }
  }

  @SubscribeMessage("room:leave")
  async handleLeave(@ConnectedSocket() socket: GameSocket): Promise<void> {
    await this.leaveSocketRoom(socket).catch((error: unknown) => {
      this.logger.warn(`Failed to leave room: ${messageOf(error)}`);
    });
  }

  private async authenticate(socket: GameSocket): Promise<void> {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      throw new Error("unauthorized");
    }

    socket.data.userId = await this.clerk.verifyToken(token);
    socket.data.roomCode = null;
  }

  /**
   * Prefers the player profile from PostgreSQL and falls back to the values
   * the client passed during the handshake (`name`, `avatarUrl`).
   */
  private async resolvePlayerInfo(socket: GameSocket): Promise<PlayerInfo> {
    if (socket.data.resolved) {
      return {
        name: socket.data.name || "Игрок",
        avatarUrl: socket.data.avatarUrl || "",
      };
    }

    const handshake = socket.handshake.auth ?? {};
    let name = typeof handshake.name === "string" ? handshake.name : "";
    let avatarUrl =
      typeof handshake.avatarUrl === "string" ? handshake.avatarUrl : "";

    try {
      const player = await this.prisma.player.findUnique({
        where: { clerkId: socket.data.userId },
      });
      if (player) {
        name = player.fullName || name;
        avatarUrl = player.imageUrl || avatarUrl;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve player ${socket.data.userId}: ${messageOf(error)}`,
      );
    }

    socket.data.name = name || "Игрок";
    socket.data.avatarUrl = avatarUrl;
    socket.data.resolved = true;

    return { name: socket.data.name, avatarUrl: socket.data.avatarUrl };
  }

  private async leaveSocketRoom(socket: GameSocket): Promise<void> {
    const code = socket.data.roomCode;
    if (!code) return;

    socket.data.roomCode = null;
    await socket.leave(code);
    await this.coordinator.leaveRoom(code, socket.data.userId, socket.id);
  }

  private broadcast(event: RealtimeEvent): void {
    if (!this.server) return;
    // The bus already delivers every event to every instance, so emission must
    // stay local. A plain `server.to()` would also republish through the
    // Socket.IO Redis adapter, and a room whose players are connected to
    // different instances would receive each event once per instance
    // (duplicate chat messages, N copies of every game update).
    this.server.local.to(event.code).emit(event.event, event.payload);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}
