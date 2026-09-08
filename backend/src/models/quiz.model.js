import mongoose from "mongoose";

// Количество вопросов, привязанное к сложности квиза:
// 1 (Лёгкий) — 4, 2 (Средний) — 8, 3 (Сложный) — 12, 4 (Эксперт) — 16
export const DIFFICULTY_QUESTIONS = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
};

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },

  questionType: {
    type: String,
    enum: ["text", "image", "audio"],
    required: true,
    default: "text",
  },

  mediaUrl: {
    type: String,
    required: false, // Поле нужно только для типов 'image' и 'audio'
  },

  options: [
    {
      type: String,
      required: true,
    },
  ],

  correctAnswerIndex: {
    type: Number,
    required: true,
  },

  explanation: {
    type: String,
  },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    variant: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    questions: [questionSchema],
  },
  {
    timestamps: true,
  },
);

quizSchema.pre("validate", function () {
  const expected = DIFFICULTY_QUESTIONS[this.difficulty];
  const count = this.questions?.length ?? 0;

  if (expected && count !== expected) {
    throw new Error(
      `Для сложности ${this.difficulty} должно быть ровно ${expected} вопросов, получено ${count}.`,
    );
  }
});

export const Quiz = mongoose.model("Quiz", quizSchema);
