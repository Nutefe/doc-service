const { performance } = require("perf_hooks");

const API = process.env.API_URL || "http://localhost:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const userIds = Array.from({ length: 10 }, (_, i) => `user-${i + 1}`);
  const cpuStart = process.cpuUsage(); // measure at the start to exclude GC effect
  const memStart = process.memoryUsage(); // measure at the start to exclude GC effect
  const t0 = performance.now();

  const create = await fetch(`${API}/api/documents/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userIds }),
  });

  const { batchId } = await create.json();

  let last;
  while (true) {
    const s = await fetch(`${API}/api/documents/batch/${batchId}`);
    last = await s.json();
    if (last.status === "completed" || last.status === "failed") break;
    await sleep(500);
  }

  const t1 = performance.now();
  const cpu = process.cpuUsage(cpuStart);
  const memEnd = process.memoryUsage(); // measure at the end to include GC effect

  const completed = last.documents.filter(
    (d) => d.status === "completed",
  ).length;
  const durationSec = (t1 - t0) / 1000;

  const result = {
    batchId,
    status: last.status,
    durationSec,
    documents: { total: last.total, completed, failed: last.failed },
    documentsPerSec: completed / durationSec,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    memStart,
    memEnd,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
