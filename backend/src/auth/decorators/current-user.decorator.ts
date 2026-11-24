import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../types/authenticated-request";

/** Injects the Clerk user id that ClerkAuthGuard put on the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new Error("CurrentUser used on a route without ClerkAuthGuard");
    }
    return request.auth.userId;
  },
);
