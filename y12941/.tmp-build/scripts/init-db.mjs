import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// api/db/connection.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DB_DIR = path.join(__dirname, "..", "..", "data");
var DB_PATH = path.join(DB_DIR, "intent_drift.db");
var MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
var dbInstance = null;
function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
  }
  return dbInstance;
}
function runMigrations() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const version = file.replace(".sql", "");
    const row = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (!row) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
      console.log(`Migration applied: ${version}`);
    }
  }
}
function initDatabase() {
  runMigrations();
  console.log("Database initialized successfully");
}

// scripts/init-db.ts
function seedPromptVersions() {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO prompt_versions (id, version, content, description, effective_from, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(
    "pv_001",
    "v1.0.0",
    "\u4F60\u662F\u4E00\u4E2A\u5BA2\u670D\u673A\u5668\u4EBA\uFF0C\u8BF7\u8BC6\u522B\u7528\u6237\u610F\u56FE\uFF0C\u4ECE\u4EE5\u4E0B\u9009\u9879\u4E2D\u9009\u62E9\uFF1A\u9000\u6B3E\u3001\u6362\u8D27\u3001\u54A8\u8BE2\u3001\u6280\u672F\u652F\u6301\u3001\u5176\u4ED6",
    "\u521D\u59CB\u7248\u672C\uFF0C\u57FA\u7840\u610F\u56FE\u5206\u7C7B",
    "2026-01-01 00:00:00",
    0,
    "system"
  );
  insertStmt.run(
    "pv_002",
    "v1.1.0",
    "\u4F60\u662F\u4E00\u4E2A\u5BA2\u670D\u673A\u5668\u4EBA\uFF0C\u8BF7\u8BC6\u522B\u7528\u6237\u610F\u56FE\uFF0C\u4ECE\u4EE5\u4E0B\u9009\u9879\u4E2D\u9009\u62E9\uFF1A\u9000\u6B3E\u7533\u8BF7\u3001\u6362\u8D27\u7533\u8BF7\u3001\u6295\u8BC9\u3001\u54A8\u8BE2\u3001\u6280\u672F\u652F\u6301\u3001\u5176\u4ED6\u3002\u8BF7\u6839\u636E\u4E0A\u4E0B\u6587\u5224\u65AD\u7528\u6237\u7684\u771F\u5B9E\u9700\u6C42\u3002",
    "\u4F18\u5316\u610F\u56FE\u5206\u7C7B\u63CF\u8FF0\uFF0C\u589E\u52A0\u6295\u8BC9\u7C7B\u522B",
    "2026-03-15 00:00:00",
    0,
    "engineer_li"
  );
  insertStmt.run(
    "pv_003",
    "v2.0.0",
    "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u7535\u5546\u5BA2\u670D\u673A\u5668\u4EBA\uFF0C\u8BF7\u6839\u636E\u5BF9\u8BDD\u4E0A\u4E0B\u6587\u8BC6\u522B\u7528\u6237\u771F\u5B9E\u610F\u56FE\u3002\u53EF\u9009\u610F\u56FE\u5305\u62EC\uFF1A\u9000\u6B3E\u7533\u8BF7\u3001\u6362\u8D27\u7533\u8BF7\u3001\u6295\u8BC9\u3001\u54A8\u8BE2\u3001\u6280\u672F\u652F\u6301\u3001\u5176\u4ED6\u3002\u8BF7\u7279\u522B\u6CE8\u610F\u7528\u6237\u53EF\u80FD\u9690\u542B\u7684\u62B1\u6028\u60C5\u7EEA\u548C\u672A\u660E\u786E\u8868\u8FBE\u7684\u771F\u5B9E\u9700\u6C42\u3002",
    "\u5927\u7248\u672C\u5347\u7EA7\uFF0C\u589E\u52A0\u4E0A\u4E0B\u6587\u7406\u89E3\u80FD\u529B\u548C\u60C5\u7EEA\u8BC6\u522B",
    "2026-06-01 00:00:00",
    1,
    "engineer_wang"
  );
  console.log("Prompt versions seeded");
}
function seedMaterialBatches() {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO material_batches (id, name, source_type, file_name, total_records, processed_records, error_records, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(
    "batch_001",
    "6\u6708\u4E0A\u65EC\u6807\u6CE8\u8BB0\u5F55",
    "annotation_record",
    "annotations_20260601_0610.xlsx",
    156,
    156,
    3,
    "completed"
  );
  insertStmt.run(
    "batch_002",
    "\u4E34\u65F6\u8865\u5F55\u5207\u5206\u6E05\u5355",
    "segmentation_list",
    "segmentation_temp_20260612.csv",
    89,
    89,
    8,
    "completed"
  );
  insertStmt.run(
    "batch_003",
    "\u5386\u53F2\u8BAD\u7EC3\u6837\u672C(\u5E26\u65E7\u5907\u6CE8)",
    "training_sample",
    "training_samples_with_remarks_202605.json",
    234,
    234,
    12,
    "completed"
  );
  console.log("Material batches seeded");
}
async function main() {
  console.log("Initializing database...");
  initDatabase();
  console.log("Seeding initial data...");
  seedPromptVersions();
  seedMaterialBatches();
  console.log("Database initialization complete!");
}
main().catch(console.error);
