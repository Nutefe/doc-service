import { parentPort } from "node:worker_threads";

function makeFakePdf(userId: string, template: string) {
  const content = `User: ${userId}\nTemplate: ${template}\nTS: ${new Date().toISOString()}\n`;
  return Buffer.from(`%PDF-1.4\n% Fake\n${content}\n%%EOF\n`, "utf8");
}

parentPort!.on("message", (msg: any) => {
  try {
    const buf = makeFakePdf(msg.userId, msg.template);
    parentPort!.postMessage({ ok: true, bytes: buf });
  } catch (e) {
    parentPort!.postMessage({ ok: false, error: String(e) });
  }
});
