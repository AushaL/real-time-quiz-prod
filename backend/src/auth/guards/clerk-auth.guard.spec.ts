import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { ClerkService } from "../clerk.service";
import { ClerkAuthGuard, extractBearerToken } from "./clerk-auth.guard";

function contextWith(authorization?: string): {
  context: ExecutionContext;
  request: { headers: { authorization?: string }; auth?: unknown };
} {
  const request = { headers: { authorization } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe("extractBearerToken", () => {
  it("parses a bearer header case-insensitively", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
    expect(extractBearerToken("bearer abc")).toBe("abc");
  });

  it("rejects missing or malformed headers", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
  });
});

describe("ClerkAuthGuard", () => {
  const verifyToken = jest.fn();
  const clerk = { verifyToken } as unknown as ClerkService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests without a token", async () => {
    const guard = new ClerkAuthGuard(clerk);
    const { context } = contextWith(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("attaches the verified user id to the request", async () => {
    verifyToken.mockResolvedValue("user_123");
    const guard = new ClerkAuthGuard(clerk);
    const { context, request } = contextWith("Bearer token");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyToken).toHaveBeenCalledWith("token");
    expect(request.auth).toEqual({ userId: "user_123" });
  });
});
