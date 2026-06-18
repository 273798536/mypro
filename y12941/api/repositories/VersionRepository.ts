import { getDb } from '../db/connection.ts';
import { nanoid } from 'nanoid';
import type { VersionRecord, VersionType, Intent, VersionDiff } from '../../shared/types.ts';

interface VersionRecordRow {
  id: string;
  conversation_id: string;
  version_type: VersionType;
  intent: Intent;
  confidence: number;
  remark: string | null;
  operator: string;
  prompt_version_id: string | null;
  training_sample_id: string | null;
  created_at: string;
  parent_version_id: string | null;
}

function mapRowToVersionRecord(row: VersionRecordRow): VersionRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    versionType: row.version_type,
    intent: row.intent,
    confidence: row.confidence,
    remark: row.remark || undefined,
    operator: row.operator,
    promptVersionId: row.prompt_version_id || undefined,
    trainingSampleId: row.training_sample_id || undefined,
    createdAt: row.created_at,
    parentVersionId: row.parent_version_id || undefined
  };
}

export class VersionRepository {
  private db = getDb();

  findByConversationId(conversationId: string): VersionRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM version_records 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId) as VersionRecordRow[];
    return rows.map(mapRowToVersionRecord);
  }

  findById(id: string): VersionRecord | null {
    const stmt = this.db.prepare('SELECT * FROM version_records WHERE id = ?');
    const row = stmt.get(id) as VersionRecordRow | undefined;
    return row ? mapRowToVersionRecord(row) : null;
  }

  create(data: Omit<VersionRecord, 'id' | 'createdAt'>): VersionRecord {
    const id = 'ver_' + nanoid(8);
    const stmt = this.db.prepare(`
      INSERT INTO version_records
      (id, conversation_id, version_type, intent, confidence, remark, operator,
       prompt_version_id, training_sample_id, parent_version_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      data.conversationId,
      data.versionType,
      data.intent,
      data.confidence,
      data.remark || null,
      data.operator,
      data.promptVersionId || null,
      data.trainingSampleId || null,
      data.parentVersionId || null
    );
    return this.findById(id)!;
  }

  compareVersions(version1Id: string, version2Id: string): VersionDiff[] {
    const v1 = this.findById(version1Id);
    const v2 = this.findById(version2Id);

    if (!v1 || !v2) {
      return [];
    }

    const diffs: VersionDiff[] = [];
    const fields: (keyof VersionRecord)[] = ['intent', 'confidence', 'remark', 'operator'];

    for (const field of fields) {
      const oldValue = v1[field] ?? '';
      const newValue = v2[field] ?? '';
      diffs.push({
        field,
        oldValue: String(oldValue),
        newValue: String(newValue),
        changed: oldValue !== newValue
      });
    }

    return diffs;
  }

  getLatestVersion(conversationId: string): VersionRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM version_records 
      WHERE conversation_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const row = stmt.get(conversationId) as VersionRecordRow | undefined;
    return row ? mapRowToVersionRecord(row) : null;
  }
}
