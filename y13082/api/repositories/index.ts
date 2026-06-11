import { db } from '../db/database.js';
import type { Batch, Point, Collision, HistoryRecord, SavedView, BatchStatus, AnomalyType, CollisionStatus } from '../../shared/types.js';

function clean<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined ? null : v;
  }
  return out as T;
}

function mapBatch(row: any): Batch {
  return {
    id: row.id,
    batchNo: row.batch_no,
    warehouseName: row.warehouse_name,
    status: row.status as BatchStatus,
    totalPoints: row.total_points,
    anomalyCount: row.anomaly_count,
    detectedAt: row.detected_at,
  };
}

function mapPoint(row: any): Point {
  return {
    id: row.id,
    batchId: row.batch_id,
    objectName: row.object_name,
    source: row.source,
    rawX: row.raw_x,
    rawY: row.raw_y,
    rawZ: row.raw_z,
    parsedX: row.parsed_x,
    parsedY: row.parsed_y,
    parsedZ: row.parsed_z,
    isDirty: row.is_dirty === 1,
    createdAt: row.created_at,
  };
}

function mapCollision(row: any): Collision {
  return {
    id: row.id,
    batchId: row.batch_id,
    type: row.type as AnomalyType,
    objectA: row.object_a ?? undefined,
    objectB: row.object_b ?? undefined,
    pointId: row.point_id ?? undefined,
    status: row.status as CollisionStatus,
    description: row.description,
    detectedAt: row.detected_at,
    rejudgedBy: row.rejudged_by ?? undefined,
    rejudgedReason: row.rejudged_reason ?? undefined,
    rejudgedAt: row.rejudged_at ?? undefined,
  };
}

function mapHistory(row: any): HistoryRecord {
  return {
    id: row.id,
    collisionId: row.collision_id,
    batchId: row.batch_id,
    operator: row.operator,
    oldStatus: row.old_status as CollisionStatus,
    newStatus: row.new_status as CollisionStatus,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function mapSavedView(row: any): SavedView {
  return {
    id: row.id,
    name: row.name,
    anomalyTypes: JSON.parse(row.anomaly_types),
    statusFilter: JSON.parse(row.status_filter),
    sortBy: row.sort_by,
    sortOrder: row.sort_order,
    cameraAngle: row.camera_angle,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export const BatchRepository = {
  findAll(status?: BatchStatus, keyword?: string): Batch[] {
    let sql = 'SELECT * FROM batches WHERE 1=1';
    const params: any[] = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (keyword && keyword.trim()) {
      sql += ' AND (batch_no LIKE ? OR warehouse_name LIKE ?)';
      const k = `%${keyword.trim()}%`;
      params.push(k, k);
    }
    sql += ' ORDER BY detected_at DESC';
    return db.prepare(sql).all(...params).map(mapBatch);
  },

  findById(id: string): Batch | null {
    const row = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
    return row ? mapBatch(row) : null;
  },

  updateStatus(id: string, status: BatchStatus): void {
    db.prepare('UPDATE batches SET status = ? WHERE id = ?').run(status, id);
  },

  updateAnomalyCount(id: string): void {
    const result = db.prepare(`
      SELECT COUNT(*) AS c FROM collisions
      WHERE batch_id = ? AND status != 'false_positive'
    `).get(id) as { c: number };
    db.prepare('UPDATE batches SET anomaly_count = ? WHERE id = ?').run(result.c, id);
  },
};

export const PointRepository = {
  findByBatchId(batchId: string): Point[] {
    return db.prepare('SELECT * FROM points WHERE batch_id = ? ORDER BY object_name').all(batchId).map(mapPoint);
  },

  findById(id: string): Point | null {
    const row = db.prepare('SELECT * FROM points WHERE id = ?').get(id);
    return row ? mapPoint(row) : null;
  },
};

export const CollisionRepository = {
  findAll(opts?: {
    batchId?: string;
    types?: AnomalyType[];
    status?: CollisionStatus[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Collision[] {
    let sql = 'SELECT * FROM collisions WHERE 1=1';
    const params: any[] = [];
    if (opts?.batchId) {
      sql += ' AND batch_id = ?';
      params.push(opts.batchId);
    }
    if (opts?.types && opts.types.length > 0) {
      sql += ` AND type IN (${opts.types.map(() => '?').join(',')})`;
      params.push(...opts.types);
    }
    if (opts?.status && opts.status.length > 0) {
      sql += ` AND status IN (${opts.status.map(() => '?').join(',')})`;
      params.push(...opts.status);
    }
    const sortBy = opts?.sortBy && ['type', 'status', 'detected_at', 'batch_id'].includes(opts.sortBy) ? opts.sortBy : 'detected_at';
    const sortOrder = opts?.sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;
    return db.prepare(sql).all(...params).map(mapCollision);
  },

  findById(id: string): Collision | null {
    const row = db.prepare('SELECT * FROM collisions WHERE id = ?').get(id);
    return row ? mapCollision(row) : null;
  },

  updateRejudge(
    id: string,
    status: CollisionStatus,
    operator: string,
    reason: string,
    rejudgedAt: string,
  ): void {
    db.prepare(
      'UPDATE collisions SET status = ?, rejudged_by = ?, rejudged_reason = ?, rejudged_at = ? WHERE id = ?',
    ).run(status, operator, reason, rejudgedAt, id);
  },
};

export const HistoryRepository = {
  findAll(batchId?: string): HistoryRecord[] {
    let sql = 'SELECT * FROM history_records';
    const params: any[] = [];
    if (batchId) {
      sql += ' WHERE batch_id = ?';
      params.push(batchId);
    }
    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params).map(mapHistory);
  },

  create(record: HistoryRecord): void {
    db.prepare(
      `INSERT INTO history_records (id, collision_id, batch_id, operator, old_status, new_status, reason, created_at)
       VALUES (@id, @collisionId, @batchId, @operator, @oldStatus, @newStatus, @reason, @createdAt)`,
    ).run(clean(record));
  },
};

export const SavedViewRepository = {
  findAll(): SavedView[] {
    return db.prepare('SELECT * FROM saved_views ORDER BY created_at DESC').all().map(mapSavedView);
  },

  findById(id: string): SavedView | null {
    const row = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
    return row ? mapSavedView(row) : null;
  },

  create(view: SavedView): void {
    db.prepare(
      `INSERT INTO saved_views (id, name, anomaly_types, status_filter, sort_by, sort_order, camera_angle, created_by, created_at)
       VALUES (@id, @name, @anomalyTypes, @statusFilter, @sortBy, @sortOrder, @cameraAngle, @createdBy, @createdAt)`,
    ).run(clean({
      ...view,
      anomalyTypes: JSON.stringify(view.anomalyTypes),
      statusFilter: JSON.stringify(view.statusFilter),
    }));
  },
};
