export const DIFFICULTY_QUESTIONS = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
} as const;

export const DIFFICULTY_VALUES = [1, 2, 3, 4] as const;
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

export const QUESTION_TYPES = ["text", "image", "audio"] as const;
export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];

export const QUIZ_MODES = ["classic", "live", "offline"] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];

export function expectedQuestionCount(difficulty: number): number | null {
  return DIFFICULTY_QUESTIONS[difficulty as Difficulty] ?? null;
}
