import type { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RedisService } from "./redis.service";

jest.mock("ioredis", () => {
  class MockRedis {
    static instances: MockRedis[] = [];
    static nextConnectError: Error | null = null;

    status = "connecting";
    handlers = new Map<string, (...args: unknown[]) => void>();
    connect = jest.fn().mockResolvedValue(undefined);
    quit = jest.fn().mockResolvedValue("OK");
    disconnect = jest.fn();
    get = jest.fn().mockResolvedValue(null);
    set = jest.fn().mockResolvedValue("OK");
    del = jest.fn().mockResolvedValue(1);
    incr = jest.fn().mockResolvedValue(1);

    constructor(
      readonly url: string,
      readonly options: {
        lazyConnect?: boolean;
        enableOfflineQueue?: boolean;
        maxRetriesPerRequest?: number;
        retryStrategy?: (times: number) => number | null;
      },
    ) {
      MockRedis.instances.push(this);
      if (MockRedis.nextConnectError) {
        this.connect.mockRejectedValue(MockRedis.nextConnectError);
      }
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
  options: {
    lazyConnect?: boolean;
    enableOfflineQueue?: boolean;
    maxRetriesPerRequest?: number;
    retryStrategy?: (times: number) => number | null;
  };
  status: string;
  handlers: Map<string, (...args: unknown[]) => void>;
  connect: jest.Mock;
  quit: jest.Mock;
  disconnect: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  incr: jest.Mock;
  emit: (event: string, ...args: unknown[]) => void;
}

const RedisConstructor = Redis as unknown as {
  instances: MockClient[];
  nextConnectError: Error | null;
};

function config(url?: string): ConfigService {
  return {
    get: (key: string) => (key === "REDIS_URL" ? url : undefined),
  } as unknown as ConfigService;
}

const REDIS_URL = "redis://localhost:6379";

function connectedService(): { service: RedisService; client: MockClient } {
  const service = new RedisService(config(REDIS_URL));
  service.onModuleInit();
  const client = RedisConstructor.instances[0];
  client.emit("ready");
  return { service, client };
}

describe("RedisService", () => {
  beforeEach(() => {
    RedisConstructor.instances.length = 0;
    RedisConstructor.nextConnectError = null;
  });

  it("disables caching when REDIS_URL is not configured", async () => {
    const service = new RedisService(config());

    service.onModuleInit();

    expect(RedisConstructor.instances).toHaveLength(0);
    expect(service.getClient()).toBeNull();
    expect(service.isAvailable()).toBe(false);
    await expect(service.get("key")).resolves.toBeNull();
    await expect(service.getJson("key")).resolves.toBeNull();
    await expect(service.setJson("key", { a: 1 }, 10)).resolves.toBeUndefined();
    await expect(service.del()).resolves.toBeUndefined();
    await expect(service.incr("key")).resolves.toBeNull();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it("connects lazily with bounded retries", () => {
    const service = new RedisService(config(REDIS_URL));
    service.onModuleInit();

    const client = RedisConstructor.instances[0];
    expect(client.url).toBe(REDIS_URL);
    expect(client.options).toMatchObject({
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(service.isAvailable()).toBe(false);
  });

  it("reports availability only after the ready event", () => {
    const { service, client } = connectedService();

    expect(service.isAvailable()).toBe(true);
    expect(service.getClient()).toBe(client);

    client.emit("error", new Error("connection reset"));
    expect(service.isAvailable()).toBe(false);

    client.emit("ready");
    client.emit("end");
    expect(service.isAvailable()).toBe(false);
  });

  it("proxies get, set, del and incr while connected", async () => {
    const { service, client } = connectedService();

    client.get.mockResolvedValue("value");
    client.incr.mockResolvedValue(42);

    await expect(service.get("key")).resolves.toBe("value");
    await service.setJson("key", { a: 1 }, 30);
    await service.del("one", "two");
    await expect(service.incr("counter")).resolves.toBe(42);

    expect(client.set).toHaveBeenCalledWith("key", '{"a":1}', "EX", 30);
    expect(client.del).toHaveBeenCalledWith("one", "two");
    expect(client.incr).toHaveBeenCalledWith("counter");
    expect(client.get).toHaveBeenCalledWith("key");
  });

  it("clamps TTLs to at least one second", async () => {
    const { service, client } = connectedService();

    await service.setJson("zero", 1, 0);
    await service.setJson("negative", 1, -5);

    expect(client.set).toHaveBeenNthCalledWith(1, "zero", "1", "EX", 1);
    expect(client.set).toHaveBeenNthCalledWith(2, "negative", "1", "EX", 1);
  });

  it("parses JSON and tolerates malformed values", async () => {
    const { service, client } = connectedService();

    client.get.mockResolvedValue('{"ok":true}');
    await expect(service.getJson("key")).resolves.toEqual({ ok: true });

    client.get.mockResolvedValue("not-json");
    await expect(service.getJson("key")).resolves.toBeNull();

    client.get.mockResolvedValue(null);
    await expect(service.getJson("key")).resolves.toBeNull();
  });

  it("degrades to null when a Redis command fails", async () => {
    const { service, client } = connectedService();
    client.get.mockRejectedValue(new Error("socket closed"));

    await expect(service.get("key")).resolves.toBeNull();
  });

  it("caps the retry delay and gives up after ten attempts", () => {
    const service = new RedisService(config(REDIS_URL));
    service.onModuleInit();

    const retryStrategy = RedisConstructor.instances[0].options.retryStrategy;
    expect(retryStrategy).toBeDefined();
    expect(retryStrategy?.(2)).toBe(400);
    expect(retryStrategy?.(10)).toBe(2_000);
    expect(retryStrategy?.(11)).toBeNull();
  });

  it("quits on shutdown and disconnects if quit fails", async () => {
    const first = connectedService();
    await first.service.onModuleDestroy();
    expect(first.client.quit).toHaveBeenCalled();

    RedisConstructor.instances.length = 0;
    const second = connectedService();
    second.client.quit.mockRejectedValue(new Error("already closed"));
    await second.service.onModuleDestroy();
    expect(second.client.disconnect).toHaveBeenCalled();
  });

  it("keeps caching disabled when the initial connection fails", async () => {
    RedisConstructor.nextConnectError = new Error("refused");
    const service = new RedisService(config(REDIS_URL));

    service.onModuleInit();

    // The rejection is handled inside onModuleInit; availability stays false.
    await Promise.resolve();
    expect(RedisConstructor.instances[0].connect).toHaveBeenCalled();
    expect(service.isAvailable()).toBe(false);
  });
});
