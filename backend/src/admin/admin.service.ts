import { BadRequestException, Injectable } from "@nestjs/common";
import { CloudinaryService, type UploadedMedia } from "../media/cloudinary.service";
import { QueueService } from "../queue/queue.service";
import type { ClientQuiz } from "../quizzes/quiz.mapper";
import { QuizzesService } from "../quizzes/quizzes.service";
import { parseQuizForm, type ParsedQuestion } from "./quiz-form";

export interface MutateQuizResponse {
  success: true;
  message: string;
  data: ClientQuiz;
}

/**
 * Application layer for the admin UI: parses the multipart form and manages
 * media uploads/cleanup. Quiz persistence is delegated to QuizzesService, the
 * owner of the quiz aggregate.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly quizzes: QuizzesService,
    private readonly queue: QueueService,
  ) {}

  async createQuiz(
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ): Promise<MutateQuizResponse> {
    const input = parseQuizForm(body);
    const fileMap = toFileMap(files);
    const uploaded: UploadedMedia[] = [];

    try {
      await this.resolveQuestionMedia(input.questions, fileMap, uploaded);

      const quiz = await this.quizzes.create(input);

      return {
        success: true,
        message: "Quiz created successfully",
        data: quiz,
      };
    } catch (error) {
      await this.queue.enqueueMediaCleanup(uploaded);
      throw error;
    }
  }

  async updateQuiz(
    id: string,
    body: Record<string, unknown>,
    files: Express.Multer.File[],
  ): Promise<MutateQuizResponse> {
    const existing = await this.quizzes.getMediaSnapshot(id);

    const input = parseQuizForm(body);
    const fileMap = toFileMap(files);
    const publicIdByUrl = new Map(
      existing.questions
        .filter((question) => question.mediaUrl && question.mediaPublicId)
        .map((question) => [question.mediaUrl as string, question.mediaPublicId as string]),
    );

    const uploaded: UploadedMedia[] = [];
    const keptPublicIds = new Set<string>();

    try {
      await this.resolveQuestionMedia(
        input.questions,
        fileMap,
        uploaded,
        publicIdByUrl,
        keptPublicIds,
      );

      const quiz = await this.quizzes.update(id, input);

      const obsolete = existing.questions
        .filter(
          (question) =>
            question.mediaPublicId && !keptPublicIds.has(question.mediaPublicId),
        )
        .map((question) => ({
          publicId: question.mediaPublicId,
          url: question.mediaUrl,
        }));
      await this.queue.enqueueMediaCleanup(obsolete);

      return {
        success: true,
        message: "Quiz updated successfully",
        data: quiz,
      };
    } catch (error) {
      await this.queue.enqueueMediaCleanup(uploaded);
      throw error;
    }
  }

  async deleteQuiz(id: string): Promise<{ message: string }> {
    const deleted = await this.quizzes.remove(id);

    await this.queue.enqueueMediaCleanup(
      deleted.questions.map((question) => ({
        publicId: question.mediaPublicId,
        url: question.mediaUrl,
      })),
    );

    return { message: "Quiz deleted successfully" };
  }

  /**
   * Fills in `mediaUrl`/`mediaPublicId` for every non-text question, either by
   * uploading the file from the request or by validating a direct browser ->
   * Cloudinary reference. Assets created here are pushed to `uploaded` so the
   * caller can clean them up if the database write fails.
   */
  private async resolveQuestionMedia(
    questions: ParsedQuestion[],
    fileMap: Map<string, Express.Multer.File>,
    uploaded: UploadedMedia[],
    publicIdByUrl: Map<string, string> = new Map(),
    keptPublicIds: Set<string> = new Set(),
  ): Promise<void> {
    for (const [index, question] of questions.entries()) {
      if (question.questionType === "text") continue;

      const file = fileMap.get(`question_${index}_file`);
      if (file) {
        const media = await this.cloudinary.upload(file.buffer);
        uploaded.push(media);
        question.mediaUrl = media.url;
        question.mediaPublicId = media.publicId;
        continue;
      }

      if (!question.mediaUrl) {
        throw new BadRequestException(
          `Missing required file for question at index ${index} (${question.questionType} type)`,
        );
      }

      const directPublicId = this.cloudinary.resolveClientMedia(
        question.mediaUrl,
        question.mediaPublicId,
      );
      const existingPublicId = publicIdByUrl.get(question.mediaUrl) ?? null;
      const publicId = directPublicId ?? existingPublicId;

      question.mediaPublicId = publicId;
      if (publicId) keptPublicIds.add(publicId);

      // A direct upload that replaces the stored asset becomes an orphan if
      // the update fails, so include it in the rollback cleanup.
      if (directPublicId && directPublicId !== existingPublicId) {
        uploaded.push({ url: question.mediaUrl, publicId: directPublicId });
      }
    }
  }
}

function toFileMap(files: Express.Multer.File[]): Map<string, Express.Multer.File> {
  const map = new Map<string, Express.Multer.File>();
  for (const file of files) {
    if (!map.has(file.fieldname)) map.set(file.fieldname, file);
  }
  return map;
}
