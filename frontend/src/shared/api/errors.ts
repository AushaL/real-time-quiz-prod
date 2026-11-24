import axios from "axios";

/** HTTP status of an Axios error, if it has one. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Extracts the human-readable message from an API error. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
