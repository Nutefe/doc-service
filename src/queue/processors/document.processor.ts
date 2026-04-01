import { CircuitBreaker } from "../../utils/circuitBreaker";
import { log } from "../../utils/logger";
import { getDb } from "../../infra/mongodb";
import { generatePdfBytes } from "../../services/pdf.service";
import { savePdf } from "../../services/document.service";
import {
  documentsGeneratedTotal,
  batchProcessingDuration,
} from "../../metrics/prometheus";
import { tryFinalizeBatch } from "../../services/batch.service";
import { Document } from "../../models/document.model";
import { Batch } from "../../models/batch.model";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  halfOpenAfterMs: 5000,
});

async function callDocuSignSim(userId: string) {
  const latency = Number(process.env.DOCUSIGN_LATENCY_MS ?? "80");
  const failRate = Number(process.env.DOCUSIGN_FAIL_RATE ?? "0.02");

  await new Promise((r) => setTimeout(r, latency));
  if (Math.random() < failRate) throw new Error("docusign_error");
  return { ok: true };
}

export async function processDocument(job: {
  batchId: string;
  documentId: string;
  userId: string;
}) {
  const start = Date.now();
  const { batchId, documentId, userId } = job;

  const meta = { batchId, documentId, userId };

  await getDb()
    .collection<Document>("documents")
    .updateOne(
      { _id: documentId },
      { $set: { status: "processing", updatedAt: new Date() } },
    );

  try {
    await breaker.exec(() => callDocuSignSim(userId));

    const pdfTimeout = Number(process.env.PDF_TIMEOUT_MS ?? "5000");
    const pdfBytes = await generatePdfBytes(
      { userId, template: "cerfa_v1" },
      pdfTimeout,
    );

    const gridFsFileId = await savePdf(documentId, pdfBytes);

    await getDb()
      .collection<Document>("documents")
      .updateOne(
        { _id: documentId },
        { $set: { status: "completed", gridFsFileId, updatedAt: new Date() } },
      );

    await getDb()
      .collection<Batch>("batches")
      .updateOne(
        { _id: batchId },
        { $inc: { completed: 1 }, $set: { updatedAt: new Date() } },
      );

    documentsGeneratedTotal.inc(1);
    log("info", "document_completed", meta);
  } catch (e) {
    const err = String(e);

    await getDb()
      .collection<Document>("documents")
      .updateOne(
        { _id: documentId },
        { $set: { status: "failed", error: err, updatedAt: new Date() } },
      );

    await getDb()
      .collection<Batch>("batches")
      .updateOne(
        { _id: batchId },
        { $inc: { failed: 1 }, $set: { updatedAt: new Date() } },
      );

    log("error", "document_failed", { ...meta, err });
    throw e;
  } finally {
    batchProcessingDuration.observe((Date.now() - start) / 1000);
    await tryFinalizeBatch(batchId);
  }
}
