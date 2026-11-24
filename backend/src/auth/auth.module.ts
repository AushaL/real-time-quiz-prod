import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ClerkService } from "./clerk.service";
import { AdminGuard } from "./guards/admin.guard";
import { ClerkAuthGuard } from "./guards/clerk-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, ClerkService, ClerkAuthGuard, AdminGuard],
  exports: [ClerkService, ClerkAuthGuard, AdminGuard],
})
export class AuthModule {}
