import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClerkService } from "../clerk.service";
import type { AuthenticatedRequest } from "../types/authenticated-request";

const FORBIDDEN = "Unauthorized - you must be an admin";

/** Must run after ClerkAuthGuard; compares the Clerk email with ADMIN_EMAIL. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly clerk: ClerkService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const adminEmail = this.config.get<string>("ADMIN_EMAIL");

    if (!request.auth || !adminEmail) {
      throw new ForbiddenException(FORBIDDEN);
    }

    const email = await this.clerk.getPrimaryEmail(request.auth.userId);
    if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
      throw new ForbiddenException(FORBIDDEN);
    }

    return true;
  }
}
