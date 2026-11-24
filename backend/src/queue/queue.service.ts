import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { send } from "@vercel/queue";
import { createHmac } from "node:crypto";
import { QUIZ_JOBS_TOPIC, type MediaAssetRef, type QuizJob } from "./job.types";

export type LocalJobHandler = (job: QuizJob) => Promise<void>;

type QueueDriver = "local" | "vercel";

/** Wire format for Vercel Queues: the job plus an HMAC proving we produced it. */
export interface SignedQuizJob {
  payload: QuizJob;
  signature: string;
}

/**
 * The queue callback URL is public, so every published job carries an HMAC.
 * `api/queue.js` rejects anything that does not verify, which stops anonymous
 * callers from triggering media deletion or game-state transitions.
 */
export function signJob(job: QuizJob, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(job)).digest("hex");
}

/**
 * Schedules background jobs. On Vercel the job is published to Vercel Queues
 * so question timers survive a frozen or recycled function instance. Locally
 * (and in tests) the same job runs through an in-process timer.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly driver: QueueDriver;
  private readonly signingSecret: string | null;
  private readonly timers = new Set<NodeJS.Timeout>();
  private localHandler: LocalJobHandler | null = null;

  constructor(config: ConfigService) {
    const configured = config.get<string>("QUEUE_DRIVER");
    this.driver =
      configured === "vercel" ||
      (configured !== "local" && process.env.VERCEL === "1")
        ? "vercel"
        : "local";

    // A dedicated secret is preferable; falling back to the Clerk secret keeps
    // existing deployments working without extra configuration.
    this.signingSecret =
      config.get<string>("QUEUE_SIGNING_SECRET") ??
      config.get<string>("CLERK_SECRET_KEY") ??
      null;

    if (this.driver === "vercel" && !this.signingSecret) {
      this.logger.error(
        "QUEUE_SIGNING_SECRET/CLERK_SECRET_KEY is not set; remote jobs will run in-process instead",
      );
    }

    this.logger.log(`Background jobs driver: ${this.driver}`);
  }

  isRemoteDriver(): boolean {
    return this.driver === "vercel";
  }

  /**
   * Wired by JobsService. QueueService deliberately has no dependency on the
   * handler, otherwise the timer scheduler and the game coordinator would form
   * a provider cycle.
   */
  setLocalHandler(handler: LocalJobHandler): void {
    this.localHandler = handler;
  }

  async enqueue(job: QuizJob, delayMs = 0): Promise<void> {
    if (this.driver === "vercel" && this.signingSecret) {
      const envelope: SignedQuizJob = {
        payload: job,
        signature: signJob(job, this.signingSecret),
      };
      try {
        await send(QUIZ_JOBS_TOPIC, envelope, {
          delaySeconds: Math.max(1, Math.ceil(delayMs / 1000)),
          ...idempotencyKeyFor(job),
        });
        return;
      } catch (error) {
        // Losing the durable timer is bad, losing the game timer entirely is
        // worse: keep the match moving on the in-process timer as a fallback.
        this.logger.error(
          `Failed to publish job ${job.type} to Vercel Queues: ${messageOf(error)}`,
        );
      }
    }

    this.scheduleLocal(job, delayMs);
  }

  async enqueueMediaCleanup(assets: MediaAssetRef[]): Promise<void> {
    if (assets.length === 0) return;
    await this.enqueue({ type: "media-cleanup", assets }, 0);
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  private scheduleLocal(job: QuizJob, delayMs: number): void {
    if (!this.localHandler) {
      this.logger.warn(`No local job handler registered; dropping ${job.type}`);
      return;
    }

    const run = () => {
      void this.localHandler?.(job).catch((error: unknown) => {
        this.logger.error(`Local job ${job.type} failed: ${messageOf(error)}`);
      });
    };

    if (delayMs <= 0) {
      setImmediate(run);
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, delayMs);
    this.timers.add(timer);
  }
}

function idempotencyKeyFor(job: QuizJob): { idempotencyKey?: string } {
  if (job.type === "question-timeout" || job.type === "advance") {
    return {
      idempotencyKey: `quiz:${job.type}:${job.code}:${job.questionIndex}`,
    };
  }
  return {};
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
