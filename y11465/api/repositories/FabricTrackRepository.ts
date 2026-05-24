import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { FabricTrack, FabricDisposition } from '../../shared/types';

export class FabricTrackRepository {
  private db = getDb();

  create(params: {
    documentId: string;
    styleCode: string;
    oldVersion: number;
    newVersion: number;
    fabricCode: string;
    disposition: FabricDisposition;
    remark?: string;
    recordedBy: string;
  }): FabricTrack {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO fabric_tracks (id, document_id, style_code, old_version, new_version, fabric_code, disposition, remark, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.documentId,
      params.styleCode,
      params.oldVersion,
      params.newVersion,
      params.fabricCode,
      params.disposition,
      params.remark || null,
      params.recordedBy,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): FabricTrack | null {
    const stmt = this.db.prepare('SELECT * FROM fabric_tracks WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByStyleCode(styleCode: string): FabricTrack[] {
    const rows = this.db.prepare(`
      SELECT * FROM fabric_tracks
      WHERE style_code = ?
      ORDER BY new_version DESC
    `).all(styleCode) as any[];
    return rows.map(row => this.mapRow(row));
  }

  findByDocumentId(documentId: string): FabricTrack[] {
    const rows = this.db.prepare(`
      SELECT * FROM fabric_tracks
      WHERE document_id = ?
      ORDER BY created_at DESC
    `).all(documentId) as any[];
    return rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): FabricTrack {
    return {
      id: row.id,
      documentId: row.document_id,
      styleCode: row.style_code,
      oldVersion: row.old_version,
      newVersion: row.new_version,
      fabricCode: row.fabric_code,
      disposition: row.disposition,
      remark: row.remark,
      recordedBy: row.recorded_by,
      createdAt: row.created_at
    };
  }
}

export default new FabricTrackRepository();
