import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { envValidationSchema } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      // Nest 12 moved validationSchema to Standard Schema (Zod/Arktype), so
      // Joi is wired through the generic validate callback instead.
      validate: (config) => {
        const { error, value } = envValidationSchema.validate(config, {
          allowUnknown: true,
          abortEarly: false,
        });
        if (error) {
          throw new Error(`Environment validation failed: ${error.message}`);
        }
        return value as Record<string, unknown>;
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    QuizzesModule,
    MediaModule,
    AdminModule,
    RealtimeModule,
    JobsModule,
  ],
})
export class AppModule {}
