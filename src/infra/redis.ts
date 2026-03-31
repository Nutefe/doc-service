import IORedis from "ioredis";

let redis: IORedis | null = null;

export async function getRedis(url: string) {
  if (redis) return redis;
  redis = new IORedis(url, { maxRetriesPerRequest: null });
  return redis;
}

export async function redisHealth() {
  try {
    if (!redis) return { ok: false, error: "not_connected" };
    const pong = await redis.ping();
    return { ok: pong === "PONG" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
