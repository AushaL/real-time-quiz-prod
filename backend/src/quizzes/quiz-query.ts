import {
  DIFFICULTY_VALUES,
  QUIZ_MODES,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionTypeValue,
  type QuizMode,
} from "./quiz.constants";

export type QueryValue = string | string[] | undefined;

export interface QuizQuery {
  difficulty?: QueryValue;
  type?: QueryValue;
  mode?: QueryValue;
  sortBy?: QueryValue;
  sortOrder?: QueryValue;
}

export interface QuizFilters {
  difficulty: Difficulty[];
  types: QuestionTypeValue[];
  modes: QuizMode[];
  sortBy: "difficulty" | "createdAt" | null;
  sortOrder: "asc" | "desc";
}

const SORT_FIELDS = ["difficulty", "createdAt"] as const;

/**
 * Accepts `?mode=live,classic` (and repeated params) and silently drops
 * unknown values, which is how the Express handlers behaved.
 */
export function parseListParam(value: QueryValue): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseQuizFilters(query: QuizQuery): QuizFilters {
  const difficulty = [
    ...new Set(
      parseListParam(query.difficulty)
        .map(Number)
        .filter((value): value is Difficulty =>
          (DIFFICULTY_VALUES as readonly number[]).includes(value),
        ),
    ),
  ].sort((a, b) => a - b);

  const types = [
    ...new Set(
      parseListParam(query.type).filter((value): value is QuestionTypeValue =>
        (QUESTION_TYPES as readonly string[]).includes(value),
      ),
    ),
  ].sort();

  const modes = [
    ...new Set(
      parseListParam(query.mode).filter((value): value is QuizMode =>
        (QUIZ_MODES as readonly string[]).includes(value),
      ),
    ),
  ].sort();

  const requestedSort = firstValue(query.sortBy);
  const sortBy = (SORT_FIELDS as readonly string[]).includes(requestedSort ?? "")
    ? (requestedSort as "difficulty" | "createdAt")
    : null;
  const sortOrder = firstValue(query.sortOrder) === "asc" ? "asc" : "desc";

  return { difficulty, types, modes, sortBy, sortOrder };
}

/** Stable cache key component: field order and array order are fixed. */
export function filtersCacheKey(filters: QuizFilters): string {
  return JSON.stringify(filters);
}
