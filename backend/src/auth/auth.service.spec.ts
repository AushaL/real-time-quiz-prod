import type { PrismaService } from "../prisma/prisma.service";
import { buildFullName, AuthService } from "./auth.service";

describe("buildFullName", () => {
  it("joins first and last name", () => {
    expect(buildFullName({ firstName: "Ada", lastName: "Lovelace" })).toBe(
      "Ada Lovelace",
    );
  });

  it("ignores missing or blank parts", () => {
    expect(buildFullName({ firstName: "Ada", lastName: "  " })).toBe("Ada");
  });

  it("falls back to User", () => {
    expect(buildFullName({})).toBe("User");
  });
});

describe("AuthService", () => {
  const upsert = jest.fn();
  const prisma = { player: { upsert } } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates the player keyed by the token subject", async () => {
    upsert.mockResolvedValue({});
    const service = new AuthService(prisma);

    await service.syncPlayer("user_123", {
      id: "someone_else",
      firstName: "Ada",
      lastName: "Lovelace",
      imageUrl: "https://img",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { clerkId: "user_123" },
      update: {},
      create: {
        clerkId: "user_123",
        fullName: "Ada Lovelace",
        imageUrl: "https://img",
      },
    });
  });

  it("stores an empty image url when none is provided", async () => {
    upsert.mockResolvedValue({});
    const service = new AuthService(prisma);

    await service.syncPlayer("user_123", {});

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ imageUrl: "", fullName: "User" }),
      }),
    );
  });
});
