import { Worker } from "bullmq";
import { getRedis } from "../infra/redis";
import { processDocument } from "./processors/document.processor";
import { log } from "../utils/logger";

export async function startBullWorker(redisUrl: string, concurrency: number) {
  const conn = await getRedis(redisUrl);

  const w = new Worker(
    "documents",
    async (job) => {
      await processDocument(job.data as any);
    },
    { connection: conn, concurrency },
  );

  w.on("failed", (job, err) => {
    log("error", "bull_job_failed", { jobId: job?.id, err: String(err) });
  });

  w.on("completed", (job) => {
    log("info", "bull_job_completed", { jobId: job.id });
  });

  return w;
}
