/** Topic consumed by the Vercel Queues callback (see `api/queue.ts`). */
export const QUIZ_JOBS_TOPIC = "quiz-jobs";

export interface MediaAssetRef {
  publicId?: string | null;
  url?: string | null;
}

export type QuizJob =
  | { type: "question-timeout"; code: string; questionIndex: number }
  | { type: "advance"; code: string; questionIndex: number }
  | { type: "media-cleanup"; assets: MediaAssetRef[] };
