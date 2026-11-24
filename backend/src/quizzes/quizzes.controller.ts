import { Controller, Get, Param, Query } from "@nestjs/common";
import type { ClientQuiz } from "./quiz.mapper";
import type { QuizQuery } from "./quiz-query";
import { QuizzesService } from "./quizzes.service";

@Controller("quizzes")
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  findAll(@Query() query: QuizQuery): Promise<ClientQuiz[]> {
    return this.quizzesService.findAll(query);
  }

  @Get(":quizeId")
  findById(@Param("quizeId") id: string): Promise<ClientQuiz> {
    return this.quizzesService.findById(id);
  }
}
