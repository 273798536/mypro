import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  ExceptionItem,
  ExceptionType,
  ExceptionStatus,
  SeatRecord,
  GisPoint,
} from '../../shared/types.js';
import { db as defaultDb } from '../db.js';
import { recordService } from './RecordService.js';

const STREET_BOUNDS: Record<string, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {
  '和平里街道': { minLng: 116.410, maxLng: 116.435, minLat: 39.945, maxLat: 39.970 },
  '东华门街道': { minLng: 116.395, maxLng: 116.425, minLat: 39.905, maxLat: 39.935 },
  '西长安街街道': { minLng: 116.355, maxLng: 116.395, minLat: 39.900, maxLat: 39.920 },
  '景山街道': { minLng: 116.385, maxLng: 116.420, minLat: 39.915, maxLat: 39.940 },
  '朝阳门街道': { minLng: 116.415, maxLng: 116.450, minLat: 39.915, maxLat: 39.940 },
};

function haversineDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function rowToExceptionItem(row: any): ExceptionItem {
  return {
    id: row.id,
    type: row.type as ExceptionType,
    relatedRecordIds: JSON.parse(row.related_record_ids),
    detectedAt: row.detected_at,
    status: row.status as ExceptionStatus,
    description: row.description,
    comparisonData: row.comparison_data ? JSON.parse(row.comparison_data) : undefined,
    resolvedNote: row.resolved_note ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export class ExceptionDetectionService {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? defaultDb;
  }

  getAllExceptions(): ExceptionItem[] {
    const rows = this.db
      .prepare('SELECT * FROM exception_item ORDER BY detected_at DESC')
      .all() as any[];
    return rows.map(rowToExceptionItem);
  }

  updateExceptionStatus(
    id: string,
    status: ExceptionStatus,
    note?: string,
  ): ExceptionItem | null {
    const existing = this.db.prepare('SELECT * FROM exception_item WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const now = new Date().toISOString();
    const resolvedAt = status === 'resolved' ? now : existing.resolved_at;

    this.db.prepare(`
      UPDATE exception_item SET
        status = ?,
        resolved_note = ?,
        resolved_at = ?
      WHERE id = ?
    `).run(
      status,
      note ?? existing.resolved_note,
      resolvedAt,
      id,
    );

    const updated = this.db.prepare('SELECT * FROM exception_item WHERE id = ?').get(id) as any;
    return rowToExceptionItem(updated);
  }

  detectExceptionsForRecord(recordId: string): ExceptionItem[] {
    const record = recordService.getRecordById(recordId);
    if (!record) return [];

    const detected: ExceptionItem[] = [];

    const coordOffset = this.detectCoordinateOffset(record);
    if (coordOffset) detected.push(coordOffset);

    const dupLocation = this.detectDuplicateLocation(record);
    if (dupLocation) detected.push(dupLocation);

    const materialConflict = this.detectMaterialConflict(record);
    if (materialConflict) detected.push(materialConflict);

    const lateAttach = this.detectLateAttachment(record);
    if (lateAttach) detected.push(lateAttach);

    for (const exc of detected) {
      this.saveException(exc);
      recordService.addExceptionDetectedHistory(
        recordId,
        exc.description,
        { status: record.status },
        exc.type === 'duplicate_location' ? { status: 'suspected_duplicate' } : { status: record.status },
      );

      if (exc.type === 'duplicate_location') {
        this.db
          .prepare("UPDATE seat_record SET status = 'suspected_duplicate', updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), recordId);
      }
    }

    return detected;
  }

  private detectCoordinateOffset(record: SeatRecord): ExceptionItem | null {
    const bounds = STREET_BOUNDS[record.street];
    if (!bounds) return null;

    const offsetPoints: GisPoint[] = record.points.filter(
      (p) =>
        p.lng < bounds.minLng ||
        p.lng > bounds.maxLng ||
        p.lat < bounds.minLat ||
        p.lat > bounds.maxLat,
    );

    if (offsetPoints.length === 0) return null;

    const centerLng = record.points.reduce((s, p) => s + p.lng, 0) / record.points.length;
    const centerLat = record.points.reduce((s, p) => s + p.lat, 0) / record.points.length;

    return {
      id: uuidv4(),
      type: 'coordinate_offset',
      relatedRecordIds: [record.id],
      detectedAt: new Date().toISOString(),
      status: 'open',
      description: `坐标偏移：${record.locationName}的${offsetPoints.length}个GIS点位超出${record.street}基准范围`,
      comparisonData: {
        before: {
          street: record.street,
          expectedBounds: bounds,
        },
        after: {
          centerLng,
          centerLat,
          offsetPoints: offsetPoints.map((p) => ({
            id: p.id,
            lng: p.lng,
            lat: p.lat,
            abnormalNote: p.abnormalNote,
          })),
        },
      },
    };
  }

  private detectDuplicateLocation(record: SeatRecord): ExceptionItem | null {
    const allRecords = recordService.getRecords();
    const others = allRecords.filter((r) => r.id !== record.id && r.street === record.street);

    if (others.length === 0 || record.points.length === 0) return null;

    const recCenterLng = record.points.reduce((s, p) => s + p.lng, 0) / record.points.length;
    const recCenterLat = record.points.reduce((s, p) => s + p.lat, 0) / record.points.length;

    for (const other of others) {
      if (other.points.length === 0) continue;
      const otherCenterLng = other.points.reduce((s, p) => s + p.lng, 0) / other.points.length;
      const otherCenterLat = other.points.reduce((s, p) => s + p.lat, 0) / other.points.length;

      const distance = haversineDistance(recCenterLng, recCenterLat, otherCenterLng, otherCenterLat);

      if (distance < 50 && record.locationName !== other.locationName) {
        const existing = this.db
          .prepare(
            `SELECT * FROM exception_item 
             WHERE type = 'duplicate_location' 
             AND related_record_ids LIKE ? 
             AND related_record_ids LIKE ?`,
          )
          .get(`%${record.id}%`, `%${other.id}%`);
        if (existing) continue;

        return {
          id: uuidv4(),
          type: 'duplicate_location',
          relatedRecordIds: [record.id, other.id],
          detectedAt: new Date().toISOString(),
          status: 'open',
          description: `疑似同地异名："${record.locationName}"与"${other.locationName}"坐标距离仅约${Math.round(distance)}米，可能为同一地点`,
          comparisonData: {
            before: {
              id: record.id,
              locationName: record.locationName,
              lng: recCenterLng,
              lat: recCenterLat,
            },
            after: {
              id: other.id,
              locationName: other.locationName,
              lng: otherCenterLng,
              lat: otherCenterLat,
            },
            changedFields: ['locationName'],
            distanceMeters: Math.round(distance),
          },
        };
      }
    }

    return null;
  }

  private detectMaterialConflict(record: SeatRecord): ExceptionItem | null {
    if (record.attachments.length < 2) return null;

    const sources = new Set(record.attachments.map((a) => a.batchId));
    if (sources.size < 2) return null;

    const byBatch: Record<string, number> = {};
    for (const a of record.attachments) {
      byBatch[a.batchId] = (byBatch[a.batchId] || 0) + 1;
    }

    return {
      id: uuidv4(),
      type: 'material_conflict',
      relatedRecordIds: [record.id],
      detectedAt: new Date().toISOString(),
      status: 'open',
      description: `材料冲突：${record.locationName}存在来自${sources.size}个不同批次的材料，请核对数据一致性`,
      comparisonData: {
        before: { attachmentsCount: record.attachments.length },
        after: { batchDistribution: byBatch },
      },
    };
  }

  private detectLateAttachment(record: SeatRecord): ExceptionItem | null {
    if (record.attachments.length < 2) return null;

    const createdAt = new Date(record.createdAt).getTime();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const lateAttachments = record.attachments.filter((a) => {
      const uploadedAt = new Date(a.uploadedAt).getTime();
      return uploadedAt - createdAt > ONE_DAY;
    });

    if (lateAttachments.length === 0) return null;

    return {
      id: uuidv4(),
      type: 'late_attachment',
      relatedRecordIds: [record.id],
      detectedAt: new Date().toISOString(),
      status: 'open',
      description: `晚到附件：${record.locationName}有${lateAttachments.length}个附件在记录创建24小时后补录，需确认完整性`,
      comparisonData: {
        before: { createdAt: record.createdAt },
        after: {
          lateAttachments: lateAttachments.map((a) => ({
            name: a.name,
            uploadedAt: a.uploadedAt,
            batchId: a.batchId,
          })),
        },
      },
    };
  }

  private saveException(exc: ExceptionItem): void {
    this.db.prepare(`
      INSERT INTO exception_item (
        id, type, related_record_ids, detected_at, status, description,
        comparison_data, resolved_note, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exc.id,
      exc.type,
      JSON.stringify(exc.relatedRecordIds),
      exc.detectedAt,
      exc.status,
      exc.description,
      exc.comparisonData ? JSON.stringify(exc.comparisonData) : null,
      exc.resolvedNote ?? null,
      exc.resolvedAt ?? null,
    );
  }
}

export const exceptionDetectionService = new ExceptionDetectionService();
export default ExceptionDetectionService;
