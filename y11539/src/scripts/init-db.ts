import { exec } from '../database';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const uploadsDir = path.join(process.cwd(), 'uploads');
const exportsDir = path.join(process.cwd(), 'exports');

async function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      training_name TEXT NOT NULL,
      training_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      process_result TEXT,
      remark TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      is_sensitive INTEGER NOT NULL DEFAULT 0,
      process_result TEXT,
      process_note TEXT,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS status_transitions (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operated_by TEXT NOT NULL,
      operated_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      material_id TEXT,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS async_tasks (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      payload TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
    CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
    CREATE INDEX IF NOT EXISTS idx_materials_batch_id ON materials(batch_id);
    CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
    CREATE INDEX IF NOT EXISTS idx_status_transitions_batch_id ON status_transitions(batch_id);
    CREATE INDEX IF NOT EXISTS idx_change_history_batch_id ON change_history(batch_id);
    CREATE INDEX IF NOT EXISTS idx_async_tasks_status ON async_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_async_tasks_next_retry_at ON async_tasks(next_retry_at);
  `;

  try {
    await exec(createTablesSQL);
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

initDatabase().then(() => {
  console.log('初始化完成');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
