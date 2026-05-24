import path from 'path';
import fs from 'fs';
import { getDatabase, closeDatabase, resetDatabase } from '../database/connection';

const testDbPath = path.join(process.cwd(), 'data', 'test.db');

beforeAll(() => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  getDatabase(testDbPath);
});

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
