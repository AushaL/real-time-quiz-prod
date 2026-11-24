import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { ClerkService } from "./clerk.service";

jest.mock("@clerk/backend", () => ({
  createClerkClient: jest.fn(),
  verifyToken: jest.fn(),
}));

const createClerkClientMock = createClerkClient as jest.Mock;
const verifyTokenMock = verifyToken as jest.Mock;

function config(): ConfigService {
  return {
    get: (key: string) =>
      key === "FRONTEND_URL" ? "https://quiz.example.com" : undefined,
    getOrThrow: (key: string) => (key === "CLERK_SECRET_KEY" ? "sk_test" : ""),
  } as unknown as ConfigService;
}

function service(): ClerkService {
  return new ClerkService(config());
}

describe("ClerkService", () => {
  const getUser = jest.fn();

  beforeEach(() => {
    createClerkClientMock.mockReturnValue({ users: { getUser } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates the Clerk client with the configured secret", () => {
    service();

    expect(createClerkClientMock).toHaveBeenCalledWith({ secretKey: "sk_test" });
  });

  describe("verifyToken", () => {
    it("returns the subject claim", async () => {
      verifyTokenMock.mockResolvedValue({ sub: "user_123" });

      await expect(service().verifyToken("token")).resolves.toBe("user_123");
      expect(verifyTokenMock).toHaveBeenCalledWith("token", {
        secretKey: "sk_test",
        authorizedParties: ["https://quiz.example.com"],
      });
    });

    it("rejects tokens without a subject", async () => {
      verifyTokenMock.mockResolvedValue({ sub: undefined });

      await expect(service().verifyToken("token")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("maps verification errors to a 401", async () => {
      verifyTokenMock.mockRejectedValue(new Error("expired"));

      await expect(service().verifyToken("token")).rejects.toThrow(
        "Unauthorized - you must be logged in",
      );
    });
  });

  describe("getPrimaryEmail", () => {
    it("prefers the primary email address", async () => {
      getUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "admin@test.dev" },
        emailAddresses: [{ emailAddress: "other@test.dev" }],
      });

      await expect(service().getPrimaryEmail("user_1")).resolves.toBe(
        "admin@test.dev",
      );
    });

    it("falls back to the first email address and then to null", async () => {
      getUser.mockResolvedValueOnce({
        primaryEmailAddress: null,
        emailAddresses: [{ emailAddress: "first@test.dev" }],
      });
      await expect(service().getPrimaryEmail("user_1")).resolves.toBe(
        "first@test.dev",
      );

      getUser.mockResolvedValueOnce({
        primaryEmailAddress: null,
        emailAddresses: [],
      });
      await expect(service().getPrimaryEmail("user_2")).resolves.toBeNull();
    });

    it("caches emails for five minutes", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      getUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "admin@test.dev" },
      });
      const clerk = service();

      await clerk.getPrimaryEmail("user_1");
      await clerk.getPrimaryEmail("user_1");
      expect(getUser).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await clerk.getPrimaryEmail("user_1");
      expect(getUser).toHaveBeenCalledTimes(2);
    });

    it("returns null when Clerk cannot load the user", async () => {
      getUser.mockRejectedValue(new Error("not found"));

      await expect(service().getPrimaryEmail("user_1")).resolves.toBeNull();
    });
  });
});
