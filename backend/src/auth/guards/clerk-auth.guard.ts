import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ClerkService } from "../clerk.service";
import type { AuthenticatedRequest } from "../types/authenticated-request";

const UNAUTHORIZED = "Unauthorized - you must be logged in";

/** Validates `Authorization: Bearer <Clerk session token>` on HTTP routes. */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly clerk: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    request.auth = { userId: await this.clerk.verifyToken(token) };
    return true;
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
