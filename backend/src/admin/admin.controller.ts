import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ClerkAuthGuard } from "../auth/guards/clerk-auth.guard";
import { AdminService, type MutateQuizResponse } from "./admin.service";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller("admin")
@UseGuards(ClerkAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("check")
  check(): { admin: true } {
    return { admin: true };
  }

  @Post("quiz")
  @UseInterceptors(
    AnyFilesInterceptor({ limits: { fileSize: MAX_FILE_SIZE, files: 16 } }),
  )
  createQuiz(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<MutateQuizResponse> {
    return this.adminService.createQuiz(body, files);
  }

  @Put("quiz/:id")
  @UseInterceptors(
    AnyFilesInterceptor({ limits: { fileSize: MAX_FILE_SIZE, files: 16 } }),
  )
  updateQuiz(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<MutateQuizResponse> {
    return this.adminService.updateQuiz(id, body, files);
  }

  @Delete("quiz/:id")
  deleteQuiz(@Param("id") id: string): Promise<{ message: string }> {
    return this.adminService.deleteQuiz(id);
  }
}
