import { Worker } from "node:worker_threads";
import path from "node:path";

const templateCache = new Map<string, { compiledAt: number }>();

function compileTemplateOnce(name: string) {
  if (!templateCache.has(name))
    templateCache.set(name, { compiledAt: Date.now() });
  return templateCache.get(name)!;
}

export async function generatePdfBytes(
  input: { userId: string; template: string },
  timeoutMs: number,
) {
  compileTemplateOnce(input.template);

  const workerPath = path.resolve(__dirname, "pdf.thread.js"); // generated from TS build
  return await new Promise<Buffer>((resolve, reject) => {
    const w = new Worker(workerPath);

    const timer = setTimeout(() => {
      w.terminate().catch(() => {});
      reject(new Error("pdf_timeout"));
    }, timeoutMs);

    w.on("message", (msg: any) => {
      clearTimeout(timer);
      void w.terminate();
      if (msg?.ok) resolve(Buffer.from(msg.bytes));
      else reject(new Error(msg?.error ?? "pdf_worker_error"));
    });

    w.on("error", (e) => {
      clearTimeout(timer);
      void w.terminate();
      reject(e);
    });

    w.postMessage(input);
  });
}
