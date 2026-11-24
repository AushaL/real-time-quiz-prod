import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { QueueModule } from "../queue/queue.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { JobsService } from "./jobs.service";

/**
 * Application-level dispatcher for queued work. It is the only place that
 * knows which handler runs a job; producers (realtime, admin) depend on
 * QueueService instead.
 */
@Module({
  imports: [QueueModule, MediaModule, RealtimeModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
