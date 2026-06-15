import path from 'path';
import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_PATH = path.join(DATA_DIR, 'snapshot.json');

interface ItemSnapshotPayload {
  status: string;
  currentRemark: string | null;
  updatedAt: string;
}

interface SnapshotData {
  items: Record<string, ItemSnapshotPayload>;
}

const defaultData: SnapshotData = {
  items: {}
};

let snapshotDbInstance: Low<SnapshotData> | null = null;

export async function getSnapshotDb(): Promise<Low<SnapshotData>> {
  if (!snapshotDbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(defaultData, null, 2));
    }
    const adapter = new JSONFile<SnapshotData>(SNAPSHOT_PATH);
    snapshotDbInstance = new Low(adapter, defaultData);
    await snapshotDbInstance.read();
  }
  return snapshotDbInstance;
}

export const snapshotDb = {
  getDb: getSnapshotDb
};

export async function saveItemSnapshot(
  id: string,
  payload: { status: string; currentRemark?: string | null }
): Promise<void> {
  const db = await getSnapshotDb();
  db.data.items[id] = {
    status: payload.status,
    currentRemark: payload.currentRemark ?? null,
    updatedAt: new Date().toISOString()
  };
  await db.write();
}

export async function getItemSnapshot(
  id: string
): Promise<ItemSnapshotPayload | null> {
  const db = await getSnapshotDb();
  const data = db.data.items[id];
  return data ?? null;
}
