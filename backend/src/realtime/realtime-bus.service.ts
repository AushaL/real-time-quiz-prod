import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "node:events";
import Redis from "ioredis";

export const REALTIME_EVENTS_CHANNEL = "quiz:realtime:events";
const LOCAL_EVENT = "realtime-event";

export type RealtimeEventName =
  | "room:update"
  | "game:question"
  | "game:reveal"
  | "game:result"
  | "chat:message";

export interface RealtimeEvent {
  event: RealtimeEventName;
  /** Room code; the gateway emits into this Socket.IO room. */
  code: string;
  payload: unknown;
}

export type RealtimeEventListener = (event: RealtimeEvent) => void;

/**
 * Redis pub/sub bridge between the process that owns the Socket.IO server and
 * processes that do not — most importantly Vercel Queues consumers running the
 * question/reveal timers in a separate function instance.
 *
 * Without Redis (local development, tests) events stay in-process, which is
 * enough for a single-node setup.
 */
@Injectable()
export class RealtimeBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBusService.name);
  private readonly emitter = new EventEmitter();
  private readonly url: string | undefined;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(config: ConfigService) {
    this.url = config.get<string>("REDIS_URL");
    this.emitter.setMaxListeners(50);
  }

  onModuleInit(): void {
    if (!this.url) {
      this.logger.warn("REDIS_URL is not set; realtime events stay in-process");
      return;
    }

    try {
      const options = {
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => Math.min(times * 200, 5000),
      };

      this.publisher = new Redis(this.url, options);
      this.subscriber = new Redis(this.url, options);

      this.publisher.on("error", (error: Error) =>
        this.logger.warn(`Realtime publisher error: ${error.message}`),
      );
      this.subscriber.on("error", (error: Error) =>
        this.logger.warn(`Realtime subscriber error: ${error.message}`),
      );
      this.subscriber.on("message", (channel: string, message: string) => {
        if (channel !== REALTIME_EVENTS_CHANNEL) return;
        const event = parseEvent(message);
        if (event) this.emitter.emit(LOCAL_EVENT, event);
      });

      void this.subscriber
        .subscribe(REALTIME_EVENTS_CHANNEL)
        .catch((error: Error) =>
          this.logger.warn(`Realtime subscription failed: ${error.message}`),
        );
    } catch (error) {
      this.logger.warn(
        `Realtime Redis bridge is unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.closeClient(this.publisher),
      this.closeClient(this.subscriber),
    ]);
    this.publisher = null;
    this.subscriber = null;
  }

  async publish(event: RealtimeEvent): Promise<void> {
    const payload = JSON.stringify(event);

    if (this.publisher?.status === "ready") {
      try {
        await this.publisher.publish(REALTIME_EVENTS_CHANNEL, payload);
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to publish realtime event ${event.event}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.emitter.emit(LOCAL_EVENT, event);
  }

  subscribe(listener: RealtimeEventListener): () => void {
    this.emitter.on(LOCAL_EVENT, listener);
    return () => this.emitter.off(LOCAL_EVENT, listener);
  }

  private async closeClient(client: Redis | null): Promise<void> {
    if (!client) return;
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}

function parseEvent(message: string): RealtimeEvent | null {
  try {
    const event = JSON.parse(message) as Partial<RealtimeEvent>;
    if (!event?.event || !event.code) return null;
    return event as RealtimeEvent;
  } catch {
    return null;
  }
}
