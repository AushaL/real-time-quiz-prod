import type { RoomStoreClient } from "../../src/realtime/room.service";

/**
 * Minimal in-memory Redis substitute for the commands RoomService uses.
 * Expiry is ignored: room TTL is exercised by Redis itself, not by room logic.
 */
export class FakeRoomStore implements RoomStoreClient {
  private readonly hashes = new Map<string, Map<string, string>>();
  private readonly lists = new Map<string, string[]>();
  private readonly values = new Map<string, string>();

  async hgetall(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(this.hash(key));
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hash(key).get(field) ?? null;
  }

  async hset(
    key: string,
    dataOrField: Record<string, string> | string,
    value?: string,
  ): Promise<number> {
    const hash = this.hash(key);
    if (typeof dataOrField === "string") {
      hash.set(dataOrField, value as string);
      return 1;
    }

    let added = 0;
    for (const [field, fieldValue] of Object.entries(dataOrField)) {
      if (!hash.has(field)) added += 1;
      hash.set(field, fieldValue);
    }
    return added;
  }

  async hsetnx(key: string, field: string, value: string): Promise<number> {
    const hash = this.hash(key);
    if (hash.has(field)) return 0;
    hash.set(field, value);
    return 1;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hash(key);
    let removed = 0;
    for (const field of fields) {
      if (hash.delete(field)) removed += 1;
    }
    return removed;
  }

  async hlen(key: string): Promise<number> {
    return this.hash(key).size;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const hash = this.hash(key);
    const next = Number(hash.get(field) ?? "0") + increment;
    hash.set(field, String(next));
    return next;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.list(key);
    const end = stop < 0 ? list.length + stop : stop;
    return list.slice(start, end + 1);
  }

  async rpush(key: string, value: string): Promise<number> {
    const list = this.list(key);
    list.push(value);
    return list.length;
  }

  async lrem(key: string, _count: number, value: string): Promise<number> {
    const list = this.list(key);
    let removed = 0;
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index] === value) {
        list.splice(index, 1);
        removed += 1;
      }
    }
    return removed;
  }

  async ltrim(key: string, start: number, stop: number): Promise<unknown> {
    const list = this.list(key);
    const end = stop < 0 ? list.length + stop : stop;
    this.lists.set(key, list.slice(start, end + 1));
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    _ex: "EX",
    _ttl: number,
  ): Promise<unknown> {
    this.values.set(key, value);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.hashes.delete(key)) removed += 1;
      if (this.lists.delete(key)) removed += 1;
      if (this.values.delete(key)) removed += 1;
    }
    return removed;
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  }

  reset(): void {
    this.hashes.clear();
    this.lists.clear();
    this.values.clear();
  }

  private hash(key: string): Map<string, string> {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map();
      this.hashes.set(key, hash);
    }
    return hash;
  }

  private list(key: string): string[] {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }
    return list;
  }
}
