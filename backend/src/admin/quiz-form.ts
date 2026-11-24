import { BadRequestException } from "@nestjs/common";
import {
  QUESTION_TYPES,
  expectedQuestionCount,
  type QuestionTypeValue,
} from "../quizzes/quiz.constants";

export interface ParsedQuestion {
  questionText: string;
  questionType: QuestionTypeValue;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  options: string[];
  correctAnswerIndex: number;
  explanation: string | null;
}

export interface ParsedQuizForm {
  title: string;
  description: string;
  difficulty: number;
  variant: string;
  mode: string;
  questions: ParsedQuestion[];
}

/**
 * Validates the multipart form the admin UI sends. Messages for the checks
 * that existed in the Express controller are kept verbatim.
 */
export function parseQuizForm(body: Record<string, unknown>): ParsedQuizForm {
  const title = asString(body.title);
  const description = asString(body.description);
  const variant = asString(body.variant);
  const mode = asString(body.mode);

  if (!title || !description || !variant || !mode) {
    throw new BadRequestException("Missing required quiz fields");
  }

  const difficulty = Number(body.difficulty);
  const expected = expectedQuestionCount(difficulty);
  if (!expected) {
    throw new BadRequestException("Invalid difficulty value");
  }

  const questions = parseQuestionsField(body.questions);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new BadRequestException("Quiz must contain at least one question");
  }

  if (questions.length !== expected) {
    throw new BadRequestException(
      `For difficulty ${difficulty} expected exactly ${expected} questions, got ${questions.length}.`,
    );
  }

  return {
    title,
    description,
    difficulty,
    variant,
    mode,
    questions: questions.map((question, index) => parseQuestion(question, index)),
  };
}

function parseQuestion(raw: unknown, index: number): ParsedQuestion {
  if (!isRecord(raw)) {
    throw new BadRequestException(`Question at index ${index}: invalid payload`);
  }

  const questionText = asString(raw.questionText);
  if (!questionText || !questionText.trim()) {
    throw new BadRequestException(
      `Question at index ${index}: questionText is required`,
    );
  }

  const questionType = (raw.questionType ?? "text") as QuestionTypeValue;
  if (!(QUESTION_TYPES as readonly string[]).includes(questionType)) {
    throw new BadRequestException(`Question at index ${index}: invalid questionType`);
  }

  const options = raw.options;
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    !options.every((option) => typeof option === "string" && option.trim() !== "")
  ) {
    throw new BadRequestException(
      `Question at index ${index}: options must contain at least two non-empty strings`,
    );
  }

  const correctAnswerIndex = Number(raw.correctAnswerIndex);
  if (
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= options.length
  ) {
    throw new BadRequestException(
      `Question at index ${index}: correctAnswerIndex is out of range`,
    );
  }

  const mediaUrl = parseOptionalString(raw.mediaUrl, index, "mediaUrl");
  const mediaPublicId = parseOptionalString(
    raw.mediaPublicId,
    index,
    "mediaPublicId",
  );
  const explanation = parseOptionalString(raw.explanation, index, "explanation");

  return {
    questionText,
    questionType,
    mediaUrl: mediaUrl?.trim() ? mediaUrl : null,
    mediaPublicId: mediaPublicId?.trim() ? mediaPublicId : null,
    options: options as string[],
    correctAnswerIndex,
    explanation: explanation ?? null,
  };
}

function parseQuestionsField(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseOptionalString(
  value: unknown,
  index: number,
  field: string,
): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new BadRequestException(
      `Question at index ${index}: ${field} must be a string`,
    );
  }
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
