import { Module } from "@nestjs/common";
import { QueueService } from "./queue.service";

/**
 * Infrastructure module for background work. It knows how to schedule a job
 * but not what a job does, so feature modules can depend on it without
 * depending on each other.
 */
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
