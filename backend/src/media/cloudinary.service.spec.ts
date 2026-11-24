import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryService, QUIZ_MEDIA_FOLDER } from "./cloudinary.service";

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    utils: {
      api_sign_request: jest.fn(),
    },
  },
}));

const uploadStream = cloudinary.uploader.upload_stream as jest.Mock;
const destroyAsset = cloudinary.uploader.destroy as jest.Mock;
const signRequest = cloudinary.utils.api_sign_request as jest.Mock;

function configWith(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

function service() {
  return new CloudinaryService(
    configWith({
      CLOUDINARY_CLOUD_NAME: "test-cloud",
      CLOUDINARY_API_KEY: "test-key",
      CLOUDINARY_API_SECRET: "test-secret",
    }),
  );
}

function streamThatCompletes(
  callback: (error: Error | undefined, result?: Record<string, unknown>) => void,
  result?: Record<string, unknown>,
) {
  return {
    end: jest.fn(() => callback(undefined, result)),
  };
}

describe("CloudinaryService", () => {
  beforeEach(() => {
    uploadStream.mockReset();
    destroyAsset.mockReset().mockResolvedValue({ result: "ok" });
    signRequest.mockReset().mockReturnValue("signed-value");
  });

  describe("upload", () => {
    it("uploads the buffer to the quiz-media folder", async () => {
      uploadStream.mockImplementation((_options, callback) =>
        streamThatCompletes(callback, {
          secure_url: "https://cdn.test/file.png",
          public_id: "quiz-media/file",
        }),
      );

      const buffer = Buffer.from("image-bytes");
      await expect(service().upload(buffer)).resolves.toEqual({
        url: "https://cdn.test/file.png",
        publicId: "quiz-media/file",
      });

      expect(uploadStream).toHaveBeenCalledWith(
        { resource_type: "auto", folder: QUIZ_MEDIA_FOLDER },
        expect.any(Function),
      );
      expect(uploadStream.mock.results[0].value.end).toHaveBeenCalledWith(buffer);
    });

    it("rejects with a 500 when Cloudinary reports an error", async () => {
      uploadStream.mockImplementation((_options, callback) => ({
        end: jest.fn(() => callback(new Error("quota exceeded"))),
      }));

      await expect(service().upload(Buffer.from("x"))).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      await expect(service().upload(Buffer.from("x"))).rejects.toThrow(
        "Error uploading to cloudinary",
      );
    });

    it("rejects when Cloudinary returns an empty result", async () => {
      uploadStream.mockImplementation((_options, callback) =>
        streamThatCompletes(callback),
      );

      await expect(service().upload(Buffer.from("x"))).rejects.toThrow(
        "Error uploading to cloudinary",
      );
    });
  });

  describe("destroy", () => {
    it("does nothing without a public id", async () => {
      await service().destroy(null, "https://cdn.test/file.png");
      await service().destroy(undefined);
      expect(destroyAsset).not.toHaveBeenCalled();
    });

    it.each([
      ["https://res.cloudinary.com/demo/video/upload/track.mp3", "video"],
      ["https://res.cloudinary.com/demo/raw/upload/file.txt", "raw"],
      ["https://res.cloudinary.com/demo/image/upload/pic.png", "image"],
      [undefined, "image"],
    ])("derives the resource type from %s", async (url, resourceType) => {
      await service().destroy("pid", url);

      expect(destroyAsset).toHaveBeenCalledWith("pid", {
        resource_type: resourceType,
        invalidate: true,
      });
    });

    it("swallows cleanup failures so deletes are not blocked", async () => {
      destroyAsset.mockRejectedValue(new Error("not found"));

      await expect(service().destroy("pid", "https://cdn.test/x.png")).resolves.toBeUndefined();
    });
  });

  describe("resolveClientMedia", () => {
    it.each([
      [
        "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
        "quiz-media/pic",
      ],
      [
        "https://res.cloudinary.com/test-cloud/video/upload/v1/quiz-media/audio",
        "quiz-media/audio",
      ],
      [
        "https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_200/v1/quiz-media/pic%20one.png",
        "quiz-media/pic one",
      ],
    ])("accepts %s", (url, publicId) => {
      expect(service().resolveClientMedia(url, publicId)).toBe(publicId);
    });

    it("returns null when there is no direct-upload reference", () => {
      expect(service().resolveClientMedia(null, "quiz-media/pic")).toBeNull();
      expect(
        service().resolveClientMedia(
          "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/pic.png",
          null,
        ),
      ).toBeNull();
    });

    it("rejects URLs from other origins or accounts", () => {
      expect(() =>
        service().resolveClientMedia("not-a-url", "quiz-media/pic"),
      ).toThrow(BadRequestException);
      expect(() =>
        service().resolveClientMedia(
          "https://cdn.example.com/test-cloud/image/upload/quiz-media/pic.png",
          "quiz-media/pic",
        ),
      ).toThrow("mediaUrl must point to this Cloudinary account");
      expect(() =>
        service().resolveClientMedia(
          "https://res.cloudinary.com/other-cloud/image/upload/quiz-media/pic.png",
          "quiz-media/pic",
        ),
      ).toThrow("mediaUrl must point to this Cloudinary account");
    });

    it("only allows public ids from the quiz-media folder", () => {
      expect(() =>
        service().resolveClientMedia(
          "https://res.cloudinary.com/test-cloud/image/upload/v1/other/pic.png",
          "other/pic",
        ),
      ).toThrow("mediaPublicId must belong to the quiz-media folder");
    });

    it("requires the public id to be part of the url", () => {
      expect(() =>
        service().resolveClientMedia(
          "https://res.cloudinary.com/test-cloud/image/upload/v1/quiz-media/one.png",
          "quiz-media/two",
        ),
      ).toThrow("mediaPublicId does not match mediaUrl");
    });
  });

  describe("createUploadSignature", () => {
    it("signs the timestamp and default folder", () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      try {
        const signature = service().createUploadSignature();

        expect(signRequest).toHaveBeenCalledWith(
          { timestamp: 1_767_225_600, folder: QUIZ_MEDIA_FOLDER },
          "test-secret",
        );
        expect(signature).toEqual({
          cloudName: "test-cloud",
          apiKey: "test-key",
          timestamp: 1_767_225_600,
          folder: QUIZ_MEDIA_FOLDER,
          signature: "signed-value",
          uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/auto/upload",
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it("signs a custom folder", () => {
      const signature = service().createUploadSignature("avatars");

      expect(signRequest).toHaveBeenCalledWith(
        expect.objectContaining({ folder: "avatars" }),
        "test-secret",
      );
      expect(signature.folder).toBe("avatars");
    });
  });
});
