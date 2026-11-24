import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Thin wrapper around ioredis used for caching and (from the multiplayer
 * portion) room state and the Socket.IO adapter.
 *
 * Redis is treated as best-effort: if it is unreachable the API keeps
 * serving requests from PostgreSQL instead of failing.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.logger.warn("REDIS_URL is not set; caching is disabled");
      return;
    }

    const client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
    });

    client.on("ready", () => {
      this.available = true;
      this.logger.log("Connected to Redis");
    });
    client.on("error", (error: Error) => {
      if (this.available) {
        this.logger.warn(`Redis error: ${error.message}`);
      }
      this.available = false;
    });
    client.on("end", () => {
      this.available = false;
    });

    client.connect().catch((error: Error) => {
      this.logger.warn(`Redis is unavailable, caching is disabled: ${error.message}`);
    });

    this.client = client;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  /** The raw client, for consumers that need pub/sub or the Socket.IO adapter. */
  getClient(): Redis | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.available && this.client !== null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.run((client) =>
      client.set(key, JSON.stringify(value), "EX", Math.max(1, ttlSeconds)),
    );
  }

  async get(key: string): Promise<string | null> {
    return this.run((client) => client.get(key));
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.run((client) => client.del(...keys));
  }

  async incr(key: string): Promise<number | null> {
    return this.run((client) => client.incr(key));
  }

  private readyClient(): Redis | null {
    return this.available ? this.client : null;
  }

  private async run<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
    const client = this.readyClient();
    if (!client) return null;
    try {
      return await operation(client);
    } catch (error) {
      this.logFailure("command", error);
      return null;
    }
  }

  private logFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis ${operation} failed: ${message}`);
  }
}
