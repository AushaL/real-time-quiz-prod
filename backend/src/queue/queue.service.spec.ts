import type { ConfigService } from "@nestjs/config";
import { send } from "@vercel/queue";
import { QUIZ_JOBS_TOPIC } from "./job.types";
import { QueueService, signJob } from "./queue.service";

jest.mock("@vercel/queue", () => ({ send: jest.fn() }));

const sendMock = send as jest.MockedFunction<typeof send>;
const SIGNING_SECRET = "test-signing-secret";

const sign = (job: Parameters<typeof signJob>[0]) =>
  signJob(job, SIGNING_SECRET);

function configWith(driver?: "local" | "vercel"): ConfigService {
  return {
    get: (key: string) => {
      if (key === "QUEUE_DRIVER") return driver;
      if (key === "CLERK_SECRET_KEY") return SIGNING_SECRET;
      return undefined;
    },
  } as unknown as ConfigService;
}

describe("QueueService", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ messageId: "msg-1" });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("runs immediate jobs locally on the next tick", async () => {
    const service = new QueueService(configWith("local"));
    const handler = jest.fn().mockResolvedValue(undefined);
    service.setLocalHandler(handler);

    await service.enqueue({ type: "media-cleanup", assets: [] });
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith({ type: "media-cleanup", assets: [] });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("runs delayed jobs locally after the requested delay", async () => {
    jest.useFakeTimers();
    const service = new QueueService(configWith("local"));
    const handler = jest.fn().mockResolvedValue(undefined);
    service.setLocalHandler(handler);

    await service.enqueue(
      { type: "advance", code: "ROOM01", questionIndex: 0 },
      4_000,
    );

    jest.advanceTimersByTime(3_999);
    expect(handler).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledWith({
      type: "advance",
      code: "ROOM01",
      questionIndex: 0,
    });
  });

  it("publishes delayed jobs to Vercel Queues with an idempotency key", async () => {
    const service = new QueueService(configWith("vercel"));
    const handler = jest.fn();
    service.setLocalHandler(handler);

    const job = {
      type: "question-timeout" as const,
      code: "ROOM01",
      questionIndex: 2,
    };
    await service.enqueue(job, 60_000);

    expect(sendMock).toHaveBeenCalledWith(
      QUIZ_JOBS_TOPIC,
      { payload: job, signature: sign(job) },
      { delaySeconds: 60, idempotencyKey: "quiz:question-timeout:ROOM01:2" },
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("falls back to a local timer when publishing fails", async () => {
    jest.useFakeTimers();
    sendMock.mockRejectedValue(new Error("no credentials"));

    const service = new QueueService(configWith("vercel"));
    const handler = jest.fn().mockResolvedValue(undefined);
    service.setLocalHandler(handler);

    await service.enqueue(
      { type: "advance", code: "ROOM01", questionIndex: 0 },
      1_000,
    );

    jest.advanceTimersByTime(1_000);
    expect(handler).toHaveBeenCalled();
  });

  it("uses the Vercel driver automatically on Vercel", async () => {
    const previous = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      const service = new QueueService(configWith());
      const job = { type: "media-cleanup" as const, assets: [] };
      expect(service.isRemoteDriver()).toBe(true);
      await service.enqueue(job);
      expect(sendMock).toHaveBeenCalledWith(
        QUIZ_JOBS_TOPIC,
        { payload: job, signature: sign(job) },
        { delaySeconds: 1 },
      );
    } finally {
      process.env.VERCEL = previous;
    }
  });

  it("skips empty media-cleanup jobs", async () => {
    const service = new QueueService(configWith("local"));
    const handler = jest.fn();
    service.setLocalHandler(handler);

    await service.enqueueMediaCleanup([]);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("enqueues non-empty media-cleanup jobs", async () => {
    const service = new QueueService(configWith("local"));
    const handler = jest.fn().mockResolvedValue(undefined);
    service.setLocalHandler(handler);

    const assets = [{ publicId: "pid-1", url: "https://cdn.test/one.png" }];
    await service.enqueueMediaCleanup(assets);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith({ type: "media-cleanup", assets });
  });

  it("drops local jobs when no handler is registered", async () => {
    const service = new QueueService(configWith("local"));

    await expect(
      service.enqueue({ type: "advance", code: "ROOM01", questionIndex: 0 }),
    ).resolves.toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it("swallows failures of the local handler", async () => {
    const service = new QueueService(configWith("local"));
    const handler = jest.fn().mockRejectedValue(new Error("boom"));
    service.setLocalHandler(handler);

    await service.enqueue({ type: "advance", code: "ROOM01", questionIndex: 0 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalled();
  });

  it("clears pending local timers on shutdown", async () => {
    jest.useFakeTimers();
    const service = new QueueService(configWith("local"));
    const handler = jest.fn();
    service.setLocalHandler(handler);

    await service.enqueue(
      { type: "advance", code: "ROOM01", questionIndex: 0 },
      5_000,
    );
    service.onModuleDestroy();

    jest.advanceTimersByTime(5_000);
    expect(handler).not.toHaveBeenCalled();
  });
});
