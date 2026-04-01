import dotenv from "dotenv";
import { createApp } from "./app";
import { initMongodb } from "./infra/mongodb";
import {
  initQueue,
  wireMemoryProcessor,
  isMemoryMode,
  closeQueue,
} from "./queue/queue";
import { processDocument } from "./queue/processors/document.processor";
import { armShutdown, onShutdown } from "./utils/shutdown";
import { log } from "./utils/logger";

dotenv.config();

async function main() {
  const port = Number(process.env.PORT ?? "3000");
  const mongoUri = process.env.MONGO_URI!;
  const redisUrl = process.env.REDIS_URL!;
  const concurrency = Number(process.env.QUEUE_CONCURRENCY ?? "50");

  await initMongodb(mongoUri);
  await initQueue(redisUrl, concurrency);

  // If Redis down => memory fallback in the API process
  if (isMemoryMode()) wireMemoryProcessor(processDocument);
  const app = createApp();
  const srv = app.listen(port, () => log("info", "api_listening", { port }));

  onShutdown(async () => {
    await new Promise<void>((r) => srv.close(() => r()));
    await closeQueue().catch(() => {});
  });

  armShutdown();
}

main().catch((e) => {
  log("error", "api_crash", { err: String(e) });
  process.exit(1);
});
