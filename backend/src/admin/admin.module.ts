import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { QuizzesModule } from "../quizzes/quizzes.module";
import { QueueModule } from "../queue/queue.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, MediaModule, QuizzesModule, QueueModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
