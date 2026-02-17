import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const useInMemory = process.env.USE_IN_MEMORY_STORE === "true" || !redisUrl;

// In-memory fallback for local testing
class InMemoryStore {
  private store = new Map<string, { value: string; expireAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expireAt && Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<"OK"> {
    let expireAt: number | undefined;
    // Handle EX option (seconds)
    const exIndex = args.indexOf("EX");
    if (exIndex !== -1 && typeof args[exIndex + 1] === "number") {
      expireAt = Date.now() + (args[exIndex + 1] as number) * 1000;
    }
    this.store.set(key, { value, expireAt });
    return "OK";
  }

  async setex(key: string, seconds: number, value: string): Promise<"OK"> {
    this.store.set(key, { value, expireAt: Date.now() + seconds * 1000 });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expireAt = Date.now() + seconds * 1000;
    return 1;
  }

  on(_event: string, _callback: (...args: unknown[]) => void): this {
    return this;
  }
}

type RedisLike = Redis | InMemoryStore;

let redis: RedisLike;

if (useInMemory) {
  console.log("[REDIS] Using in-memory store (local testing mode)");
  redis = new InMemoryStore();
} else {
  redis = new Redis(redisUrl!, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  redis.on("connect", () => {
    console.log("Connected to Redis");
  });
}

export { redis };
