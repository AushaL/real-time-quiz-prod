import type { QuestionTypeValue } from "./quiz.constants";

/**
 * Write-side contract of the quizzes module. The admin module parses the
 * multipart form into this shape and hands it over; persistence and cache
 * invalidation stay owned by QuizzesService.
 */
export interface QuizQuestionInput {
  questionText: string;
  questionType: QuestionTypeValue;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  options: string[];
  correctAnswerIndex: number;
  explanation: string | null;
}

export interface QuizWriteInput {
  title: string;
  description: string;
  difficulty: number;
  variant: string;
  mode: string;
  questions: QuizQuestionInput[];
}

/** Minimal quiz projection used by the admin module for media bookkeeping. */
export interface QuizMediaSnapshot {
  id: string;
  questions: {
    mediaUrl: string | null;
    mediaPublicId: string | null;
  }[];
}

export function toQuestionRows(questions: QuizQuestionInput[]) {
  return questions.map((question, position) => ({
    position,
    questionText: question.questionText,
    questionType: question.questionType,
    mediaUrl: question.mediaUrl,
    mediaPublicId: question.mediaPublicId,
    options: question.options,
    correctAnswerIndex: question.correctAnswerIndex,
    explanation: question.explanation,
  }));
}
