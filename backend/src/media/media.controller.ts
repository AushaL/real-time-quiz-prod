import { Controller, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ClerkAuthGuard } from "../auth/guards/clerk-auth.guard";
import { CloudinaryService, type UploadSignature } from "./cloudinary.service";

@Controller("media")
@UseGuards(ClerkAuthGuard, AdminGuard)
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post("signature")
  createSignature(): UploadSignature {
    return this.cloudinary.createUploadSignature();
  }
}
