import { EventEmitter } from "node:events";
import type {
  RealtimeBusService,
  RealtimeEvent,
  RealtimeEventListener,
} from "../../src/realtime/realtime-bus.service";

/**
 * Test double for RealtimeBusService: broadcasts synchronously in-process and
 * never opens a Redis connection.
 */
export class InMemoryRealtimeBus implements Pick<
  RealtimeBusService,
  "publish" | "subscribe"
> {
  private readonly emitter = new EventEmitter();
  readonly published: RealtimeEvent[] = [];

  async publish(event: RealtimeEvent): Promise<void> {
    this.published.push(event);
    this.emitter.emit("event", event);
  }

  subscribe(listener: RealtimeEventListener): () => void {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }
}
