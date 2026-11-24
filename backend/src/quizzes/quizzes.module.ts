import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { QuizCacheService } from "./quiz-cache.service";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesService } from "./quizzes.service";

@Module({
  imports: [RedisModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizCacheService],
  exports: [QuizzesService, QuizCacheService],
})
export class QuizzesModule {}
