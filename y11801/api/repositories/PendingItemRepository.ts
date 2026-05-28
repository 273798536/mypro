import { BaseRepository } from './BaseRepository.js';
import type { PendingItem, PendingType } from '../../shared/types/index.js';

export class PendingItemRepository extends BaseRepository<PendingItem> {
  protected tableName = 'pending_item';

  protected toModel(row: Record<string, unknown>): PendingItem {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      type: model.type as PendingType,
      relatedRecordId: model.relatedRecordId as string,
      relatedRecordType: model.relatedRecordType as 'vehicle' | 'contract' | 'residual',
      title: model.title as string,
      description: model.description as string,
      level: model.level as 'high' | 'medium' | 'low',
      remainingDays: model.remainingDays as number | undefined,
      createdAt: model.createdAt as string,
      confirmedAt: model.confirmedAt as string | undefined,
      confirmedBy: model.confirmedBy as string | undefined,
      note: model.note as string | undefined,
      status: model.status as 'pending' | 'confirmed' | 'ignored',
    };
  }

  protected toDatabase(model: Partial<PendingItem>): Record<string, unknown> {
    return {
      id: model.id,
      type: model.type,
      related_record_id: model.relatedRecordId,
      related_record_type: model.relatedRecordType,
      title: model.title,
      description: model.description,
      level: model.level,
      remaining_days: model.remainingDays,
      status: model.status,
      confirmed_at: model.confirmedAt,
      confirmed_by: model.confirmedBy,
      note: model.note,
    };
  }

  findByType(type: PendingType): PendingItem[] {
    return this.findAll({ where: { type }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByStatus(status: 'pending' | 'confirmed' | 'ignored'): PendingItem[] {
    return this.findAll({ where: { status }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByLevel(level: 'high' | 'medium' | 'low'): PendingItem[] {
    return this.findAll({ where: { level }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByRelatedRecordId(relatedRecordId: string): PendingItem[] {
    return this.findAll({ where: { relatedRecordId }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByRelatedRecordIds(relatedRecordIds: string[]): PendingItem[] {
    if (relatedRecordIds.length === 0) return [];
    const placeholders = relatedRecordIds.map(() => '?').join(', ');
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE related_record_id IN (${placeholders})
      ORDER BY created_at DESC
    `;
    const rows = this.query(sql, ...relatedRecordIds);
    return rows.map(row => this.toModel(row));
  }

  findPending(): PendingItem[] {
    return this.findByStatus('pending');
  }

  confirm(id: string, confirmedBy: string, note?: string): PendingItem | null {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'confirmed',
          confirmed_at = CURRENT_TIMESTAMP,
          confirmed_by = ?,
          note = COALESCE(?, note)
      WHERE id = ?
    `;
    const result = this.run(sql, confirmedBy, note, id);
    if (result.changes > 0) {
      return this.findById(id);
    }
    return null;
  }

  ignore(id: string, confirmedBy: string, note?: string): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'ignored',
          confirmed_at = CURRENT_TIMESTAMP,
          confirmed_by = ?,
          note = COALESCE(?, note)
      WHERE id = ?
    `;
    const result = this.run(sql, confirmedBy, note, id);
    return result.changes > 0;
  }

  batchConfirm(ids: string[], confirmedBy: string, note?: string): number {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'confirmed',
          confirmed_at = CURRENT_TIMESTAMP,
          confirmed_by = ?,
          note = COALESCE(?, note)
      WHERE id IN (${placeholders}) AND status = 'pending'
    `;
    const result = this.run(sql, confirmedBy, note, ...ids);
    return result.changes;
  }

  getStats(): {
    total: number;
    pending: number;
    confirmed: number;
    ignored: number;
    highPriority: number;
  } {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) as ignored,
        SUM(CASE WHEN level = 'high' AND status = 'pending' THEN 1 ELSE 0 END) as high_priority
      FROM ${this.tableName}
    `;
    const result = this.queryOne(sql) as Record<string, number> | null;
    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      confirmed: result?.confirmed || 0,
      ignored: result?.ignored || 0,
      highPriority: result?.high_priority || 0,
    };
  }
}

export default PendingItemRepository;
