import type { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import {
  REALTIME_EVENTS_CHANNEL,
  RealtimeBusService,
  type RealtimeEvent,
} from "./realtime-bus.service";

jest.mock("ioredis", () => {
  class MockRedis {
    static instances: MockRedis[] = [];
    static nextConstructorError: Error | null = null;

    status = "connecting";
    handlers = new Map<string, (...args: unknown[]) => void>();
    publish = jest.fn().mockResolvedValue(1);
    subscribe = jest.fn().mockResolvedValue(undefined);
    quit = jest.fn().mockResolvedValue("OK");
    disconnect = jest.fn();

    constructor(
      readonly url: string,
      readonly options: Record<string, unknown>,
    ) {
      if (MockRedis.nextConstructorError) {
        const error = MockRedis.nextConstructorError;
        MockRedis.nextConstructorError = null;
        throw error;
      }
      MockRedis.instances.push(this);
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
  status: string;
  publish: jest.Mock;
  subscribe: jest.Mock;
  quit: jest.Mock;
  disconnect: jest.Mock;
  emit: (event: string, ...args: unknown[]) => void;
}

const RedisConstructor = Redis as unknown as {
  instances: MockClient[];
  nextConstructorError: Error | null;
};

const EVENT: RealtimeEvent = {
  event: "room:update",
  code: "ROOM01",
  payload: { players: [] },
};

function config(url?: string): ConfigService {
  return {
    get: (key: string) => (key === "REDIS_URL" ? url : undefined),
  } as unknown as ConfigService;
}

describe("RealtimeBusService", () => {
  beforeEach(() => {
    RedisConstructor.instances.length = 0;
    RedisConstructor.nextConstructorError = null;
  });

  it("keeps events in-process without Redis", async () => {
    const bus = new RealtimeBusService(config());
    const listener = jest.fn();

    bus.onModuleInit();
    bus.subscribe(listener);
    await bus.publish(EVENT);

    expect(RedisConstructor.instances).toHaveLength(0);
    expect(listener).toHaveBeenCalledWith(EVENT);
  });

  it("stops delivering events after unsubscribe", async () => {
    const bus = new RealtimeBusService(config());
    const listener = jest.fn();

    const unsubscribe = bus.subscribe(listener);
    unsubscribe();
    await bus.publish(EVENT);

    expect(listener).not.toHaveBeenCalled();
  });

  it("publishes over Redis when the publisher is ready", async () => {
    const bus = new RealtimeBusService(config("redis://localhost:6379"));
    const listener = jest.fn();

    bus.onModuleInit();
    const [publisher, subscriber] = RedisConstructor.instances;
    publisher.status = "ready";
    bus.subscribe(listener);

    await bus.publish(EVENT);

    expect(publisher.publish).toHaveBeenCalledWith(
      REALTIME_EVENTS_CHANNEL,
      JSON.stringify(EVENT),
    );
    expect(subscriber.subscribe).toHaveBeenCalledWith(REALTIME_EVENTS_CHANNEL);
    expect(listener).not.toHaveBeenCalled();
  });

  it("falls back to in-process delivery when Redis publish fails", async () => {
    const bus = new RealtimeBusService(config("redis://localhost:6379"));
    const listener = jest.fn();

    bus.onModuleInit();
    const [publisher] = RedisConstructor.instances;
    publisher.status = "ready";
    publisher.publish.mockRejectedValue(new Error("connection lost"));
    bus.subscribe(listener);

    await bus.publish(EVENT);

    expect(listener).toHaveBeenCalledWith(EVENT);
  });

  it("delivers events received from the Redis subscriber", () => {
    const bus = new RealtimeBusService(config("redis://localhost:6379"));
    const listener = jest.fn();

    bus.onModuleInit();
    const [, subscriber] = RedisConstructor.instances;
    bus.subscribe(listener);

    subscriber.emit("message", REALTIME_EVENTS_CHANNEL, JSON.stringify(EVENT));
    expect(listener).toHaveBeenCalledWith(EVENT);

    subscriber.emit("message", "other-channel", JSON.stringify(EVENT));
    subscriber.emit("message", REALTIME_EVENTS_CHANNEL, "not-json");
    subscriber.emit("message", REALTIME_EVENTS_CHANNEL, '{"event":"room:update"}');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("closes both Redis clients on shutdown", async () => {
    const bus = new RealtimeBusService(config("redis://localhost:6379"));

    bus.onModuleInit();
    const [publisher, subscriber] = RedisConstructor.instances;
    await bus.onModuleDestroy();

    expect(publisher.quit).toHaveBeenCalled();
    expect(subscriber.quit).toHaveBeenCalled();
  });

  it("disconnects a client whose quit fails", async () => {
    const bus = new RealtimeBusService(config("redis://localhost:6379"));

    bus.onModuleInit();
    const [publisher, subscriber] = RedisConstructor.instances;
    publisher.quit.mockRejectedValue(new Error("already closed"));
    await bus.onModuleDestroy();

    expect(publisher.disconnect).toHaveBeenCalled();
    expect(subscriber.quit).toHaveBeenCalled();
  });

  it("keeps working in-process when the Redis clients cannot be created", async () => {
    RedisConstructor.nextConstructorError = new Error("driver unavailable");
    const bus = new RealtimeBusService(config("redis://localhost:6379"));
    const listener = jest.fn();

    expect(() => bus.onModuleInit()).not.toThrow();
    bus.subscribe(listener);
    await bus.publish(EVENT);

    expect(listener).toHaveBeenCalledWith(EVENT);
  });
});
