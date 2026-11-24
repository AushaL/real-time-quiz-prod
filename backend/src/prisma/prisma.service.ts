import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>("DATABASE_URL");
    super({
      adapter: new PrismaPg({
        connectionString,
        ...connectionPoolConfig(connectionString),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Connected to PostgreSQL");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

/**
 * `@prisma/adapter-pg` hands the connection string straight to `pg.Pool`,
 * which does not understand Prisma's `connection_limit` parameter. Without
 * this, every serverless instance silently opens up to `pg`'s default of 10
 * connections, regardless of what the deployment URL asks for.
 */
export function connectionPoolConfig(
  connectionString: string,
): { max?: number } {
  let raw: string | null = null;
  try {
    raw = new URL(connectionString).searchParams.get("connection_limit");
  } catch {
    return {};
  }

  const max = Number(raw);
  return Number.isInteger(max) && max > 0 ? { max } : {};
}
