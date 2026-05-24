import { Database, resetDatabase } from '../src/database';

export async function setupTestDatabase(): Promise<Database> {
  resetDatabase();
  const db = new Database(':memory:');
  await db.init();
  return db;
}

export async function teardownTestDatabase(db: Database): Promise<void> {
  await db.close();
  resetDatabase();
}
