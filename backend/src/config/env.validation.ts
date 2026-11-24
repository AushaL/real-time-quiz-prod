import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(5000),
  FRONTEND_URL: Joi.string().default("http://localhost:3000"),

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().optional(),
  TEST_DATABASE_URL: Joi.string().optional(),

  REDIS_URL: Joi.string().required(),
  QUIZ_CACHE_TTL_SECONDS: Joi.number().integer().positive().default(60),

  SOCKET_PATH: Joi.string().default("/socket.io"),
  QUESTION_TIMEOUT_MS: Joi.number().integer().positive().default(60_000),
  REVEAL_DELAY_MS: Joi.number().integer().positive().default(4_000),
  QUEUE_DRIVER: Joi.string().valid("local", "vercel").optional(),
  // HMAC key for Vercel Queues messages. Falls back to CLERK_SECRET_KEY when
  // unset, so existing deployments keep working.
  QUEUE_SIGNING_SECRET: Joi.string().optional(),

  CLERK_SECRET_KEY: Joi.string().required(),
  ADMIN_EMAIL: Joi.string().email().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
});
