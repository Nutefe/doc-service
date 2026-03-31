import { Db, MongoClient, GridFSBucket } from "mongodb";
import { log } from "../utils/logger";

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let bucket: GridFSBucket | null = null;

export async function initMongodb(uri: string) {
    if (db) return db;
    mongoClient = new MongoClient(uri, { maxPoolSize: 50 });
    await mongoClient.connect();
    db = mongoClient.db();
    bucket = new GridFSBucket(db, { bucketName: "pdfs" });

    // Create batches and documents collection with indexes for efficient querying
    await db.collection("batches").createIndex({ createdAt: 1 });
    await db.collection("documents").createIndex({ batchId: 1 });

    log("info", "mongo_connected");
    return db;
}

export function getDb(): Db {
    if (!db) throw new Error("mongo_not_initialized");
    return db;
}
export function getBucket(): GridFSBucket {
    if (!bucket) throw new Error("gridfs_not_initialized");
    return bucket;
}
export async function closeMongodb() {
    await mongoClient?.close();
}
export async function mongodbHealth() {
    try {
        const r = await getDb().command({ ping: 1 });
        return { ok: r.ok === 1 };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}
