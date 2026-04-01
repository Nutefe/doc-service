export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export interface Document {
  _id: string;
  batchId: string;
  userId: string;
  status: DocumentStatus;
  error?: string;
  gridFsFileId?: string;
  createdAt: Date;
  updatedAt: Date;
}
