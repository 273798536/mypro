import { openDB, IDBPDatabase } from 'idb';
import type { Simulation } from '../types';

const DB_NAME = 'fire-simulation-db';
const DB_VERSION = 1;
const STORE_NAME = 'simulations';

let db: IDBPDatabase | null = null;

async function getDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return db;
}

export async function saveSimulation(simulation: Simulation): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, simulation);
}

export async function getSimulation(id: string): Promise<Simulation | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllSimulations(): Promise<Simulation[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteSimulation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllSimulations(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

export async function importSimulations(simulations: Simulation[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...simulations.map((sim) => tx.store.put(sim)),
    tx.done,
  ]);
}
