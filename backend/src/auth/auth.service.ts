import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthCallbackDto } from "./dto/auth-callback.dto";

export function buildFullName(dto: Pick<AuthCallbackDto, "firstName" | "lastName">): string {
  return [dto.firstName, dto.lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim() || "User";
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the player row on first sign-in. Existing players are left
   * untouched, matching the previous Express behaviour.
   */
  async syncPlayer(clerkId: string, dto: AuthCallbackDto): Promise<void> {
    await this.prisma.player.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        fullName: buildFullName(dto),
        imageUrl: dto.imageUrl?.trim() ? dto.imageUrl : "",
      },
    });
  }
}
