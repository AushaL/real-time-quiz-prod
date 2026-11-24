import { RealtimeGateway } from "./realtime.gateway";
import type { RealtimeEvent } from "./realtime-bus.service";

interface FakeServer {
  local: { to: jest.Mock };
  to: jest.Mock;
}

/**
 * The gateway is wired through the e2e suite, but cross-instance delivery is
 * invisible with a single server: assert here that bus events are emitted with
 * the `local` flag instead of being republished through the Redis adapter.
 */
describe("RealtimeGateway", () => {
  function createGateway(server?: FakeServer): RealtimeGateway {
    const gateway = new RealtimeGateway(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    if (server) {
      (gateway as unknown as { server: FakeServer }).server = server;
    }
    return gateway;
  }

  it("broadcasts bus events to local sockets only", () => {
    const emit = jest.fn();
    const localTo = jest.fn(() => ({ emit }));
    const globalTo = jest.fn(() => ({ emit }));
    const gateway = createGateway({ local: { to: localTo }, to: globalTo });

    const event: RealtimeEvent = {
      event: "chat:message",
      code: "ROOM01",
      payload: { text: "hi" },
    };
    (gateway as unknown as { broadcast: (value: RealtimeEvent) => void }).broadcast(
      event,
    );

    expect(localTo).toHaveBeenCalledWith("ROOM01");
    expect(emit).toHaveBeenCalledWith("chat:message", { text: "hi" });
    expect(globalTo).not.toHaveBeenCalled();
  });

  it("does nothing before the server is initialized", () => {
    const gateway = createGateway();

    expect(() =>
      (gateway as unknown as { broadcast: (value: RealtimeEvent) => void }).broadcast(
        { event: "room:update", code: "ROOM01", payload: {} },
      ),
    ).not.toThrow();
  });
});
