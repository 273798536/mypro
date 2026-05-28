import { openDB, type IDBPDatabase } from "idb";
import type { Session, PartitionResult, CorrectionRecord } from "@/types";

const DB_NAME = "partition-explainer";
const DB_VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessionStore.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("results")) {
        const resultStore = db.createObjectStore("results", { keyPath: "id" });
        resultStore.createIndex("sessionId", "sessionId");
        resultStore.createIndex("timestamp", "timestamp");
      }
      if (!db.objectStoreNames.contains("corrections")) {
        const correctionStore = db.createObjectStore("corrections", {
          keyPath: "id",
        });
        correctionStore.createIndex("sessionId", "sessionId");
        correctionStore.createIndex("timestamp", "timestamp");
      }
    },
  });
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("sessions", "readwrite");
  await tx.store.put(session);
}

export async function loadAllSessions(): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex("sessions", "createdAt");
  return sessions.reverse();
}

export async function loadSession(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

export async function saveResult(result: PartitionResult): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("results", "readwrite");
  await tx.store.put(result);
}

export async function loadResultsBySession(
  sessionId: string
): Promise<PartitionResult[]> {
  const db = await getDB();
  return db.getAllFromIndex("results", "sessionId", sessionId);
}

export async function saveCorrection(correction: CorrectionRecord): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("corrections", "readwrite");
  await tx.store.put(correction);
}

export async function loadCorrectionsBySession(
  sessionId: string
): Promise<CorrectionRecord[]> {
  const db = await getDB();
  const corrections = await db.getAllFromIndex("corrections", "sessionId", sessionId);
  return corrections.sort((a, b) => a.timestamp - b.timestamp);
}
