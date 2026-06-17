import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { Evidence, EvidenceSource } from '../../shared/types.js';

interface EvidenceRow {
  id: string;
  version_id: string;
  ticket_id: string;
  content: string;
  source: EvidenceSource;
  is_sample_leak: number;
  import_batch: string;
  created_at: string;
}

export class EvidenceRepository {
  private mapRow(row: EvidenceRow): Evidence {
    return {
      id: row.id,
      versionId: row.version_id,
      ticketId: row.ticket_id,
      content: row.content,
      source: row.source,
      isSampleLeak: row.is_sample_leak === 1,
      importBatch: row.import_batch,
      createdAt: row.created_at,
    };
  }

  getById(id: string): Evidence | null {
    const row = db.prepare('SELECT * FROM evidences WHERE id = ?').get(id) as EvidenceRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findById(id: string): Evidence | null {
    return this.getById(id);
  }

  list(): Evidence[] {
    const rows = db.prepare('SELECT * FROM evidences ORDER BY created_at DESC').all() as EvidenceRow[];
    return rows.map(row => this.mapRow(row));
  }

  getByVersionId(versionId: string): Evidence[] {
    const rows = db
      .prepare('SELECT * FROM evidences WHERE version_id = ? ORDER BY created_at')
      .all(versionId) as EvidenceRow[];
    return rows.map(row => this.mapRow(row));
  }

  findByVersionId(versionId: string): Evidence[] {
    return this.getByVersionId(versionId);
  }

  getByTicketId(ticketId: string): Evidence[] {
    const rows = db
      .prepare('SELECT * FROM evidences WHERE ticket_id = ? ORDER BY created_at DESC')
      .all(ticketId) as EvidenceRow[];
    return rows.map(row => this.mapRow(row));
  }

  findByTicketId(ticketId: string): Evidence[] {
    return this.getByTicketId(ticketId);
  }

  hasSampleLeak(versionId: string): boolean {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM evidences 
      WHERE version_id = ? AND is_sample_leak = 1
    `).get(versionId) as { count: number };

    return result.count > 0;
  }

  create(data: {
    id?: string;
    versionId: string;
    ticketId: string;
    content: string;
    source?: EvidenceSource;
    isSampleLeak?: boolean;
    importBatch: string;
  }): Evidence {
    const id = data.id ?? uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO evidences (
        id, version_id, ticket_id, content, source,
        is_sample_leak, import_batch, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.versionId,
      data.ticketId,
      data.content,
      data.source ?? 'import',
      data.isSampleLeak ? 1 : 0,
      data.importBatch,
      now
    );
    return this.getById(id)!;
  }

  bulkCreate(evidences: Array<{
    id?: string;
    versionId: string;
    ticketId: string;
    content: string;
    source?: EvidenceSource;
    isSampleLeak?: boolean;
    importBatch: string;
  }>): Evidence[] {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO evidences (
        id, version_id, ticket_id, content, source,
        is_sample_leak, import_batch, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdEvidences: Evidence[] = [];

    for (const data of evidences) {
      const id = data.id ?? uuidv4();
      stmt.run(
        id,
        data.versionId,
        data.ticketId,
        data.content,
        data.source ?? 'import',
        data.isSampleLeak ? 1 : 0,
        data.importBatch,
        now
      );
      createdEvidences.push(this.getById(id)!);
    }

    return createdEvidences;
  }

  update(id: string, data: {
    content?: string;
    source?: EvidenceSource;
    isSampleLeak?: boolean;
  }): Evidence | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.source !== undefined) {
      fields.push('source = ?');
      values.push(data.source);
    }
    if (data.isSampleLeak !== undefined) {
      fields.push('is_sample_leak = ?');
      values.push(data.isSampleLeak ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const stmt = db.prepare(`UPDATE evidences SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM evidences WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteByVersionId(versionId: string): number {
    const result = db.prepare('DELETE FROM evidences WHERE version_id = ?').run(versionId);
    return result.changes;
  }
}
