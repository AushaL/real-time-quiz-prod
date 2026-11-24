import { axiosInstance } from "./axios";

export interface UploadedQuizMedia {
  url: string;
  publicId: string;
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

interface CloudinaryUploadResult {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

/**
 * Uploads a quiz asset straight to Cloudinary. The file never goes through the
 * API, which matters on Vercel because function request bodies are capped at
 * 4.5 MB. The backend only issues a short-lived signature and stores the
 * returned URL/public id.
 */
export async function uploadQuizMedia(file: File): Promise<UploadedQuizMedia> {
  const { data: signature } = await axiosInstance.post<UploadSignature>(
    "/api/media/signature",
  );

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("folder", signature.folder);
  body.append("signature", signature.signature);

  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body,
  });

  const result = (await response.json().catch(() => ({}))) as CloudinaryUploadResult;

  if (!response.ok) {
    throw new Error(
      result.error?.message ?? `Cloudinary upload failed (HTTP ${response.status})`,
    );
  }

  if (!result.secure_url || !result.public_id) {
    throw new Error("Cloudinary did not return a media URL");
  }

  return { url: result.secure_url, publicId: result.public_id };
}
