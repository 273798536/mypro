import crypto from 'crypto';
import { db } from '../lib/db';
import type { CommunityFeedback } from '../../shared/types';

function rowToFeedback(row: any): CommunityFeedback {
  return {
    id: row.id,
    itemId: row.item_id,
    originalText: row.original_text,
    mergedText: row.merged_text,
    submittedBy: row.submitted_by,
    createdAt: row.created_at
  };
}

export interface CreateFeedbackInput {
  itemId: string;
  originalText: string;
  mergedText?: string | null;
  submittedBy?: string | null;
}

export function createFeedback(input: CreateFeedbackInput): CommunityFeedback {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO community_feedback (id, item_id, original_text, merged_text, submitted_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    input.itemId,
    input.originalText,
    input.mergedText ?? null,
    input.submittedBy ?? null,
    now
  );
  const row = db.prepare('SELECT * FROM community_feedback WHERE id = ?').get(id);
  return rowToFeedback(row);
}

export function listFeedbacksByItemId(itemId: string): CommunityFeedback[] {
  const rows = db.prepare(`
    SELECT * FROM community_feedback WHERE item_id = ? ORDER BY created_at DESC
  `).all(itemId);
  return rows.map(rowToFeedback);
}
