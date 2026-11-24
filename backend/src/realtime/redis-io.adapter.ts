import { Logger, type INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server, ServerOptions } from "socket.io";

/**
 * Socket.IO adapter with WebSocket-only transport (the only transport Vercel
 * supports) and a Redis adapter so every function instance can broadcast to
 * all sockets in a room.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly adapterLogger = new Logger(RedisIoAdapter.name);
  private readonly clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const origins = (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    const server = super.createIOServer(port, {
      ...options,
      path: this.config.get<string>("SOCKET_PATH") ?? "/socket.io",
      transports: ["websocket"],
      cors: { origin: origins, credentials: true },
      // Vercel caps a connection at 300s (Hobby) / 800s (Pro); ping sooner
      // than the platform cap so dead connections are noticed quickly.
      pingInterval: 25_000,
      pingTimeout: 20_000,
    } as ServerOptions);

    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.adapterLogger.warn("REDIS_URL is not set; Socket.IO runs without the Redis adapter");
      return server;
    }

    const redisOptions = {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    };
    const pubClient = new Redis(url, redisOptions);
    const subClient = pubClient.duplicate();

    pubClient.on("error", (error: Error) =>
      this.adapterLogger.warn(`Socket.IO Redis pub error: ${error.message}`),
    );
    subClient.on("error", (error: Error) =>
      this.adapterLogger.warn(`Socket.IO Redis sub error: ${error.message}`),
    );

    server.adapter(createAdapter(pubClient, subClient));
    this.clients.push(pubClient, subClient);

    return server;
  }

  async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all(
      this.clients.splice(0).map(async (client) => {
        try {
          await client.quit();
        } catch {
          client.disconnect();
        }
      }),
    );
  }
}
