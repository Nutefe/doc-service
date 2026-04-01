export type BatchStatus = "pending" | "processing" | "completed" | "failed";

export interface Batch {
  _id: string;
  status: BatchStatus;
  total: number;
  completed: number;
  failed: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}
