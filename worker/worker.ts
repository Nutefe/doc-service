import express from "express";
import dotenv from "dotenv";
import { initMongodb } from "../src/infra/mongodb";
import {
  initQueue,
  isMemoryMode,
  wireMemoryProcessor,
  closeQueue,
} from "../src/queue/queue";
import { startBullWorker } from "../src/queue/worker";
import { processDocument } from "../src/queue/processors/document.processor";
import { armShutdown, onShutdown } from "../src/utils/shutdown";
import { registry } from "../src/metrics/prometheus";
import { log } from "../src/utils/logger";

dotenv.config();

async function main() {
  const port = Number(process.env.PORT ?? "3000");
  const mongoUri = process.env.MONGO_URI!;
  const redisUrl = process.env.REDIS_URL!;
  const concurrency = Number(process.env.QUEUE_CONCURRENCY ?? "50");

  await initMongodb(mongoUri);
  await initQueue(redisUrl, concurrency);

  // Expose /metrics from worker too
  const app = express();
  app.get("/metrics", async (_req, res) => {
    res.setHeader("content-type", registry.contentType);
    res.send(await registry.metrics());
  });
  const srv = app.listen(port, () =>
    log("info", "worker_metrics_listening", { port }),
  );

  onShutdown(async () => {
    await new Promise<void>((r) => srv.close(() => r()));
    await closeQueue().catch(() => {});
  });

  armShutdown();

  if (isMemoryMode()) {
    // If Redis down, you can run in degraded mode with memory queue
    wireMemoryProcessor(processDocument);
    log("warn", "worker_running_memory_mode");
  } else {
    const bullWorker = await startBullWorker(redisUrl, concurrency);
    onShutdown(async () => {
      await bullWorker.close();
    });
    log("info", "worker_running_bullmq", { concurrency });
  }
}

main().catch((e) => {
  log("error", "worker_crash", { err: String(e) });
  process.exit(1);
});
