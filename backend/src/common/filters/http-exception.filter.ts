import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

/**
 * Keeps the error contract the frontend already relies on: the `message`
 * field is always a string, including for class-validator errors (which
 * Nest returns as an array by default).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const raw = (body as { message?: unknown }).message;
        if (Array.isArray(raw)) {
          message = raw.join("; ");
        } else if (typeof raw === "string") {
          message = raw;
        } else {
          message = exception.message;
        }
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
      if (process.env.NODE_ENV !== "production" && exception instanceof Error) {
        message = exception.message;
      }
    }

    response.status(status).json({ statusCode: status, message });
  }
}
