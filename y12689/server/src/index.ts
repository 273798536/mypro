import express from 'express';
import cors from 'cors';
import { initDatabase, isDatabaseEmpty, initDatabaseInstance, startAutoSave, stopAutoSave, getDbPath } from './db';
import { seedDatabase } from './seed';
import recordsRouter from './routes/records';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/records', recordsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function needsMigration(): Promise<boolean> {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return false;
  }
  try {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const uint8Array = new Uint8Array(fileBuffer);
    const tempDb = new SQL.Database(uint8Array);
    const result = tempDb.exec("PRAGMA table_info(normal_records)");
    tempDb.close();
    if (result.length === 0) return true;
    const columns = result[0].values.map((row: any[]) => row[1] as string);
    return !columns.includes('operator') || !columns.includes('point_count') || !columns.includes('normal_deviation') || !columns.includes('occlusion_detected');
  } catch (e) {
    return true;
  }
}

function migrateDatabase() {
  console.log('Database schema outdated, migrating...');
  const dbPath = getDbPath();
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  
  console.log('Old database removed, reinitializing...');
}

async function bootstrap() {
  const shouldMigrate = await needsMigration();
  if (shouldMigrate) {
    migrateDatabase();
  }

  await initDatabaseInstance();
  initDatabase();

  if (isDatabaseEmpty()) {
    console.log('Database is empty, seeding mock data...');
    seedDatabase();
  }

  startAutoSave(5000);

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    stopAutoSave();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    stopAutoSave();
    process.exit(0);
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
