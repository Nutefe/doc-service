import { Router } from "express";
import { mongodbHealth } from "../../infra/mongodb";
import { redisHealth } from "../../infra/redis";
import { queueHealth } from "../../queue/queue";

export function healthRoutes() {
  const r = Router();
  r.get("/health", async (_req, res) => {
    const [mongo, redis, queue] = await Promise.all([
      mongodbHealth(),
      redisHealth(),
      queueHealth(),
    ]);
    const ok = mongo.ok && queue.ok; // redis may be down if memory fallback
    res.status(ok ? 200 : 503).json({ ok, mongo, redis, queue });
  });
  return r;
}
