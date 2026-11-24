import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient, verifyToken } from "@clerk/backend";

const EMAIL_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Verifies Clerk session tokens (HTTP Bearer and, later, the Socket.IO
 * handshake) and resolves the caller's primary email for the admin check.
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly secretKey: string;
  private readonly authorizedParties: string[];
  private readonly client: ReturnType<typeof createClerkClient>;
  private readonly emailCache = new Map<
    string,
    { email: string | null; expiresAt: number }
  >();

  constructor(config: ConfigService) {
    this.secretKey = config.getOrThrow<string>("CLERK_SECRET_KEY");
    // Restrict accepted session tokens to the origins this app is served
    // from. Without this, a token minted for any other frontend on the same
    // Clerk instance would be accepted.
    this.authorizedParties = (
      config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    this.client = createClerkClient({ secretKey: this.secretKey });
  }

  /** Returns the Clerk user id (`sub` claim) or throws UnauthorizedException. */
  async verifyToken(token: string): Promise<string> {
    try {
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
        authorizedParties: this.authorizedParties,
      });
      if (!payload?.sub) {
        throw new UnauthorizedException("Unauthorized - you must be logged in");
      }
      return payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.debug(
        `Clerk token verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException("Unauthorized - you must be logged in");
    }
  }

  async getPrimaryEmail(userId: string): Promise<string | null> {
    const cached = this.emailCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.email;
    }

    try {
      const user = await this.client.users.getUser(userId);
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress ??
        null;
      this.emailCache.set(userId, {
        email,
        expiresAt: Date.now() + EMAIL_CACHE_TTL_MS,
      });
      return email;
    } catch (error) {
      this.logger.warn(
        `Failed to load Clerk user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
