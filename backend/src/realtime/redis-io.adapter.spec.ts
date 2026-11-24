import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ConfigService } from "@nestjs/config";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server } from "socket.io";
import { RedisIoAdapter } from "./redis-io.adapter";

jest.mock("@nestjs/platform-socket.io", () => {
  class MockIoAdapter {
    static createIOServer = jest.fn();
    static close = jest.fn().mockResolvedValue(undefined);

    constructor(readonly app: unknown) {}

    createIOServer(...args: unknown[]): unknown {
      return MockIoAdapter.createIOServer(...args);
    }

    close(server: unknown): Promise<void> {
      return MockIoAdapter.close(server);
    }
  }

  return { IoAdapter: MockIoAdapter };
});

jest.mock("@socket.io/redis-adapter", () => ({
  createAdapter: jest.fn(() => "redis-adapter"),
}));

jest.mock("ioredis", () => {
  class MockRedis {
    static instances: MockRedis[] = [];

    handlers = new Map<string, (...args: unknown[]) => void>();
    quit = jest.fn().mockResolvedValue("OK");
    disconnect = jest.fn();

    constructor(
      readonly url: string,
      readonly options: Record<string, unknown>,
    ) {
      MockRedis.instances.push(this);
    }

    duplicate(): MockRedis {
      return new MockRedis(this.url, this.options);
    }

    on(event: string, handler: (...args: unknown[]) => void): this {
      this.handlers.set(event, handler);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      this.handlers.get(event)?.(...args);
    }
  }

  return { __esModule: true, default: MockRedis };
});

interface MockClient {
  url: string;
  options: Record<string, unknown>;
  quit: jest.Mock;
  disconnect: jest.Mock;
  emit: (event: string, ...args: unknown[]) => void;
}

const IoAdapterBase = IoAdapter as unknown as {
  createIOServer: jest.Mock;
  close: jest.Mock;
};
const createAdapterMock = createAdapter as jest.Mock;
const RedisConstructor = Redis as unknown as { instances: MockClient[] };

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function fakeServer(): Server {
  return { adapter: jest.fn() } as unknown as Server;
}

describe("RedisIoAdapter", () => {
  beforeEach(() => {
    RedisConstructor.instances.length = 0;
    createAdapterMock.mockClear();
  });

  it("applies the Vercel-compatible socket options", () => {
    const server = fakeServer();
    IoAdapterBase.createIOServer.mockReturnValue(server);

    const adapter = new RedisIoAdapter(
      {} as never,
      config({
        FRONTEND_URL: "https://one.test, https://two.test",
        SOCKET_PATH: "/socket",
      }),
    );

    const result = adapter.createIOServer(0, { serveClient: false });

    expect(result).toBe(server);
    expect(IoAdapterBase.createIOServer).toHaveBeenCalledWith(0, {
      serveClient: false,
      path: "/socket",
      transports: ["websocket"],
      cors: {
        origin: ["https://one.test", "https://two.test"],
        credentials: true,
      },
      pingInterval: 25_000,
      pingTimeout: 20_000,
    });
    expect(RedisConstructor.instances).toHaveLength(0);
  });

  it("falls back to localhost CORS and the default path", () => {
    IoAdapterBase.createIOServer.mockReturnValue(fakeServer());

    const adapter = new RedisIoAdapter({} as never, config({}));
    adapter.createIOServer(0);

    expect(IoAdapterBase.createIOServer).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        path: "/socket.io",
        cors: { origin: ["http://localhost:3000"], credentials: true },
      }),
    );
  });

  it("installs the Redis adapter when REDIS_URL is set", () => {
    const server = fakeServer();
    IoAdapterBase.createIOServer.mockReturnValue(server);

    const adapter = new RedisIoAdapter(
      {} as never,
      config({ REDIS_URL: "redis://localhost:6379" }),
    );
    adapter.createIOServer(0);

    expect(RedisConstructor.instances).toHaveLength(2);
    expect(RedisConstructor.instances[0].options).toMatchObject({
      maxRetriesPerRequest: null,
    });
    const retryStrategy = RedisConstructor.instances[0].options
      .retryStrategy as (times: number) => number;
    expect(retryStrategy(2)).toBe(400);
    expect(retryStrategy(100)).toBe(5_000);
    expect(createAdapterMock).toHaveBeenCalledWith(
      RedisConstructor.instances[0],
      RedisConstructor.instances[1],
    );
    expect(server.adapter).toHaveBeenCalledWith("redis-adapter");
  });

  it("logs Redis client errors without crashing", () => {
    IoAdapterBase.createIOServer.mockReturnValue(fakeServer());

    const adapter = new RedisIoAdapter(
      {} as never,
      config({ REDIS_URL: "redis://localhost:6379" }),
    );
    adapter.createIOServer(0);

    expect(() => {
      RedisConstructor.instances[0].emit("error", new Error("pub down"));
      RedisConstructor.instances[1].emit("error", new Error("sub down"));
    }).not.toThrow();
  });

  it("quits both clients on close and disconnects on failure", async () => {
    const server = fakeServer();
    IoAdapterBase.createIOServer.mockReturnValue(server);

    const adapter = new RedisIoAdapter(
      {} as never,
      config({ REDIS_URL: "redis://localhost:6379" }),
    );
    adapter.createIOServer(0);
    const [publisher, subscriber] = RedisConstructor.instances;
    subscriber.quit.mockRejectedValue(new Error("already closed"));

    await adapter.close(server);

    expect(IoAdapterBase.close).toHaveBeenCalledWith(server);
    expect(publisher.quit).toHaveBeenCalled();
    expect(subscriber.disconnect).toHaveBeenCalled();
  });
});
