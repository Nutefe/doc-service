import { Request, Response } from "express";
import { createBatch, getBatch } from "../../services/batch.service";
import { streamPdf } from "../../services/document.service";
import { createBatchSchema } from "../validators/documents.validators";
import { log } from "../../utils/logger";
import z from "zod";

function requestId(req: Request) {
  return (req.headers["x-request-id"] as string) || "no-request-id";
}

export async function postBatch(req: Request, res: Response) {
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error: "validation_error",
      details: z.treeifyError(parsed.error),
    });

  const batchId = await createBatch(parsed.data.userIds, requestId(req));
  log("info", "batch_created", { batchId, requestId: requestId(req) });

  res.status(202).json({ batchId });
}

export async function getBatchStatus(req: Request, res: Response) {
  const out = await getBatch(req.params.batchId as string);
  res.json(out);
}

export async function getDocumentPdf(req: Request, res: Response) {
  const s = await streamPdf(req.params.documentId as string);
  res.setHeader("content-type", "application/pdf");
  s.pipe(res);
}
