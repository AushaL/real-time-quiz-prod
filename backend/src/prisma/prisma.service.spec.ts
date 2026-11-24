import { connectionPoolConfig } from "./prisma.service";

describe("connectionPoolConfig", () => {
  it("maps connection_limit from the database URL to the pg pool size", () => {
    expect(
      connectionPoolConfig(
        "postgresql://user:secret@pooler.example.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require",
      ),
    ).toEqual({ max: 1 });
  });

  it("keeps the pg default when connection_limit is absent or invalid", () => {
    expect(connectionPoolConfig("postgresql://user:secret@localhost:5432/quiz")).toEqual(
      {},
    );
    expect(
      connectionPoolConfig("postgresql://localhost/quiz?connection_limit=abc"),
    ).toEqual({});
    expect(
      connectionPoolConfig("postgresql://localhost/quiz?connection_limit=0"),
    ).toEqual({});
    expect(connectionPoolConfig("not a connection string")).toEqual({});
  });
});
