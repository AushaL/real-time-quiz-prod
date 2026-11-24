import "reflect-metadata";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateDatabaseEnvironment } from "./config/database.config";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";

/**
 * Headers applied to every API response. The API only serves JSON, so the
 * content-security policy can be maximally restrictive; the frontend ships its
 * own (browser-facing) policy from `frontend/vercel.json`.
 */
export function applySecurityHeaders(app: INestApplication): void {
  const isProduction = process.env.NODE_ENV === "production";

  app.use((_req: Request, res: Response, next: NextFunction) => {
    // Do not advertise the server implementation.
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
    next();
  });
}

/**
 * Applies the same HTTP configuration the server uses. Exported so e2e tests
 * exercise pipes, filters and routing exactly like production.
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService);

  const origins = (config.get<string>("FRONTEND_URL") ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix("api");
  applySecurityHeaders(app);
  app.enableCors({
    origin: origins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  return app;
}

/**
 * Builds the Nest application without listening on a port. The local entry
 * point calls listen(); the Vercel entry point will reuse this factory.
 */
export async function createApp(): Promise<INestApplication> {
  // Fail fast on the common Vercel/Supabase misconfiguration (direct URL used
  // at runtime, missing TLS, transaction pooler used for migrations).
  validateDatabaseEnvironment(process.env);

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.useWebSocketAdapter(new RedisIoAdapter(app, app.get(ConfigService)));
  return app;
}
