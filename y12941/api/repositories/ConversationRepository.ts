import { getDb } from '../db/connection';
import type { Conversation, RiskLevel, MaterialSource, Intent } from '../../shared/types';

interface ConversationRow {
  id: string;
  session_id: string;
  customer_text: string;
  robot_text: string | null;
  full_context: string | null;
  truncated: number;
  truncation_reason: string | null;
  source_file: string;
  source_row: number;
  source_type: MaterialSource;
  original_annotation: Intent;
  ai_prediction: Intent;
  ai_confidence: number;
  risk_level: RiskLevel;
  drift_score: number;
  batch_id: string;
  created_at: string;
  updated_at: string;
}

function mapRowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    sessionId: row.session_id,
    customerText: row.customer_text,
    robotText: row.robot_text || undefined,
    fullContext: row.full_context || undefined,
    truncated: row.truncated === 1,
    truncationReason: row.truncation_reason || undefined,
    sourceFile: row.source_file,
    sourceRow: row.source_row,
    sourceType: row.source_type,
    originalAnnotation: row.original_annotation,
    aiPrediction: row.ai_prediction,
    aiConfidence: row.ai_confidence,
    riskLevel: row.risk_level,
    driftScore: row.drift_score,
    batchId: row.batch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface ConversationQueryOptions {
  page?: number;
  pageSize?: number;
  riskLevel?: RiskLevel;
  sourceType?: MaterialSource;
  batchId?: string;
  hasDrift?: boolean;
  search?: string;
}

export interface ConversationListResult {
  items: Conversation[];
  total: number;
  page: number;
  pageSize: number;
}

export class ConversationRepository {
  private db = getDb();

  findAll(options: ConversationQueryOptions = {}): ConversationListResult {
    const {
      page = 1,
      pageSize = 20,
      riskLevel,
      sourceType,
      batchId,
      hasDrift,
      search
    } = options;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (riskLevel) {
      whereClauses.push('risk_level = ?');
      params.push(riskLevel);
    }

    if (sourceType) {
      whereClauses.push('source_type = ?');
      params.push(sourceType);
    }

    if (batchId) {
      whereClauses.push('batch_id = ?');
      params.push(batchId);
    }

    if (hasDrift !== undefined) {
      if (hasDrift) {
        whereClauses.push('drift_score > 0');
      } else {
        whereClauses.push('drift_score = 0');
      }
    }

    if (search) {
      whereClauses.push('(customer_text LIKE ? OR session_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM conversations ${whereSql}
    `);
    const { count } = countStmt.get(...params) as { count: number };

    const offset = (page - 1) * pageSize;
    const queryStmt = this.db.prepare(`
      SELECT * FROM conversations ${whereSql}
      ORDER BY risk_level IN ('high', 'medium') DESC, drift_score DESC, created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(...params, pageSize, offset) as ConversationRow[];

    return {
      items: rows.map(mapRowToConversation),
      total: count,
      page,
      pageSize
    };
  }

  findById(id: string): Conversation | null {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as ConversationRow | undefined;
    return row ? mapRowToConversation(row) : null;
  }

  update(id: string, data: Partial<Conversation>): void {
    const fields: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (data.aiPrediction !== undefined) {
      fields.push('ai_prediction = ?');
      params.push(data.aiPrediction);
    }
    if (data.aiConfidence !== undefined) {
      fields.push('ai_confidence = ?');
      params.push(data.aiConfidence);
    }
    if (data.riskLevel !== undefined) {
      fields.push('risk_level = ?');
      params.push(data.riskLevel);
    }
    if (data.driftScore !== undefined) {
      fields.push('drift_score = ?');
      params.push(data.driftScore);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE conversations SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...params);
  }

  countByRiskLevel(): Record<RiskLevel, number> {
    const stmt = this.db.prepare(`
      SELECT risk_level, COUNT(*) as count 
      FROM conversations 
      GROUP BY risk_level
    `);
    const rows = stmt.all() as { risk_level: RiskLevel; count: number }[];
    
    const result: Record<RiskLevel, number> = {
      high: 0,
      medium: 0,
      low: 0,
      normal: 0
    };
    
    for (const row of rows) {
      result[row.risk_level] = row.count;
    }
    
    return result;
  }

  countBySourceType(): Record<MaterialSource, number> {
    const stmt = this.db.prepare(`
      SELECT source_type, COUNT(*) as count 
      FROM conversations 
      GROUP BY source_type
    `);
    const rows = stmt.all() as { source_type: MaterialSource; count: number }[];
    
    const result: Record<MaterialSource, number> = {
      annotation_record: 0,
      segmentation_list: 0,
      training_sample: 0
    };
    
    for (const row of rows) {
      result[row.source_type] = row.count;
    }
    
    return result;
  }

  countByIntent(): Record<Intent, number> {
    const stmt = this.db.prepare(`
      SELECT ai_prediction as intent, COUNT(*) as count 
      FROM conversations 
      GROUP BY ai_prediction
    `);
    const rows = stmt.all() as { intent: Intent; count: number }[];
    
    const result: Record<Intent, number> = {
      refund: 0,
      exchange: 0,
      complaint: 0,
      inquiry: 0,
      technical_support: 0,
      other: 0
    };
    
    for (const row of rows) {
      result[row.intent] = row.count;
    }
    
    return result;
  }

  getDriftRate(): number {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN drift_score > 0 THEN 1 ELSE 0 END) as drifted
      FROM conversations
    `);
    const row = stmt.get() as { total: number; drifted: number };
    return row.total > 0 ? row.drifted / row.total : 0;
  }

  getPendingReviewCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM conversations 
      WHERE risk_level IN ('high', 'medium', 'low')
    `);
    const { count } = stmt.get() as { count: number };
    return count;
  }

  getReviewedTodayCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM review_records
      WHERE DATE(reviewed_at) = DATE('now')
    `);
    const { count } = stmt.get() as { count: number };
    return count;
  }

  getTotalCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM conversations');
    const { count } = stmt.get() as { count: number };
    return count;
  }
}
