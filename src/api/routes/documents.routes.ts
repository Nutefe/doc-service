import { Router } from "express";
import {
  getBatchStatus,
  getDocumentPdf,
  postBatch,
} from "../controllers/documents.controller";

export function documentsRoutes() {
  const r = Router();
  r.post(
    "/api/documents/batch",
    (req, res, next) => void postBatch(req, res).catch(next),
  );
  r.get(
    "/api/documents/batch/:batchId",
    (req, res, next) => void getBatchStatus(req, res).catch(next),
  );
  r.get(
    "/api/documents/:documentId",
    (req, res, next) => void getDocumentPdf(req, res).catch(next),
  );
  return r;
}
