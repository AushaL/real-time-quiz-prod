import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../redis/redis.service";
import type { ClientQuiz } from "./quiz.mapper";

const LIST_VERSION_KEY = "quiz:list:version";
const LIST_PREFIX = "quiz:list:v1";
const ITEM_PREFIX = "quiz:item:v1";
const DEFAULT_TTL_SECONDS = 60;

/**
 * Quiz reads are cached for a short time. Writes bump a version counter, so
 * stale list keys are never read again and expire on their own (no SCAN).
 */
@Injectable()
export class QuizCacheService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    const configured = Number(config.get<string | number>("QUIZ_CACHE_TTL_SECONDS"));
    this.ttlSeconds =
      Number.isFinite(configured) && configured > 0
        ? Math.floor(configured)
        : DEFAULT_TTL_SECONDS;
  }

  async getList(filtersKey: string): Promise<ClientQuiz[] | null> {
    return this.redis.getJson<ClientQuiz[]>(await this.listKey(filtersKey));
  }

  async setList(filtersKey: string, quizzes: ClientQuiz[]): Promise<void> {
    await this.redis.setJson(await this.listKey(filtersKey), quizzes, this.ttlSeconds);
  }

  async getItem(id: string): Promise<ClientQuiz | null> {
    return this.redis.getJson<ClientQuiz>(`${ITEM_PREFIX}:${id}`);
  }

  async setItem(quiz: ClientQuiz): Promise<void> {
    await this.redis.setJson(`${ITEM_PREFIX}:${quiz._id}`, quiz, this.ttlSeconds);
  }

  async invalidate(id: string): Promise<void> {
    await this.redis.del(`${ITEM_PREFIX}:${id}`);
    await this.redis.incr(LIST_VERSION_KEY);
  }

  private async listKey(filtersKey: string): Promise<string> {
    const version = (await this.redis.get(LIST_VERSION_KEY)) ?? "0";
    return `${LIST_PREFIX}:${version}:${filtersKey}`;
  }
}
