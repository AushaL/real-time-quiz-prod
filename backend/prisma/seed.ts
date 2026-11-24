import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, QuestionType } from "../src/generated/prisma/client";
import { expectedQuestionCount } from "../src/quizzes/quiz.constants";
import { quizzes } from "./seed-data";

config({ path: ".env.local" });
config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function toQuestionType(value: "text" | "image" | "audio"): QuestionType {
  return value as QuestionType;
}

async function main(): Promise<void> {
  for (const quiz of quizzes) {
    const expected = expectedQuestionCount(quiz.difficulty);
    if (expected === null) {
      throw new Error(
        `Quiz "${quiz.title}" has invalid difficulty ${quiz.difficulty}`,
      );
    }
    if (quiz.questions.length !== expected) {
      throw new Error(
        `Quiz "${quiz.title}" should have ${expected} questions, got ${quiz.questions.length}`,
      );
    }
  }

  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();

  for (const quiz of quizzes) {
    await prisma.quiz.create({
      data: {
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        variant: quiz.variant,
        mode: quiz.mode,
        questions: {
          create: quiz.questions.map((question, position) => ({
            position,
            questionText: question.questionText,
            questionType: toQuestionType(question.questionType),
            mediaUrl: question.mediaUrl ?? null,
            mediaPublicId: question.mediaPublicId ?? null,
            options: question.options,
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation ?? null,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${quizzes.length} quizzes.`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
