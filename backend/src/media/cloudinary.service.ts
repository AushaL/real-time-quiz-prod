import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

export const QUIZ_MEDIA_FOLDER = "quiz-media";

export interface UploadedMedia {
  url: string;
  publicId: string;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: ConfigService) {
    this.cloudName = config.getOrThrow<string>("CLOUDINARY_CLOUD_NAME");
    this.apiKey = config.getOrThrow<string>("CLOUDINARY_API_KEY");
    this.apiSecret = config.getOrThrow<string>("CLOUDINARY_API_SECRET");

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  /** Uploads an in-memory Multer file directly to Cloudinary. */
  upload(buffer: Buffer): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: QUIZ_MEDIA_FOLDER },
        (error, result) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message ?? "empty result"}`,
            );
            reject(new InternalServerErrorException("Error uploading to cloudinary"));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  /**
   * Best-effort cleanup. Audio is stored as the `video` resource type by
   * Cloudinary, so the type is derived from the delivery URL.
   */
  async destroy(publicId: string | null | undefined, url?: string | null): Promise<void> {
    if (!publicId) return;
    const resourceType = resourceTypeFromUrl(url);
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary asset ${publicId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Validates a media reference produced by a signed direct upload. Only
   * assets in this account's quiz-media folder may be stored, otherwise a
   * client could point a quiz at an unrelated asset and have it deleted when
   * the quiz is removed.
   *
   * Returns the public id to persist, or null when the client did not send
   * one (legacy data and external URLs are still allowed).
   */
  resolveClientMedia(
    mediaUrl: string | null,
    mediaPublicId: string | null,
  ): string | null {
    if (!mediaUrl || !mediaPublicId) return null;

    let parsed: URL;
    try {
      parsed = new URL(mediaUrl);
    } catch {
      throw new BadRequestException("mediaUrl must be a valid URL");
    }

    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
      throw new BadRequestException(
        "mediaUrl must point to this Cloudinary account",
      );
    }

    const [cloudName] = parsed.pathname.split("/").filter(Boolean);
    if (cloudName !== this.cloudName) {
      throw new BadRequestException(
        "mediaUrl must point to this Cloudinary account",
      );
    }

    if (!mediaPublicId.startsWith(`${QUIZ_MEDIA_FOLDER}/`)) {
      throw new BadRequestException(
        `mediaPublicId must belong to the ${QUIZ_MEDIA_FOLDER} folder`,
      );
    }

    let decodedPath = parsed.pathname;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      // Keep the raw path; the comparison below still works for normal ids.
    }

    if (!decodedPath.includes(mediaPublicId)) {
      throw new BadRequestException("mediaPublicId does not match mediaUrl");
    }

    return mediaPublicId;
  }

  /**
   * Credentials for browser -> Cloudinary direct uploads. Required on Vercel,
   * where request bodies are capped at 4.5 MB.
   */
  createUploadSignature(folder: string = QUIZ_MEDIA_FOLDER): UploadSignature {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      this.apiSecret,
    );

    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
    };
  }
}

function resourceTypeFromUrl(url?: string | null): "image" | "video" | "raw" {
  if (url?.includes("/video/upload/")) return "video";
  if (url?.includes("/raw/upload/")) return "raw";
  return "image";
}
