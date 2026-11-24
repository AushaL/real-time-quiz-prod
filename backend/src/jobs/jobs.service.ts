import { Injectable, OnModuleInit } from "@nestjs/common";
import { CloudinaryService } from "../media/cloudinary.service";
import { GameCoordinatorService } from "../realtime/game-coordinator.service";
import type { QuizJob } from "../queue/job.types";
import { QueueService } from "../queue/queue.service";

/**
 * Single entry point for background work, shared by the local timer driver and
 * the Vercel Queues callback function.
 */
@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    private readonly coordinator: GameCoordinatorService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  onModuleInit(): void {
    this.queue.setLocalHandler((job) => this.handle(job));
  }

  async handle(job: QuizJob): Promise<void> {
    switch (job.type) {
      case "question-timeout":
        return this.coordinator.handleQuestionTimeout(job.code, job.questionIndex);
      case "advance":
        return this.coordinator.handleAdvance(job.code, job.questionIndex);
      case "media-cleanup":
        await Promise.all(
          job.assets.map((asset) =>
            this.cloudinary.destroy(asset.publicId, asset.url),
          ),
        );
        return;
      default:
        // Unknown jobs (e.g. published by an older deployment) are acknowledged
        // instead of retried forever.
        return;
    }
  }
}
