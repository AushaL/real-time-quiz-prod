import { DIFFICULTY } from "./constants";

export function getQuizType(quiz: {
  questions?: { questionType?: string }[];
}): string {
  const types = new Set(
    (quiz.questions ?? []).map((q) => q.questionType).filter(Boolean),
  );
  if (types.has("audio")) return "audio";
  if (types.has("image")) return "image";
  return "text";
}

export function getDifficulty(level: number) {
  return DIFFICULTY[Math.min(Math.max(level, 1), 4) - 1] ?? DIFFICULTY[0];
}
