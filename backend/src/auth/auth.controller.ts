import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthCallbackDto } from "./dto/auth-callback.dto";
import { ClerkAuthGuard } from "./guards/clerk-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("callback")
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  async callback(
    @CurrentUser() userId: string,
    @Body() dto: AuthCallbackDto,
  ): Promise<{ success: true }> {
    await this.authService.syncPlayer(userId, dto);
    return { success: true };
  }
}
