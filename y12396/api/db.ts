import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '..', 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.resolve(dataDir, 'drum-practice.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS practice_records (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    practice_date TEXT NOT NULL,
    audio_file_name TEXT NOT NULL,
    audio_file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'conflict', 'corrected')),
    conflict_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rhythm_detections (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    detected_bpm REAL NOT NULL,
    confidence_score REAL NOT NULL,
    detection_method TEXT NOT NULL,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS speed_tiers (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    tiers TEXT NOT NULL,
    methodology TEXT NOT NULL,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS beat_markers (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    markers TEXT NOT NULL,
    analyzed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL CHECK(conflict_type IN ('audio_bpm_mismatch', 'beat_bpm_jump', 'rush_miss_simultaneous', 'bpm_jump_late')),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
    description TEXT NOT NULL,
    involved_evidence TEXT NOT NULL,
    event_order TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'flagged', 'resolved')),
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    linked_conflict_id TEXT REFERENCES conflicts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS evidence_mappings (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    audio_start_time REAL NOT NULL,
    audio_end_time REAL NOT NULL,
    audio_label TEXT NOT NULL,
    bpm_tier_index INTEGER NOT NULL,
    bpm_min REAL NOT NULL,
    bpm_max REAL NOT NULL,
    report_section TEXT NOT NULL,
    report_content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS practice_reports (
    id TEXT PRIMARY KEY,
    practice_id TEXT NOT NULL REFERENCES practice_records(id) ON DELETE CASCADE,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    methodology_note TEXT NOT NULL,
    evidence_correspondence TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'pdf'
  );

  CREATE INDEX IF NOT EXISTS idx_practice_records_status ON practice_records(status);
  CREATE INDEX IF NOT EXISTS idx_practice_records_student ON practice_records(student_name);
  CREATE INDEX IF NOT EXISTS idx_practice_records_date ON practice_records(practice_date);
  CREATE INDEX IF NOT EXISTS idx_conflicts_practice ON conflicts(practice_id);
  CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
  CREATE INDEX IF NOT EXISTS idx_corrections_practice ON corrections(practice_id);
  CREATE INDEX IF NOT EXISTS idx_evidence_mappings_practice ON evidence_mappings(practice_id);
`)

export default db
