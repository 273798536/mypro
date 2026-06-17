import db from '../db.js';
import type { ChangeLog, FeedbackNote, RampStatus, Source } from '../../shared/types.js';

interface ChangeLogRow {
  id: string;
  ramp_id: string;
  item_id: string | null;
  source: Source;
  previous_status: RampStatus | null;
  new_status: RampStatus;
  note: string | null;
  affected_summary: string | null;
  operator: string;
  created_at: string;
}

export function insertChangeLog(log: {
  id: string;
  rampId: string;
  itemId: string | null;
  source: Source;
  previousStatus: RampStatus | null;
  newStatus: RampStatus;
  note: string;
  affectedSummary: string;
  operator: string;
  createdAt: string;
}): void {
  db.prepare(
    `INSERT INTO change_logs (id, ramp_id, item_id, source, previous_status, new_status, note, affected_summary, operator, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    log.id,
    log.rampId,
    log.itemId,
    log.source,
    log.previousStatus,
    log.newStatus,
    log.note,
    log.affectedSummary,
    log.operator,
    log.createdAt,
  );
}

export function listChangeLogs(rampId: string): ChangeLog[] {
  const rows = db
    .prepare('SELECT * FROM change_logs WHERE ramp_id = ? ORDER BY created_at DESC')
    .all(rampId) as ChangeLogRow[];
  return rows.map((r) => ({
    id: r.id,
    rampId: r.ramp_id,
    itemId: r.item_id,
    source: r.source,
    previousStatus: r.previous_status,
    newStatus: r.new_status,
    note: r.note ?? '',
    affectedSummary: r.affected_summary ?? '',
    operator: r.operator,
    createdAt: r.created_at,
  }));
}

export function latestChangeLog(rampId: string): ChangeLogRow | undefined {
  return db
    .prepare(
      'SELECT * FROM change_logs WHERE ramp_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(rampId) as ChangeLogRow | undefined;
}

// ---- feedback notes ----
interface FeedbackRow {
  id: string;
  content: string;
  is_grayscale: number;
  affects_ramps: string | null;
  created_at: string;
}

export function insertFeedback(note: {
  id: string;
  content: string;
  isGrayscale: boolean;
  affectsRamps: string[];
  createdAt: string;
}): void {
  db.prepare(
    `INSERT INTO feedback_notes (id, content, is_grayscale, affects_ramps, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    note.id,
    note.content,
    note.isGrayscale ? 1 : 0,
    JSON.stringify(note.affectsRamps),
    note.createdAt,
  );
}

export function listFeedback(rampId: string): FeedbackNote[] {
  const rows = db
    .prepare('SELECT * FROM feedback_notes ORDER BY created_at DESC')
    .all() as FeedbackRow[];
  return rows
    .filter((r) => {
      if (!r.affects_ramps) return false;
      const arr = JSON.parse(r.affects_ramps) as string[];
      return arr.includes(rampId);
    })
    .map((r) => ({
      id: r.id,
      content: r.content,
      isGrayscale: Boolean(r.is_grayscale),
      affectsRamps: r.affects_ramps ? (JSON.parse(r.affects_ramps) as string[]) : [],
      createdAt: r.created_at,
    }));
}
