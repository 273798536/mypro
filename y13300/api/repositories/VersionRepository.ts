import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { TicketVersion, TicketStatus } from '../../shared/types.js';
import { EvidenceRepository } from './EvidenceRepository.js';

interface TicketVersionRow {
  id: string;
  ticket_id: string;
  version: number;
  model_version: string | null;
  summary: string | null;
  status: TicketStatus;
  is_locked: number;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  change_note: string | null;
  created_at: string;
}

export class VersionRepository {
  private evidenceRepo: EvidenceRepository;

  constructor() {
    this.evidenceRepo = new EvidenceRepository();
  }

  private mapRow(row: TicketVersionRow): TicketVersion {
    const evidences = this.evidenceRepo.getByVersionId(row.id);
    return {
      id: row.id,
      ticketId: row.ticket_id,
      version: row.version,
      modelVersion: row.model_version ?? '',
      summary: row.summary ?? '',
      status: row.status,
      isLocked: row.is_locked === 1,
      lockedBy: row.locked_by,
      lockedAt: row.locked_at,
      evidences,
      createdAt: row.created_at,
      createdBy: row.created_by,
      changeNote: row.change_note ?? '',
    };
  }

  getById(id: string): TicketVersion | null {
    const row = db
      .prepare('SELECT * FROM ticket_versions WHERE id = ?')
      .get(id) as TicketVersionRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findById(id: string): TicketVersion | null {
    return this.getById(id);
  }

  list(): TicketVersion[] {
    const rows = db
      .prepare('SELECT * FROM ticket_versions ORDER BY ticket_id, version DESC')
      .all() as TicketVersionRow[];
    return rows.map(row => this.mapRow(row));
  }

  getByTicketIdAndVersion(ticketId: string, version: number): TicketVersion | null {
    const row = db
      .prepare('SELECT * FROM ticket_versions WHERE ticket_id = ? AND version = ?')
      .get(ticketId, version) as TicketVersionRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByTicketAndVersion(ticketId: string, version: number): TicketVersion | null {
    return this.getByTicketIdAndVersion(ticketId, version);
  }

  getLatestByTicketId(ticketId: string): TicketVersion | null {
    const row = db
      .prepare('SELECT * FROM ticket_versions WHERE ticket_id = ? ORDER BY version DESC LIMIT 1')
      .get(ticketId) as TicketVersionRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  getByTicketId(ticketId: string): TicketVersion[] {
    const rows = db
      .prepare('SELECT * FROM ticket_versions WHERE ticket_id = ? ORDER BY version DESC')
      .all(ticketId) as TicketVersionRow[];
    return rows.map(row => this.mapRow(row));
  }

  findByTicketId(ticketId: string): TicketVersion[] {
    return this.getByTicketId(ticketId);
  }

  getMaxVersion(ticketId: string): number {
    const result = db.prepare(`
      SELECT MAX(version) as max_version 
      FROM ticket_versions 
      WHERE ticket_id = ?
    `).get(ticketId) as { max_version: number | null };

    return result.max_version || 0;
  }

  exists(ticketId: string, version: number): boolean {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM ticket_versions 
      WHERE ticket_id = ? AND version = ?
    `).get(ticketId, version) as { count: number };

    return result.count > 0;
  }

  create(data: {
    id?: string;
    ticketId: string;
    version: number;
    modelVersion?: string;
    summary?: string;
    status?: TicketStatus;
    isLocked?: boolean;
    createdBy: string;
    changeNote?: string;
  }): TicketVersion {
    const id = data.id ?? uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO ticket_versions (
        id, ticket_id, version, model_version, summary, status,
        is_locked, created_by, change_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.ticketId,
      data.version,
      data.modelVersion ?? null,
      data.summary ?? null,
      data.status ?? 'pending',
      data.isLocked ? 1 : 0,
      data.createdBy,
      data.changeNote ?? null,
      now
    );
    return this.getById(id)!;
  }

  update(id: string, data: {
    modelVersion?: string;
    summary?: string;
    status?: TicketStatus;
    isLocked?: boolean;
    lockedBy?: string | null;
    lockedAt?: string | null;
    changeNote?: string;
  }): TicketVersion | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.modelVersion !== undefined) {
      fields.push('model_version = ?');
      values.push(data.modelVersion);
    }
    if (data.summary !== undefined) {
      fields.push('summary = ?');
      values.push(data.summary);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.isLocked !== undefined) {
      fields.push('is_locked = ?');
      values.push(data.isLocked ? 1 : 0);
    }
    if (data.lockedBy !== undefined) {
      fields.push('locked_by = ?');
      values.push(data.lockedBy);
    }
    if (data.lockedAt !== undefined) {
      fields.push('locked_at = ?');
      values.push(data.lockedAt);
    }
    if (data.changeNote !== undefined) {
      fields.push('change_note = ?');
      values.push(data.changeNote);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const stmt = db.prepare(`UPDATE ticket_versions SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  }

  updateLock(id: string, isLocked: boolean, lockedBy: string | null): void {
    if (isLocked) {
      db.prepare(`
        UPDATE ticket_versions 
        SET is_locked = 1, locked_by = ?, locked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(lockedBy, id);
    } else {
      db.prepare(`
        UPDATE ticket_versions 
        SET is_locked = 0, locked_by = NULL, locked_at = NULL
        WHERE id = ?
      `).run(id);
    }
  }
}
