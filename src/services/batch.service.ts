import { getDb } from "../infra/mongodb";
import { Batch } from "../models/batch.model";
import { enqueue } from "../queue/queue";
import { Document, ObjectId } from "mongodb";

const nanoid = require("nanoid").nanoid;

export async function createBatch(userIds: string[], requestId: string) {
  const batchId = new ObjectId().toString();
  const now = new Date();

  await getDb().collection<Batch>("batches").insertOne({
    _id: batchId,
    status: "processing",
    total: userIds.length,
    completed: 0,
    failed: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    requestId,
  });

  const docs = userIds.map((userId) => ({
    _id: new ObjectId(),
    batchId,
    userId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }));

  const result = await getDb()
    .collection<Document>("documents")
    .insertMany(docs);

  console.log(`result ${JSON.stringify(result)}`);

  await Promise.all(
    docs.map((d) =>
      enqueue({ batchId, documentId: d._id.toString(), userId: d.userId }),
    ),
  );

  return batchId;
}

export async function getBatch(batchId: string) {
  const batch = await getDb()
    .collection<Batch>("batches")
    .findOne({ _id: batchId });
  if (!batch)
    throw Object.assign(new Error("batch_not_found"), { statusCode: 404 });

  const documents = await getDb()
    .collection<Document>("documents")
    .find({ batchId })
    .project({ _id: 1, userId: 1, status: 1, error: 1 })
    .toArray();

  return {
    batchId,
    status: batch.status,
    total: batch.total,
    completed: batch.completed,
    failed: batch.failed,
    documents,
  };
}

export async function tryFinalizeBatch(batchId: string) {
  const b = await getDb()
    .collection<Batch>("batches")
    .findOne({ _id: batchId });
  if (!b) return;

  if (b.completed + b.failed >= b.total) {
    const status = b.failed > 0 ? "failed" : "completed";
    await getDb()
      .collection<Batch>("batches")
      .updateOne(
        { _id: batchId },
        { $set: { status, finishedAt: new Date(), updatedAt: new Date() } },
      );
  }
}
