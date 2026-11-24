// Количество вопросов, привязанное к сложности квиза (совпадает с backend)
export const DIFFICULTY_QUESTIONS: Record<number, number> = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
};

export const DIFFICULTY = [
  {
    label: "Лёгкий",
    badge: "bg-emerald-600/10 text-emerald-600 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  {
    label: "Средний",
    badge: "bg-blue-600/10 text-blue-600 ring-blue-600/20",
    dot: "bg-blue-500",
  },
  {
    label: "Сложный",
    badge: "bg-amber-600/10 text-amber-600 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  {
    label: "Эксперт",
    badge: "bg-rose-600/10 text-rose-600 ring-rose-600/20",
    dot: "bg-rose-500",
  },
] as const;

export const MODE_LABEL: Record<string, string> = {
  classic: "Классика",
  live: "Live",
  offline: "Офлайн",
};

export const VARIANT_LABEL: Record<string, string> = {
  multiple_choice: "Тест",
};

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  text: "Текст",
  image: "Картинка",
  audio: "Аудио",
};

export const QUIZ_TYPE_LABEL: Record<string, string> = {
  text: "Текстовый",
  image: "С картинками",
  audio: "Музыкальный",
};

export const QUIZ_TYPE_BADGE: Record<string, string> = {
  text: "bg-violet-600/10 text-violet-600 ring-violet-600/20",
  image: "bg-emerald-600/10 text-emerald-600 ring-emerald-600/20",
  audio: "bg-fuchsia-600/10 text-fuchsia-600 ring-fuchsia-600/20",
};
