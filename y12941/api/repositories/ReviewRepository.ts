import { getDb } from '../db/connection';
import { nanoid } from 'nanoid';
import type { ReviewRecord, Intent, ReviewStatus } from '../../shared/types';

interface ReviewRecordRow {
  id: string;
  conversation_id: string;
  reviewer: string;
  original_intent: Intent;
  corrected_intent: Intent;
  change_reason: string;
  reviewed_at: string;
  status: ReviewStatus;
}

function mapRowToReviewRecord(row: ReviewRecordRow): ReviewRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    reviewer: row.reviewer,
    originalIntent: row.original_intent,
    correctedIntent: row.corrected_intent,
    changeReason: row.change_reason,
    reviewedAt: row.reviewed_at,
    status: row.status
  };
}

export class ReviewRepository {
  private db = getDb();

  findByConversationId(conversationId: string): ReviewRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM review_records 
      WHERE conversation_id = ? 
      ORDER BY reviewed_at DESC
    `);
    const rows = stmt.all(conversationId) as ReviewRecordRow[];
    return rows.map(mapRowToReviewRecord);
  }

  create(data: Omit<ReviewRecord, 'id' | 'reviewedAt'>): ReviewRecord {
    const id = 'review_' + nanoid(8);
    const stmt = this.db.prepare(`
      INSERT INTO review_records
      (id, conversation_id, reviewer, original_intent, corrected_intent, change_reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.conversationId,
      data.reviewer,
      data.originalIntent,
      data.correctedIntent,
      data.changeReason,
      data.status
    );
    return this.findById(id)!;
  }

  findById(id: string): ReviewRecord | null {
    const stmt = this.db.prepare('SELECT * FROM review_records WHERE id = ?');
    const row = stmt.get(id) as ReviewRecordRow | undefined;
    return row ? mapRowToReviewRecord(row) : null;
  }

  findAll(options: { page?: number; pageSize?: number } = {}): { items: ReviewRecord[]; total: number } {
    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM review_records');
    const { count } = countStmt.get() as { count: number };

    const queryStmt = this.db.prepare(`
      SELECT * FROM review_records 
      ORDER BY reviewed_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(pageSize, offset) as ReviewRecordRow[];

    return {
      items: rows.map(mapRowToReviewRecord),
      total: count
    };
  }
}
