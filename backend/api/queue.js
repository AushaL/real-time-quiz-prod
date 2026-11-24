/* eslint-disable no-console */
const { createHmac, timingSafeEqual } = require("node:crypto");
const { QueueClient } = require("@vercel/queue");
const { getApp } = require("../vercel/app.cjs");

const queue = new QueueClient();

const ALLOWED_JOB_TYPES = new Set(["question-timeout", "advance", "media-cleanup"]);
const ROOM_CODE = /^[A-Z0-9]{4,12}$/;
const QUIZ_MEDIA_PUBLIC_ID = /^quiz-media\/[A-Za-z0-9_\-/.]+$/;

function signingSecret() {
  return process.env.QUEUE_SIGNING_SECRET || process.env.CLERK_SECRET_KEY || "";
}

/**
 * The callback route is reachable from the public internet, so a message is
 * only trusted when it carries a valid HMAC produced by QueueService. Without
 * this check anyone could post a `media-cleanup` job and delete quiz assets.
 */
function verifyEnvelope(envelope) {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    typeof envelope.signature !== "string" ||
    !envelope.payload ||
    typeof envelope.payload !== "object"
  ) {
    return null;
  }

  const secret = signingSecret();
  if (!secret) return null;

  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(envelope.payload))
    .digest();
  let provided;
  try {
    provided = Buffer.from(envelope.signature, "hex");
  } catch {
    return null;
  }

  return provided.length === expected.length &&
    timingSafeEqual(provided, expected)
    ? envelope.payload
    : null;
}

function isValidJob(job) {
  if (!ALLOWED_JOB_TYPES.has(job.type)) return false;

  if (job.type === "media-cleanup") {
    return (
      Array.isArray(job.assets) &&
      job.assets.every(
        (asset) =>
          asset &&
          typeof asset === "object" &&
          (asset.publicId == null ||
            (typeof asset.publicId === "string" &&
              QUIZ_MEDIA_PUBLIC_ID.test(asset.publicId))) &&
          (asset.url == null || typeof asset.url === "string"),
      )
    );
  }

  return (
    typeof job.code === "string" &&
    ROOM_CODE.test(job.code) &&
    Number.isInteger(job.questionIndex) &&
    job.questionIndex >= 0
  );
}

/**
 * Vercel Queues consumer for durable quiz timers and media cleanup.
 * Delivery is at-least-once; the coordinator handlers check room state and
 * question indexes, so a duplicate delivery is a no-op.
 */
async function processJob(envelope) {
  const job = verifyEnvelope(envelope);
  if (!job || !isValidJob(job)) {
    console.warn("Rejecting unauthenticated or malformed queue message");
    return;
  }

  const { JobsService } = require("../dist/jobs/jobs.service");
  const app = await getApp();
  await app.get(JobsService).handle(job);
}

module.exports = queue.handleNodeCallback(processJob, {
  visibilityTimeoutSeconds: 300,
  retry(error, metadata) {
    console.error(
      `Quiz job failed (delivery ${metadata.deliveryCount}):`,
      error,
    );
    // Poison messages must not be redelivered until they expire.
    if (metadata.deliveryCount >= 8) {
      return { acknowledge: true };
    }
    return {
      afterSeconds: Math.min(
        300,
        2 ** Math.min(metadata.deliveryCount, 8) * 5,
      ),
    };
  },
});
