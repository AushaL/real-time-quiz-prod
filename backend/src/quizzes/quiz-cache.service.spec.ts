import type { ConfigService } from "@nestjs/config";
import type { RedisService } from "../redis/redis.service";
import { QuizCacheService } from "./quiz-cache.service";

function buildCache(configValue: unknown) {
  const redis = {
    get: jest.fn().mockResolvedValue("3"),
    getJson: jest.fn(),
    setJson: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(4),
  };
  const config = {
    get: jest.fn().mockReturnValue(configValue),
  } as unknown as ConfigService;

  return {
    redis,
    cache: new QuizCacheService(redis as unknown as RedisService, config),
  };
}

describe("QuizCacheService", () => {
  it("namespaces list entries by the current version", async () => {
    const { redis, cache } = buildCache("120");

    await cache.setList('{"a":1}', []);

    expect(redis.setJson).toHaveBeenCalledWith(
      'quiz:list:v1:3:{"a":1}',
      [],
      120,
    );
  });

  it("falls back to a 60 second TTL for invalid configuration", async () => {
    const { redis, cache } = buildCache(undefined);

    await cache.setList("key", []);

    expect(redis.setJson).toHaveBeenCalledWith(expect.any(String), [], 60);
  });

  it("caches individual quizzes by id", async () => {
    const { redis, cache } = buildCache("60");

    await cache.setItem({ _id: "quiz-1" } as never);

    expect(redis.setJson).toHaveBeenCalledWith(
      "quiz:item:v1:quiz-1",
      { _id: "quiz-1" },
      60,
    );
    await cache.getItem("quiz-1");
    expect(redis.getJson).toHaveBeenCalledWith("quiz:item:v1:quiz-1");
  });

  it("drops the item and bumps the list version on write", async () => {
    const { redis, cache } = buildCache("60");

    await cache.invalidate("quiz-1");

    expect(redis.del).toHaveBeenCalledWith("quiz:item:v1:quiz-1");
    expect(redis.incr).toHaveBeenCalledWith("quiz:list:version");
  });
});
