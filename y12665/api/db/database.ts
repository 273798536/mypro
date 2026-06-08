import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const ddl = `
-- 练习主表
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_row_number INTEGER,
  source_image_name TEXT,
  source_remark TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  timeline_start_ms INTEGER NOT NULL DEFAULT 0,
  timeline_end_ms INTEGER NOT NULL DEFAULT 0,
  conclusion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_status ON exercises(status);
CREATE INDEX IF NOT EXISTS idx_exercises_created_at ON exercises(created_at);

-- 关键帧表
CREATE TABLE IF NOT EXISTS keyframes (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  timestamp_ms INTEGER NOT NULL,
  label TEXT,
  params_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_keyframes_exercise_id ON keyframes(exercise_id);

-- 设备坐标表
CREATE TABLE IF NOT EXISTS coordinates (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  label TEXT,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  source_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_coordinates_exercise_id ON coordinates(exercise_id);

-- 截图表
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  timestamp_ms INTEGER NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  section_axis TEXT,
  section_depth REAL
);

CREATE INDEX IF NOT EXISTS idx_screenshots_exercise_id ON screenshots(exercise_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_review_status ON screenshots(review_status);

-- 截图-坐标关联表（多对多）
CREATE TABLE IF NOT EXISTS screenshot_coordinates (
  screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
  coordinate_id TEXT NOT NULL REFERENCES coordinates(id) ON DELETE CASCADE,
  PRIMARY KEY (screenshot_id, coordinate_id)
);

-- 版本历史表
CREATE TABLE IF NOT EXISTS exercise_versions (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  diff_json TEXT,
  changed_by TEXT NOT NULL DEFAULT 'stage-manager',
  change_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_versions_exercise_id ON exercise_versions(exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_exercise_version ON exercise_versions(exercise_id, version_number);

-- 导出任务表
CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  format TEXT NOT NULL,
  filter_json TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
`;

db.exec(ddl);

export default db;
