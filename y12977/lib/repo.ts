import { getDb } from "./db";
import type {
  ScanBatch,
  BackupRecord,
  DirtyRow,
  DirtyRowStatus,
  ReviewLog,
  SlowQuery,
  ExportLog,
  DirtyRowCategory,
} from "./types";
import crypto from "crypto";

export function computeChecksum(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export function generateBatchNo(mode: "full" | "incremental"): string {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");
  const prefix = mode === "full" ? "FULL" : "INC";
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const BatchRepo = {
  create(params: {
    batch_no: string;
    scan_mode: "full" | "incremental";
    started_at: string;
    finished_at: string;
    total_rows: number;
    dirty_rows: number;
    slow_queries: number;
    operator: string;
    comment?: string;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO scan_batches
         (batch_no, scan_mode, started_at, finished_at, total_rows, dirty_rows, slow_queries, operator, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.batch_no,
        params.scan_mode,
        params.started_at,
        params.finished_at,
        params.total_rows,
        params.dirty_rows,
        params.slow_queries,
        params.operator,
        params.comment ?? null
      );
    return Number(info.lastInsertRowid);
  },

  list(limit = 50): ScanBatch[] {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM scan_batches ORDER BY id DESC LIMIT ?`)
      .all(limit) as ScanBatch[];
  },

  get(id: number): ScanBatch | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM scan_batches WHERE id = ?`).get(id) as
      | ScanBatch
      | undefined;
  },

  getByNo(batchNo: string): ScanBatch | undefined {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM scan_batches WHERE batch_no = ?`)
      .get(batchNo) as ScanBatch | undefined;
  },

  summary() {
    const db = getDb();
    const totalBatches = (db
      .prepare(`SELECT COUNT(*) AS c FROM scan_batches`)
      .get() as { c: number }).c;
    const totalDirty = (db
      .prepare(`SELECT COALESCE(SUM(dirty_rows),0) AS c FROM scan_batches`)
      .get() as { c: number }).c;
    const totalSlow = (db
      .prepare(`SELECT COALESCE(SUM(slow_queries),0) AS c FROM scan_batches`)
      .get() as { c: number }).c;
    const pendingCount = (db
      .prepare(
        `SELECT COUNT(*) AS c FROM dirty_rows WHERE status = 'pending'`
      )
      .get() as { c: number }).c;
    return { totalBatches, totalDirty, totalSlow, pendingCount };
  },

  categoryStats(batchId?: number) {
    const db = getDb();
    const sql = batchId
      ? `SELECT category, COUNT(*) AS c FROM dirty_rows WHERE batch_id = ? GROUP BY category`
      : `SELECT category, COUNT(*) AS c FROM dirty_rows GROUP BY category`;
    const rows = (batchId
      ? db.prepare(sql).all(batchId)
      : db.prepare(sql).all()) as { category: DirtyRowCategory; c: number }[];
    return rows;
  },

  severityStats(batchId?: number) {
    const db = getDb();
    const sql = batchId
      ? `SELECT severity, COUNT(*) AS c FROM dirty_rows WHERE batch_id = ? GROUP BY severity`
      : `SELECT severity, COUNT(*) AS c FROM dirty_rows GROUP BY severity`;
    const rows = (batchId
      ? db.prepare(sql).all(batchId)
      : db.prepare(sql).all()) as { severity: string; c: number }[];
    return rows;
  },

  trend() {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, batch_no, DATE(started_at) AS d, dirty_rows, total_rows, slow_queries
         FROM scan_batches ORDER BY id ASC LIMIT 30`
      )
      .all() as {
      id: number;
      batch_no: string;
      d: string;
      dirty_rows: number;
      total_rows: number;
      slow_queries: number;
    }[];
  },
};

export const BackupRepo = {
  create(params: {
    batch_id: number;
    source_table: string;
    snapshot_json: string;
    row_count: number;
    checksum: string;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO backup_records (batch_id, source_table, snapshot_json, row_count, checksum)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        params.batch_id,
        params.source_table,
        params.snapshot_json,
        params.row_count,
        params.checksum
      );
    return Number(info.lastInsertRowid);
  },

  listByBatch(batchId: number): BackupRecord[] {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM backup_records WHERE batch_id = ? ORDER BY id`)
      .all(batchId) as BackupRecord[];
  },

  get(id: number): BackupRecord | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM backup_records WHERE id = ?`).get(id) as
      | BackupRecord
      | undefined;
  },

  compare(backupA: number, backupB: number) {
    const a = this.get(backupA);
    const b = this.get(backupB);
    if (!a || !b) return null;
    const rowsA = JSON.parse(a.snapshot_json) as Record<string, any>[];
    const rowsB = JSON.parse(b.snapshot_json) as Record<string, any>[];
    const mapA = new Map(rowsA.map((r) => [String(r.id ?? r.pk), r]));
    const mapB = new Map(rowsB.map((r) => [String(r.id ?? r.pk), r]));
    const added: any[] = [];
    const removed: any[] = [];
    const modified: { key: string; old: any; new: any; diffs: string[] }[] = [];
    for (const [k, v] of mapB) {
      if (!mapA.has(k)) added.push(v);
      else {
        const old = mapA.get(k)!;
        const diffs: string[] = [];
        for (const key of new Set([...Object.keys(old), ...Object.keys(v)])) {
          if (JSON.stringify(old[key]) !== JSON.stringify(v[key])) diffs.push(key);
        }
        if (diffs.length) modified.push({ key: k, old, new: v, diffs });
      }
    }
    for (const [k, v] of mapA) {
      if (!mapB.has(k)) removed.push(v);
    }
    return {
      table: a.source_table,
      checksumA: a.checksum,
      checksumB: b.checksum,
      countA: rowsA.length,
      countB: rowsB.length,
      added,
      removed,
      modified,
    };
  },
};

export const DirtyRowRepo = {
  create(params: {
    batch_id: number;
    backup_id: number;
    category: DirtyRowCategory;
    severity: "high" | "medium" | "low";
    source_table: string;
    source_pk: string;
    row_data_json: string;
    business_explanation: string;
    tech_detail: string;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO dirty_rows
         (batch_id, backup_id, category, severity, source_table, source_pk, row_data_json,
          business_explanation, tech_detail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.batch_id,
        params.backup_id,
        params.category,
        params.severity,
        params.source_table,
        params.source_pk,
        params.row_data_json,
        params.business_explanation,
        params.tech_detail
      );
    return Number(info.lastInsertRowid);
  },

  list(params: {
    batch_id?: number;
    status?: DirtyRowStatus;
    category?: DirtyRowCategory;
    severity?: string;
    limit?: number;
  }): DirtyRow[] {
    const db = getDb();
    const where: string[] = [];
    const args: any[] = [];
    if (params.batch_id) {
      where.push(`batch_id = ?`);
      args.push(params.batch_id);
    }
    if (params.status) {
      where.push(`status = ?`);
      args.push(params.status);
    }
    if (params.category) {
      where.push(`category = ?`);
      args.push(params.category);
    }
    if (params.severity) {
      where.push(`severity = ?`);
      args.push(params.severity);
    }
    const sql =
      `SELECT * FROM dirty_rows` +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      ` ORDER BY id DESC LIMIT ?`;
    args.push(params.limit ?? 500);
    return db.prepare(sql).all(...args) as DirtyRow[];
  },

  get(id: number): DirtyRow | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM dirty_rows WHERE id = ?`).get(id) as
      | DirtyRow
      | undefined;
  },

  updateStatus(params: {
    id: number;
    status: DirtyRowStatus;
    reviewed_by: string;
    review_note?: string;
  }) {
    const db = getDb();
    db.prepare(
      `UPDATE dirty_rows SET status = ?, reviewed_by = ?, reviewed_at = datetime('now','localtime'), review_note = ? WHERE id = ?`
    ).run(
      params.status,
      params.reviewed_by,
      params.review_note ?? null,
      params.id
    );
  },

  countByStatus(batchId?: number) {
    const db = getDb();
    const sql = batchId
      ? `SELECT status, COUNT(*) AS c FROM dirty_rows WHERE batch_id = ? GROUP BY status`
      : `SELECT status, COUNT(*) AS c FROM dirty_rows GROUP BY status`;
    const rows = (batchId
      ? db.prepare(sql).all(batchId)
      : db.prepare(sql).all()) as { status: DirtyRowStatus; c: number }[];
    return rows;
  },
};

export const ReviewLogRepo = {
  create(params: {
    dirty_row_id: number;
    batch_id: number;
    action: "approve" | "reject" | "escalate" | "reopen" | "comment";
    old_status: DirtyRowStatus;
    new_status: DirtyRowStatus;
    operator: string;
    reason: string;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO review_logs (dirty_row_id, batch_id, action, old_status, new_status, operator, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.dirty_row_id,
        params.batch_id,
        params.action,
        params.old_status,
        params.new_status,
        params.operator,
        params.reason
      );
    return Number(info.lastInsertRowid);
  },

  listByRow(dirtyRowId: number): ReviewLog[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT * FROM review_logs WHERE dirty_row_id = ? ORDER BY id DESC`
      )
      .all(dirtyRowId) as ReviewLog[];
  },

  listByBatch(batchId: number): ReviewLog[] {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM review_logs WHERE batch_id = ? ORDER BY id DESC`)
      .all(batchId) as ReviewLog[];
  },

  listAll(limit = 200): ReviewLog[] {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM review_logs ORDER BY id DESC LIMIT ?`)
      .all(limit) as ReviewLog[];
  },
};

export const SlowQueryRepo = {
  create(params: {
    batch_id: number;
    query_signature: string;
    duration_ms: number;
    attribution: string;
    table_involved: string;
    sample_sql: string;
    recommendation: string;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO slow_queries
         (batch_id, query_signature, duration_ms, attribution, table_involved, sample_sql, recommendation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.batch_id,
        params.query_signature,
        params.duration_ms,
        params.attribution,
        params.table_involved,
        params.sample_sql,
        params.recommendation
      );
    return Number(info.lastInsertRowid);
  },

  listByBatch(batchId?: number): SlowQuery[] {
    const db = getDb();
    if (batchId) {
      return db
        .prepare(`SELECT * FROM slow_queries WHERE batch_id = ? ORDER BY duration_ms DESC`)
        .all(batchId) as SlowQuery[];
    }
    return db
      .prepare(`SELECT * FROM slow_queries ORDER BY id DESC LIMIT 200`)
      .all() as SlowQuery[];
  },
};

export const ExportLogRepo = {
  create(params: {
    batch_id: number;
    export_type: "dirty_rows" | "slow_queries" | "batch_report" | "compare";
    file_name: string;
    file_path: string;
    exported_by: string;
    record_count: number;
  }): number {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO export_logs (batch_id, export_type, file_name, file_path, exported_by, record_count)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.batch_id,
        params.export_type,
        params.file_name,
        params.file_path,
        params.exported_by,
        params.record_count
      );
    return Number(info.lastInsertRowid);
  },

  list(limit = 100): ExportLog[] {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM export_logs ORDER BY id DESC LIMIT ?`)
      .all(limit) as ExportLog[];
  },

  get(id: number): ExportLog | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM export_logs WHERE id = ?`).get(id) as
      | ExportLog
      | undefined;
  },
};
