import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { CloudinaryService } from "../media/cloudinary.service";
import type { QueueService } from "../queue/queue.service";
import type { ClientQuiz } from "../quizzes/quiz.mapper";
import type { QuizMediaSnapshot } from "../quizzes/quiz-write";
import type { QuizzesService } from "../quizzes/quizzes.service";
import { AdminService } from "./admin.service";

const question = (overrides: Record<string, unknown> = {}) => ({
  questionText: "Question?",
  questionType: "text",
  options: ["A", "B"],
  correctAnswerIndex: 0,
  explanation: "",
  ...overrides,
});

function buildBody(
  questions: Record<string, unknown>[],
  overrides: Record<string, unknown> = {},
) {
  return {
    title: "Capitals",
    description: "World capitals",
    difficulty: "1",
    variant: "multiple_choice",
    mode: "classic",
    questions: JSON.stringify(questions),
    ...overrides,
  };
}

function buildClientQuiz(): ClientQuiz {
  return {
    _id: "quiz-1",
    title: "Capitals",
    description: "World capitals",
    difficulty: 1,
    variant: "multiple_choice",
    mode: "classic",
    questions: [
      {
        _id: "q-1",
        questionText: "Question?",
        questionType: "text",
        options: ["A", "B"],
        correctAnswerIndex: 0,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildSnapshot(
  questions: QuizMediaSnapshot["questions"] = [
    { mediaUrl: null, mediaPublicId: null },
  ],
): QuizMediaSnapshot {
  return { id: "quiz-1", questions };
}

function uploadedFile(fieldname: string): Express.Multer.File {
  return {
    fieldname,
    originalname: "file.png",
    mimetype: "image/png",
    buffer: Buffer.from("bytes"),
    size: 5,
  } as Express.Multer.File;
}

describe("AdminService", () => {
  const createQuiz = jest.fn();
  const updateQuiz = jest.fn();
  const removeQuiz = jest.fn();
  const getMediaSnapshot = jest.fn();
  const quizzes = {
    create: createQuiz,
    update: updateQuiz,
    remove: removeQuiz,
    getMediaSnapshot,
  } as unknown as QuizzesService;

  const upload = jest.fn();
  const destroy = jest.fn().mockResolvedValue(undefined);
  const resolveClientMedia = jest.fn(
    (_url: string | null, publicId: string | null) => publicId ?? null,
  );
  const cloudinary = {
    upload,
    destroy,
    resolveClientMedia,
  } as unknown as CloudinaryService;

  // Local queue driver semantics: cleanup runs immediately in tests.
  const enqueueMediaCleanup = jest.fn(
    async (assets: { publicId?: string | null; url?: string | null }[]) => {
      for (const asset of assets) {
        await destroy(asset.publicId, asset.url);
      }
    },
  );
  const queue = { enqueueMediaCleanup } as unknown as QueueService;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    destroy.mockResolvedValue(undefined);
    resolveClientMedia.mockImplementation(
      (_url: string | null, publicId: string | null) => publicId ?? null,
    );
    enqueueMediaCleanup.mockImplementation(
      async (assets: { publicId?: string | null; url?: string | null }[]) => {
        for (const asset of assets) {
          await destroy(asset.publicId, asset.url);
        }
      },
    );
    service = new AdminService(cloudinary, quizzes, queue);
  });

  describe("createQuiz", () => {
    it("hands the parsed form to the quizzes module and maps the response", async () => {
      createQuiz.mockResolvedValue(buildClientQuiz());

      const result = await service.createQuiz(
        buildBody(Array.from({ length: 4 }, () => question())),
        [],
      );

      expect(createQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Capitals",
          description: "World capitals",
          difficulty: 1,
          variant: "multiple_choice",
          mode: "classic",
          questions: expect.arrayContaining([
            expect.objectContaining({ questionText: "Question?", questionType: "text" }),
          ]),
        }),
      );
      expect(result).toMatchObject({
        success: true,
        message: "Quiz created successfully",
        data: { _id: "quiz-1" },
      });
    });

    it("requires a file for image and audio questions", async () => {
      const questions = [
        question({ questionType: "image" }),
        question(),
        question(),
        question(),
      ];

      await expect(service.createQuiz(buildBody(questions), [])).rejects.toThrow(
        "Missing required file for question at index 0 (image type)",
      );
      expect(createQuiz).not.toHaveBeenCalled();
    });

    it("uses the first file when a field is uploaded twice", async () => {
      upload.mockResolvedValue({ url: "https://cdn/first.png", publicId: "pid-first" });
      const questions = [
        question({ questionType: "image" }),
        question(),
        question(),
        question(),
      ];
      const first = { ...uploadedFile("question_0_file"), buffer: Buffer.from("first") };
      const second = { ...uploadedFile("question_0_file"), buffer: Buffer.from("second") };
      createQuiz.mockResolvedValue(buildClientQuiz());

      await service.createQuiz(buildBody(questions), [first, second]);

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(Buffer.from("first"));
    });

    it("rejects a question count that does not match the difficulty", async () => {
      await expect(
        service.createQuiz(buildBody([question(), question()]), []),
      ).rejects.toThrow("For difficulty 1 expected exactly 4 questions, got 2.");
    });

    it("stores a direct-upload public id without uploading the file again", async () => {
      createQuiz.mockResolvedValue(buildClientQuiz());
      const questions = [
        question({
          questionType: "image",
          mediaUrl:
            "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
          mediaPublicId: "quiz-media/pic",
        }),
        question(),
        question(),
        question(),
      ];

      await service.createQuiz(buildBody(questions), []);

      expect(upload).not.toHaveBeenCalled();
      expect(resolveClientMedia).toHaveBeenCalledWith(
        "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
        "quiz-media/pic",
      );
      expect(createQuiz.mock.calls[0][0].questions[0]).toMatchObject({
        mediaUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
        mediaPublicId: "quiz-media/pic",
      });
    });

    it("cleans up a direct upload when the database write fails", async () => {
      createQuiz.mockRejectedValue(new Error("db down"));
      const questions = [
        question({
          questionType: "image",
          mediaUrl:
            "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
          mediaPublicId: "quiz-media/pic",
        }),
        question(),
        question(),
        question(),
      ];

      await expect(service.createQuiz(buildBody(questions), [])).rejects.toThrow(
        "db down",
      );
      expect(destroy).toHaveBeenCalledWith(
        "quiz-media/pic",
        "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
      );
    });

    it("rejects an invalid direct-upload reference", async () => {
      resolveClientMedia.mockImplementationOnce(() => {
        throw new BadRequestException("mediaPublicId does not match mediaUrl");
      });
      const questions = [
        question({
          questionType: "image",
          mediaUrl: "https://cdn/external.png",
          mediaPublicId: "quiz-media/pic",
        }),
        question(),
        question(),
        question(),
      ];

      await expect(service.createQuiz(buildBody(questions), [])).rejects.toThrow(
        "mediaPublicId does not match mediaUrl",
      );
      expect(createQuiz).not.toHaveBeenCalled();
    });

    it("uploads media and removes already uploaded assets when a later upload fails", async () => {
      upload
        .mockResolvedValueOnce({ url: "https://cdn/img-0.png", publicId: "pid-0" })
        .mockRejectedValueOnce(new Error("upload failed"));

      const questions = Array.from({ length: 4 }, () =>
        question({ questionType: "image" }),
      );
      const files = [
        uploadedFile("question_0_file"),
        uploadedFile("question_1_file"),
      ];

      await expect(service.createQuiz(buildBody(questions), files)).rejects.toThrow(
        "upload failed",
      );

      expect(destroy).toHaveBeenCalledWith("pid-0", "https://cdn/img-0.png");
      expect(createQuiz).not.toHaveBeenCalled();
    });
  });

  describe("updateQuiz", () => {
    const existing = buildSnapshot([
      { mediaUrl: "https://cdn/old.png", mediaPublicId: "pid-old" },
    ]);

    it("throws 404 for an unknown quiz", async () => {
      getMediaSnapshot.mockRejectedValue(new NotFoundException("Quiz not found"));

      await expect(
        service.updateQuiz("missing", buildBody([]), []),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(updateQuiz).not.toHaveBeenCalled();
    });

    it("reuses the stored public id when the media url is unchanged", async () => {
      getMediaSnapshot.mockResolvedValue(existing);
      updateQuiz.mockResolvedValue(buildClientQuiz());

      await service.updateQuiz(
        "quiz-1",
        buildBody([
          question({ questionType: "image", mediaUrl: "https://cdn/old.png" }),
          question(),
          question(),
          question(),
        ]),
        [],
      );

      expect(updateQuiz.mock.calls[0][1].questions[0].mediaPublicId).toBe("pid-old");
      expect(destroy).not.toHaveBeenCalled();
    });

    it("uploads a replacement file and deletes the previous asset", async () => {
      getMediaSnapshot.mockResolvedValue(existing);
      upload.mockResolvedValue({ url: "https://cdn/new.png", publicId: "pid-new" });
      updateQuiz.mockResolvedValue(buildClientQuiz());

      await service.updateQuiz(
        "quiz-1",
        buildBody([
          question({ questionType: "image" }),
          question(),
          question(),
          question(),
        ]),
        [uploadedFile("question_0_file")],
      );

      expect(updateQuiz.mock.calls[0][1].questions[0]).toMatchObject({
        mediaUrl: "https://cdn/new.png",
        mediaPublicId: "pid-new",
      });
      expect(destroy).toHaveBeenCalledWith("pid-old", "https://cdn/old.png");
    });

    it("keeps a client-supplied media url that is not in the stored quiz", async () => {
      getMediaSnapshot.mockResolvedValue(existing);
      updateQuiz.mockResolvedValue(buildClientQuiz());

      await service.updateQuiz(
        "quiz-1",
        buildBody([
          question({ questionType: "image", mediaUrl: "https://cdn/external.png" }),
          question(),
          question(),
          question(),
        ]),
        [],
      );

      expect(updateQuiz.mock.calls[0][1].questions[0]).toMatchObject({
        mediaUrl: "https://cdn/external.png",
        mediaPublicId: null,
      });
      // The old asset is no longer referenced, so it is cleaned up.
      expect(destroy).toHaveBeenCalledWith("pid-old", "https://cdn/old.png");
    });

    it("accepts a direct upload for a changed image", async () => {
      getMediaSnapshot.mockResolvedValue(existing);
      updateQuiz.mockResolvedValue(buildClientQuiz());

      await service.updateQuiz(
        "quiz-1",
        buildBody([
          question({
            questionType: "image",
            mediaUrl:
              "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/new.png",
            mediaPublicId: "quiz-media/new",
          }),
          question(),
          question(),
          question(),
        ]),
        [],
      );

      expect(updateQuiz.mock.calls[0][1].questions[0]).toMatchObject({
        mediaPublicId: "quiz-media/new",
      });
      expect(destroy).toHaveBeenCalledWith("pid-old", "https://cdn/old.png");
    });

    it("removes a direct upload when the update fails", async () => {
      getMediaSnapshot.mockResolvedValue(existing);
      updateQuiz.mockRejectedValue(new Error("db down"));

      await expect(
        service.updateQuiz(
          "quiz-1",
          buildBody([
            question({
              questionType: "image",
              mediaUrl:
                "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/new.png",
              mediaPublicId: "quiz-media/new",
            }),
            question(),
            question(),
            question(),
          ]),
          [],
        ),
      ).rejects.toThrow("db down");

      expect(destroy).toHaveBeenCalledWith(
        "quiz-media/new",
        "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/new.png",
      );
    });

    it("requires media for image questions without a new file", async () => {
      getMediaSnapshot.mockResolvedValue(existing);

      await expect(
        service.updateQuiz(
          "quiz-1",
          buildBody([
            question({ questionType: "image" }),
            question(),
            question(),
            question(),
          ]),
          [],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(updateQuiz).not.toHaveBeenCalled();
    });
  });

  describe("deleteQuiz", () => {
    it("deletes the quiz and its media", async () => {
      removeQuiz.mockResolvedValue(
        buildSnapshot([
          { mediaUrl: "https://cdn/track.mp3", mediaPublicId: "pid-audio" },
        ]),
      );

      await expect(service.deleteQuiz("quiz-1")).resolves.toEqual({
        message: "Quiz deleted successfully",
      });

      expect(removeQuiz).toHaveBeenCalledWith("quiz-1");
      expect(destroy).toHaveBeenCalledWith("pid-audio", "https://cdn/track.mp3");
    });

    it("throws 404 for an unknown quiz", async () => {
      removeQuiz.mockRejectedValue(new NotFoundException("Quiz not found"));

      await expect(service.deleteQuiz("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(destroy).not.toHaveBeenCalled();
    });
  });
});
