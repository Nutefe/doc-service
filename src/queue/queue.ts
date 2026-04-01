import { Queue, JobsOptions } from "bullmq";
import { getRedis } from "../infra/redis";
import { queueSize } from "../metrics/prometheus";
import { log } from "../utils/logger";

export type GenerateJob = {
  batchId: string;
  documentId: string;
  userId: string;
};

let queue: Queue | null = null;
let memoryMode = false;

// fallback memory queue
const mem: GenerateJob[] = [];
let memHandler: ((job: GenerateJob) => Promise<void>) | null = null;
let memRunning = 0;
let memConcurrency = 10;

export async function initQueue(redisUrl: string, concurrency: number) {
  memConcurrency = concurrency;
  try {
    const conn = await getRedis(redisUrl);
    queue = new Queue("documents", { connection: conn });
    await queue.waitUntilReady();
    memoryMode = false;
    log("info", "queue_bullmq_ready");
  } catch (e) {
    memoryMode = true;
    log("warn", "queue_memory_fallback", { err: String(e) });
  }
}

export function isMemoryMode() {
  return memoryMode;
}

export async function enqueue(job: GenerateJob) {
  if (!memoryMode && queue) {
    const opts: JobsOptions = {
      attempts: 3,
      backoff: { type: "exponential", delay: 250 },
      removeOnComplete: true,
      removeOnFail: false,
    };
    await queue.add("generateDocument", job, opts);
    await updateQueueGauge();
    return;
  }
  mem.push(job);
  drainMem();
  await updateQueueGauge();
}

export function wireMemoryProcessor(fn: (job: GenerateJob) => Promise<void>) {
  memHandler = fn;
  drainMem();
}

function drainMem() {
  while (memHandler && memRunning < memConcurrency && mem.length > 0) {
    const job = mem.shift()!;
    memRunning++;
    memHandler(job)
      .catch(() => {})
      .finally(() => {
        memRunning--;
        drainMem();
      });
  }
}

export async function getQueueSize() {
  if (!memoryMode && queue) {
    const [w, a, d] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
    ]);
    return w + a + d;
  }
  return mem.length;
}

export async function queueHealth() {
  try {
    const size = await getQueueSize();
    return { ok: true, mode: memoryMode ? "memory" : "bullmq", size };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function updateQueueGauge() {
  queueSize.set(await getQueueSize());
}

export async function closeQueue() {
  await queue?.close();
}
