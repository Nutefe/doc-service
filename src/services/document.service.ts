import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { getBucket, getDb } from "../infra/mongodb";

export async function streamPdf(documentId: string) {
  const doc = await getDb()
    .collection("documents")
    .findOne({ _id: new ObjectId(documentId) });
  if (!doc)
    throw Object.assign(new Error("document_not_found"), { statusCode: 404 });
  if (!doc.gridFsFileId)
    throw Object.assign(new Error("pdf_not_ready"), { statusCode: 409 });

  return getBucket().openDownloadStream(new ObjectId(doc.gridFsFileId));
}

export async function savePdf(documentId: string, pdfBytes: Buffer) {
  const upload = getBucket().openUploadStream(`${documentId}.pdf`, {
    metadata: { documentId },
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from(pdfBytes)
      .pipe(upload)
      .on("error", reject)
      .on("finish", () => resolve());
  });

  return String(upload.id);
}
