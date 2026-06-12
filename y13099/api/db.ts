import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../data/app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function runMigrations() {
  const existing = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('plan', 'timeline_node', 'sensor_record')"
    )
    .all();
  if (existing.length > 0) {
    console.log("[DB] Database schema already exists");
    return;
  }

  const statements = [
    `CREATE TABLE plan (
      id TEXT PRIMARY KEY,
      corridor_code TEXT NOT NULL,
      corridor_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pass','supplement','exception','withdrawn')),
      sensor_source_summary TEXT DEFAULT '',
      conclusion_summary TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE timeline_node (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('created','sensor_collect','first_review','rejudge','withdrawn','final_review')),
      title TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      sensor_record_id TEXT REFERENCES sensor_record(id),
      corridor_segment_index INTEGER,
      detail_json TEXT DEFAULT '{}'
    )`,
    `CREATE TABLE sensor_record (
      id TEXT PRIMARY KEY,
      device_code TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      raw_reading REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      corridor_segment_index INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT DEFAULT '{}'
    )`,
    `CREATE TABLE withdrawal_link (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
      withdrawal_record_id TEXT NOT NULL REFERENCES timeline_node(id) ON DELETE CASCADE,
      withdrawal_reason TEXT NOT NULL DEFAULT '',
      supplemented_material_ids_json TEXT DEFAULT '[]',
      final_conclusion_id TEXT REFERENCES conclusion(id)
    )`,
    `CREATE TABLE conclusion (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
      result TEXT NOT NULL CHECK (result IN ('pass','supplement','exception')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      action_items_json TEXT DEFAULT '[]'
    )`,
    `CREATE TABLE conclusion_basis (
      id TEXT PRIMARY KEY,
      conclusion_id TEXT NOT NULL REFERENCES conclusion(id) ON DELETE CASCADE,
      sensor_record_id TEXT NOT NULL REFERENCES sensor_record(id) ON DELETE CASCADE,
      interpretation TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE action_item (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('release','supplement')),
      description TEXT NOT NULL DEFAULT '',
      material_ref TEXT DEFAULT ''
    )`,
    `CREATE INDEX idx_plan_status ON plan(status)`,
    `CREATE INDEX idx_plan_corridor ON plan(corridor_code)`,
    `CREATE INDEX idx_timeline_plan ON timeline_node(plan_id)`,
    `CREATE INDEX idx_timeline_type ON timeline_node(type)`,
    `CREATE INDEX idx_sensor_type ON sensor_record(type)`,
    `CREATE INDEX idx_sensor_corridor ON sensor_record(corridor_segment_index)`,
    `CREATE INDEX idx_conclusion_plan ON conclusion(plan_id)`,
    `CREATE INDEX idx_conclusion_basis_conclusion ON conclusion_basis(conclusion_id)`,
    `CREATE INDEX idx_conclusion_basis_sensor ON conclusion_basis(sensor_record_id)`,
    `CREATE INDEX idx_withdrawal_plan ON withdrawal_link(plan_id)`,
    `CREATE INDEX idx_action_plan ON action_item(plan_id)`,
  ];

  const tx = db.transaction(() => {
    for (const sql of statements) {
      db.exec(sql);
    }
  });
  tx();
  console.log("[DB] Initialized database schema");
}

runMigrations();

export function jsonParse<T = unknown>(value: string | null): T {
  if (!value) return {} as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

export function jsonStringify(value: unknown): string {
  return JSON.stringify(value);
}
