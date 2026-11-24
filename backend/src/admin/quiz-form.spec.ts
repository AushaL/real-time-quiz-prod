import { BadRequestException } from "@nestjs/common";
import { parseQuizForm } from "./quiz-form";

const question = (overrides: Record<string, unknown> = {}) => ({
  questionText: "Capital of France?",
  questionType: "text",
  options: ["Paris", "Rome"],
  correctAnswerIndex: 0,
  explanation: "",
  ...overrides,
});

const baseBody = (questionCount = 4, overrides: Record<string, unknown> = {}) => ({
  title: "Capitals",
  description: "World capitals",
  difficulty: "1",
  variant: "multiple_choice",
  mode: "classic",
  questions: JSON.stringify(Array.from({ length: questionCount }, () => question())),
  ...overrides,
});

async function expectBadRequest(fn: () => unknown, message: string) {
  await expect(async () => fn()).rejects.toBeInstanceOf(BadRequestException);
  await expect(async () => fn()).rejects.toThrow(message);
}

describe("parseQuizForm", () => {
  it("parses a valid form", () => {
    const parsed = parseQuizForm(baseBody());

    expect(parsed.difficulty).toBe(1);
    expect(parsed.questions).toHaveLength(4);
    expect(parsed.questions[0]).toMatchObject({
      questionType: "text",
      mediaUrl: null,
      mediaPublicId: null,
      explanation: "",
    });
  });

  it("requires the quiz fields", async () => {
    await expectBadRequest(
      () => parseQuizForm(baseBody(4, { title: "  " })),
      "Missing required quiz fields",
    );
  });

  it("rejects unsupported difficulty", async () => {
    await expectBadRequest(
      () => parseQuizForm(baseBody(4, { difficulty: "5" })),
      "Invalid difficulty value",
    );
  });

  it("requires at least one parseable question", async () => {
    await expectBadRequest(
      () => parseQuizForm(baseBody(0)),
      "Quiz must contain at least one question",
    );

    await expectBadRequest(
      () => parseQuizForm(baseBody(4, { questions: "not-json" })),
      "Quiz must contain at least one question",
    );
  });

  it("enforces the question count implied by difficulty", async () => {
    await expectBadRequest(
      () => parseQuizForm(baseBody(2)),
      "For difficulty 1 expected exactly 4 questions, got 2.",
    );
  });

  it("defaults questionType to text", () => {
    const body = baseBody(4, {
      questions: JSON.stringify(
        Array.from({ length: 4 }, () => question({ questionType: undefined })),
      ),
    });

    expect(parseQuizForm(body).questions[0].questionType).toBe("text");
  });

  it("rejects malformed questions", async () => {
    const withQuestion = (patch: Record<string, unknown>) =>
      baseBody(4, {
        questions: JSON.stringify([
          question(patch),
          question(),
          question(),
          question(),
        ]),
      });

    await expectBadRequest(
      () => parseQuizForm(withQuestion({ questionText: "" })),
      "Question at index 0: questionText is required",
    );
    await expectBadRequest(
      () => parseQuizForm(withQuestion({ questionType: "video" })),
      "Question at index 0: invalid questionType",
    );
    await expectBadRequest(
      () => parseQuizForm(withQuestion({ options: ["Only one"] })),
      "Question at index 0: options must contain at least two non-empty strings",
    );
    await expectBadRequest(
      () => parseQuizForm(withQuestion({ correctAnswerIndex: 5 })),
      "Question at index 0: correctAnswerIndex is out of range",
    );
    await expectBadRequest(
      () => parseQuizForm(withQuestion({ mediaUrl: 42 })),
      "Question at index 0: mediaUrl must be a string",
    );
    await expectBadRequest(
      () => parseQuizForm(withQuestion({ mediaPublicId: 42 })),
      "Question at index 0: mediaPublicId must be a string",
    );
  });

  it("keeps a direct-upload public id supplied by the admin UI", () => {
    const parsed = parseQuizForm(
      baseBody(4, {
        questions: JSON.stringify([
          question({
            questionType: "image",
            mediaUrl:
              "https://res.cloudinary.com/demo/image/upload/v1/quiz-media/pic.png",
            mediaPublicId: "quiz-media/pic",
          }),
          question(),
          question(),
          question(),
        ]),
      }),
    );

    expect(parsed.questions[0]).toMatchObject({
      mediaUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/quiz-media/pic.png",
      mediaPublicId: "quiz-media/pic",
    });
  });

  it("normalises blank media urls to null", () => {
    const parsed = parseQuizForm(
      baseBody(4, {
        questions: JSON.stringify([
          question({ questionType: "image", mediaUrl: "   " }),
          question(),
          question(),
          question(),
        ]),
      }),
    );

    expect(parsed.questions[0].mediaUrl).toBeNull();
  });
});
