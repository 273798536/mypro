import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  SeatRecord,
  GisPoint,
  MaterialAttachment,
  HistoryEntry,
  JudgmentChangeRequest,
  AttachmentUploadRequest,
  RecordStatus,
  OperationType,
} from '../../shared/types.js';
import { db as defaultDb } from '../db.js';

interface RecordFilters {
  status?: RecordStatus;
  street?: string;
  search?: string;
}

function rowToSeatRecord(row: any): SeatRecord {
  return {
    id: row.id,
    code: row.code,
    locationName: row.location_name,
    street: row.street,
    status: row.status,
    materialCompleteness: row.material_completeness,
    latestJudgment: row.latest_judgment ?? undefined,
    latestJudgmentReason: row.latest_judgment_reason ?? undefined,
    latestJudgmentAt: row.latest_judgment_at ?? undefined,
    latestJudgmentBy: row.latest_judgment_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    points: [],
    attachments: [],
  };
}

function rowToGisPoint(row: any): GisPoint {
  return {
    id: row.id,
    lng: row.lng,
    lat: row.lat,
    source: row.source,
    batchId: row.batch_id,
    importedAt: row.imported_at,
    isAbnormal: row.is_abnormal === 1,
    abnormalNote: row.abnormal_note ?? undefined,
  };
}

function rowToMaterialAttachment(row: any): MaterialAttachment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    uploadedAt: row.uploaded_at,
    batchId: row.batch_id,
    note: row.note ?? undefined,
  };
}

function rowToHistoryEntry(row: any): HistoryEntry {
  return {
    id: row.id,
    recordId: row.record_id,
    operationType: row.operation_type as OperationType,
    operator: row.operator,
    operatedAt: row.operated_at,
    beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
    afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
    note: row.note ?? undefined,
    evidence: row.evidence ?? undefined,
  };
}

export class RecordService {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? defaultDb;
  }

  getRecords(filters?: RecordFilters): SeatRecord[] {
    let sql = 'SELECT * FROM seat_record WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.street) {
      sql += ' AND street = ?';
      params.push(filters.street);
    }
    if (filters?.search) {
      sql += ' AND (location_name LIKE ? OR code LIKE ? OR street LIKE ?)';
      const like = `%${filters.search}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    const records = rows.map(rowToSeatRecord);

    for (const record of records) {
      record.points = this.getPointsForRecord(record.id);
      record.attachments = this.getAttachmentsForRecord(record.id);
    }

    return records;
  }

  getRecordById(id: string): SeatRecord | null {
    const row = this.db.prepare('SELECT * FROM seat_record WHERE id = ?').get(id) as any;
    if (!row) return null;

    const record = rowToSeatRecord(row);
    record.points = this.getPointsForRecord(id);
    record.attachments = this.getAttachmentsForRecord(id);
    return record;
  }

  private getPointsForRecord(recordId: string): GisPoint[] {
    const rows = this.db
      .prepare('SELECT * FROM gis_point WHERE record_id = ? ORDER BY imported_at ASC')
      .all(recordId) as any[];
    return rows.map(rowToGisPoint);
  }

  private getAttachmentsForRecord(recordId: string): MaterialAttachment[] {
    const rows = this.db
      .prepare('SELECT * FROM material_attachment WHERE record_id = ? ORDER BY uploaded_at ASC')
      .all(recordId) as any[];
    return rows.map(rowToMaterialAttachment);
  }

  getHistory(recordId: string): HistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM history_entry WHERE record_id = ? ORDER BY operated_at ASC')
      .all(recordId) as any[];
    return rows.map(rowToHistoryEntry);
  }

  createRecord(data: {
    code: string;
    locationName: string;
    street: string;
    status?: RecordStatus;
    materialCompleteness?: number;
    points?: Omit<GisPoint, 'id' | 'importedAt'>[];
    attachments?: Omit<MaterialAttachment, 'id' | 'uploadedAt'>[];
    operator?: string;
  }): SeatRecord {
    const now = new Date().toISOString();
    const id = uuidv4();
    const status: RecordStatus = data.status ?? 'pending';
    const materialCompleteness = data.materialCompleteness ?? 0;
    const operator = data.operator ?? '系统导入';
    const batchId = `batch-${Date.now()}`;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO seat_record (
          id, code, location_name, street, status, material_completeness,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.code,
        data.locationName,
        data.street,
        status,
        materialCompleteness,
        now,
        now,
      );

      if (data.points) {
        const insertPoint = this.db.prepare(`
          INSERT INTO gis_point (
            id, record_id, lng, lat, source, batch_id, imported_at,
            is_abnormal, abnormal_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of data.points) {
          insertPoint.run(
            uuidv4(),
            id,
            p.lng,
            p.lat,
            p.source,
            p.batchId ?? batchId,
            now,
            p.isAbnormal ? 1 : 0,
            p.abnormalNote ?? null,
          );
        }
      }

      if (data.attachments) {
        const insertAttachment = this.db.prepare(`
          INSERT INTO material_attachment (
            id, record_id, name, type, uploaded_at, batch_id, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of data.attachments) {
          insertAttachment.run(
            uuidv4(),
            id,
            a.name,
            a.type,
            now,
            a.batchId ?? batchId,
            a.note ?? null,
          );
        }
      }

      this.insertHistory(id, 'create', operator, now, null, {
        status,
        locationName: data.locationName,
        street: data.street,
        code: data.code,
      }, '创建新记录');
    });

    tx();
    const record = this.getRecordById(id);
    if (!record) throw new Error('创建记录失败');
    return record;
  }

  updateJudgment(id: string, req: JudgmentChangeRequest): SeatRecord | null {
    const record = this.getRecordById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const beforeState = {
      status: record.status,
      latestJudgment: record.latestJudgment,
      latestJudgmentReason: record.latestJudgmentReason,
    };

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE seat_record SET
          status = ?,
          latest_judgment = ?,
          latest_judgment_reason = ?,
          latest_judgment_at = ?,
          latest_judgment_by = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        req.status,
        req.status,
        req.reason,
        now,
        req.operator,
        now,
        id,
      );

      this.insertHistory(id, 'judgment_change', req.operator, now, beforeState, {
        status: req.status,
        latestJudgment: req.status,
        latestJudgmentReason: req.reason,
      }, req.reason);
    });

    tx();
    return this.getRecordById(id);
  }

  addAttachment(id: string, req: AttachmentUploadRequest): SeatRecord | null {
    const record = this.getRecordById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const batchId = `batch-${Date.now()}`;
    const operator = '补录用户';

    const tx = this.db.transaction(() => {
      const attachmentId = uuidv4();
      this.db.prepare(`
        INSERT INTO material_attachment (
          id, record_id, name, type, uploaded_at, batch_id, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        attachmentId,
        id,
        req.name,
        req.type,
        now,
        batchId,
        req.note ?? null,
      );

      if (req.gisPoints && req.gisPoints.length > 0) {
        const insertPoint = this.db.prepare(`
          INSERT INTO gis_point (
            id, record_id, lng, lat, source, batch_id, imported_at,
            is_abnormal, abnormal_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of req.gisPoints) {
          insertPoint.run(
            uuidv4(),
            id,
            p.lng,
            p.lat,
            p.source,
            p.batchId ?? batchId,
            now,
            p.isAbnormal ? 1 : 0,
            p.abnormalNote ?? null,
          );
        }
      }

      const newAttachmentsCount = record.attachments.length + 1;
      this.db.prepare('UPDATE seat_record SET updated_at = ? WHERE id = ?').run(now, id);

      this.insertHistory(id, 'attachment_add', operator, now, {
        attachmentsCount: record.attachments.length,
      }, {
        attachmentsCount: newAttachmentsCount,
        newAttachment: req.name,
      }, req.note ?? '补录附件');
    });

    tx();
    return this.getRecordById(id);
  }

  private insertHistory(
    recordId: string,
    operationType: OperationType,
    operator: string,
    operatedAt: string,
    beforeState: unknown,
    afterState: unknown,
    note?: string,
    evidence?: string,
  ): void {
    this.db.prepare(`
      INSERT INTO history_entry (
        id, record_id, operation_type, operator, operated_at,
        before_state, after_state, note, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      recordId,
      operationType,
      operator,
      operatedAt,
      beforeState !== null && beforeState !== undefined ? JSON.stringify(beforeState) : null,
      afterState !== null && afterState !== undefined ? JSON.stringify(afterState) : null,
      note ?? null,
      evidence ?? null,
    );
  }

  addExceptionDetectedHistory(
    recordId: string,
    note: string,
    beforeState?: unknown,
    afterState?: unknown,
  ): void {
    const now = new Date().toISOString();
    this.insertHistory(
      recordId,
      'exception_detected',
      '异常检测引擎',
      now,
      beforeState ?? null,
      afterState ?? null,
      note,
    );
  }
}

export const recordService = new RecordService();
export default RecordService;
