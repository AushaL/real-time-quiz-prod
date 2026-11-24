import { Injectable, NotFoundException } from "@nestjs/common";
import type { QuestionType } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QuizCacheService } from "./quiz-cache.service";
import type { ClientQuiz, QuizWithQuestions } from "./quiz.mapper";
import { toClientQuiz } from "./quiz.mapper";
import {
  filtersCacheKey,
  parseQuizFilters,
  type QuizFilters,
  type QuizQuery,
} from "./quiz-query";
import {
  toQuestionRows,
  type QuizMediaSnapshot,
  type QuizWriteInput,
} from "./quiz-write";

const QUESTIONS_INCLUDE = {
  questions: { orderBy: { position: "asc" as const } },
};

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: QuizCacheService,
  ) {}

  async findAll(query: QuizQuery): Promise<ClientQuiz[]> {
    const filters = parseQuizFilters(query);
    const cacheKey = filtersCacheKey(filters);

    const cached = await this.cache.getList(cacheKey);
    if (cached) return cached;

    const quizzes = await this.prisma.quiz.findMany({
      where: buildWhere(filters),
      orderBy:
        filters.sortBy === "difficulty"
          ? { difficulty: filters.sortOrder }
          : { createdAt: filters.sortOrder },
      include: QUESTIONS_INCLUDE,
    });

    const result = quizzes.map(toClientQuiz);
    await this.cache.setList(cacheKey, result);
    return result;
  }

  async findById(id: string): Promise<ClientQuiz> {
    const cached = await this.cache.getItem(id);
    if (cached) return cached;

    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: QUESTIONS_INCLUDE,
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    const result = toClientQuiz(quiz as QuizWithQuestions);
    await this.cache.setItem(result);
    return result;
  }

  /**
   * Write side of the module. Admin codes call these instead of touching the
   * quiz tables directly, so cache invalidation and the aggregate shape stay
   * in one place.
   */
  async create(input: QuizWriteInput): Promise<ClientQuiz> {
    const quiz = await this.prisma.quiz.create({
      data: {
        ...quizScalars(input),
        questions: { create: toQuestionRows(input.questions) },
      },
      include: QUESTIONS_INCLUDE,
    });

    await this.cache.invalidate(quiz.id);
    return toClientQuiz(quiz as QuizWithQuestions);
  }

  async update(id: string, input: QuizWriteInput): Promise<ClientQuiz> {
    await this.assertExists(id);

    const quiz = await this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { quizId: id } });
      return tx.quiz.update({
        where: { id },
        data: {
          ...quizScalars(input),
          questions: { create: toQuestionRows(input.questions) },
        },
        include: QUESTIONS_INCLUDE,
      });
    });

    await this.cache.invalidate(id);
    return toClientQuiz(quiz as QuizWithQuestions);
  }

  /** Deletes the quiz and returns the media that is no longer referenced. */
  async remove(id: string): Promise<QuizMediaSnapshot> {
    const existing = await this.getMediaSnapshot(id);

    await this.prisma.quiz.delete({ where: { id } });

    await this.cache.invalidate(id);
    return existing;
  }

  async getMediaSnapshot(id: string): Promise<QuizMediaSnapshot> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        questions: { select: { mediaUrl: true, mediaPublicId: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    return quiz;
  }

  private async assertExists(id: string): Promise<void> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }
  }
}

function quizScalars(input: QuizWriteInput) {
  return {
    title: input.title,
    description: input.description,
    difficulty: input.difficulty,
    variant: input.variant,
    mode: input.mode,
  };
}

function buildWhere(filters: QuizFilters) {
  const where: {
    difficulty?: { in: number[] };
    mode?: { in: string[] };
    questions?: { some: { questionType: { in: QuestionType[] } } };
  } = {};

  if (filters.difficulty.length) {
    where.difficulty = { in: filters.difficulty };
  }
  if (filters.modes.length) {
    where.mode = { in: filters.modes };
  }
  if (filters.types.length) {
    where.questions = { some: { questionType: { in: filters.types } } };
  }

  return where;
}
