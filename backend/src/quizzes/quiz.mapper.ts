import type { Question, Quiz } from "../generated/prisma/client";
import type { QuestionTypeValue } from "./quiz.constants";

export type QuizWithQuestions = Quiz & { questions: Question[] };

/**
 * Shape returned to the frontend. It keeps the MongoDB-era `_id` fields so
 * the existing React code does not need changes.
 */
export interface ClientQuestion {
  _id: string;
  questionText: string;
  questionType: QuestionTypeValue;
  mediaUrl?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface ClientQuiz {
  _id: string;
  title: string;
  description: string;
  difficulty: number;
  variant: string;
  mode: string;
  questions: ClientQuestion[];
  createdAt: string;
  updatedAt: string;
}

export function toClientQuestion(question: Question): ClientQuestion {
  return {
    _id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    ...(question.mediaUrl != null ? { mediaUrl: question.mediaUrl } : {}),
    options: question.options,
    correctAnswerIndex: question.correctAnswerIndex,
    ...(question.explanation != null ? { explanation: question.explanation } : {}),
  };
}

export function toClientQuiz(quiz: QuizWithQuestions): ClientQuiz {
  return {
    _id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    difficulty: quiz.difficulty,
    variant: quiz.variant,
    mode: quiz.mode,
    questions: quiz.questions.map(toClientQuestion),
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
  };
}
