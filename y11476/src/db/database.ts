import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface ImportRecord {
  id?: number;
  source_type: string;
  source_file: string;
  source_file_hash: string;
  original_line_number: number;
  raw_data: string;
  parsed_data: string;
  status: 'pending' | 'success' | 'failed' | 'fixed' | 'withdrawn' | 'frozen';
  check_result?: string;
  created_at: string;
  updated_at: string;
  batch_id: string;
}

export interface OverrideRecord {
  id?: number;
  import_record_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  operator: string;
  created_at: string;
}

export interface CheckResult {
  id?: number;
  import_record_id: number;
  check_type: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  created_at: string;
}

export interface ExportRecord {
  id?: number;
  batch_id: string;
  export_time: string;
  export_type: string;
  file_path: string;
  record_count: number;
  created_at: string;
}

export class InspectionDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(workDir: string = process.cwd()) {
    this.dbPath = path.join(workDir, '.mr-inspect', 'inspection.db');
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(this.dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS import_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_file_hash TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_data TEXT NOT NULL,
        parsed_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        check_result TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        UNIQUE(source_file_hash, original_line_number, source_type)
      );
      CREATE INDEX IF NOT EXISTS idx_import_batch ON import_records(batch_id);
      CREATE INDEX IF NOT EXISTS idx_import_status ON import_records(status);
      CREATE INDEX IF NOT EXISTS idx_import_source ON import_records(source_type);

      CREATE TABLE IF NOT EXISTS override_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        import_record_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        reason TEXT NOT NULL,
        operator TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (import_record_id) REFERENCES import_records(id)
      );
      CREATE INDEX IF NOT EXISTS idx_override_import ON override_records(import_record_id);

      CREATE TABLE IF NOT EXISTS check_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        import_record_id INTEGER NOT NULL,
        check_type TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (import_record_id) REFERENCES import_records(id)
      );
      CREATE INDEX IF NOT EXISTS idx_check_import ON check_results(import_record_id);
      CREATE INDEX IF NOT EXISTS idx_check_status ON check_results(status);

      CREATE TABLE IF NOT EXISTS export_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        export_time TEXT NOT NULL,
        export_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_export_batch ON export_records(batch_id);

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  getDbPath(): string {
    return this.dbPath;
  }

  getMetadata(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  setMetadata(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(key, value);
  }

  insertImportRecord(record: Omit<ImportRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO import_records 
      (source_type, source_file, source_file_hash, original_line_number, raw_data, parsed_data, status, created_at, updated_at, batch_id)
      VALUES (@source_type, @source_file, @source_file_hash, @original_line_number, @raw_data, @parsed_data, @status, @created_at, @updated_at, @batch_id)
    `);
    const result = stmt.run(record);
    return Number(result.lastInsertRowid);
  }

  batchInsertImportRecords(records: Omit<ImportRecord, 'id'>[]): { inserted: number; skipped: number } {
    const insert = this.db.transaction((recs) => {
      let inserted = 0;
      let skipped = 0;
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO import_records 
        (source_type, source_file, source_file_hash, original_line_number, raw_data, parsed_data, status, created_at, updated_at, batch_id)
        VALUES (@source_type, @source_file, @source_file_hash, @original_line_number, @raw_data, @parsed_data, @status, @created_at, @updated_at, @batch_id)
      `);
      for (const rec of recs) {
        const result = stmt.run(rec);
        if (result.changes > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }
      return { inserted, skipped };
    });
    return insert(records);
  }

  updateImportRecordStatus(id: number, status: ImportRecord['status'], checkResult?: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE import_records SET status = ?, check_result = ?, updated_at = ? WHERE id = ?
    `).run(status, checkResult || null, now, id);
  }

  withdrawRecord(sourceType: string, sourceFileHash: string, lineNumber: number): boolean {
    const result = this.db.prepare(`
      UPDATE import_records SET status = 'withdrawn', updated_at = ? 
      WHERE source_type = ? AND source_file_hash = ? AND original_line_number = ?
    `).run(new Date().toISOString(), sourceType, sourceFileHash, lineNumber);
    return result.changes > 0;
  }

  getImportRecordsByBatch(batchId: string): ImportRecord[] {
    return this.db.prepare('SELECT * FROM import_records WHERE batch_id = ? ORDER BY id').all(batchId) as ImportRecord[];
  }

  getImportRecordsBySource(sourceType: string, batchId?: string): ImportRecord[] {
    if (batchId) {
      return this.db.prepare('SELECT * FROM import_records WHERE source_type = ? AND batch_id = ? ORDER BY id').all(sourceType, batchId) as ImportRecord[];
    }
    return this.db.prepare('SELECT * FROM import_records WHERE source_type = ? ORDER BY id').all(sourceType) as ImportRecord[];
  }

  getImportRecordById(id: number): ImportRecord | undefined {
    return this.db.prepare('SELECT * FROM import_records WHERE id = ?').get(id) as ImportRecord | undefined;
  }

  getFailedRecords(batchId?: string): ImportRecord[] {
    if (batchId) {
      return this.db.prepare("SELECT * FROM import_records WHERE status IN ('failed', 'pending') AND batch_id = ? ORDER BY id").all(batchId) as ImportRecord[];
    }
    return this.db.prepare("SELECT * FROM import_records WHERE status IN ('failed', 'pending') ORDER BY id").all() as ImportRecord[];
  }

  insertOverride(record: Omit<OverrideRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO override_records 
      (import_record_id, field_name, old_value, new_value, reason, operator, created_at)
      VALUES (@import_record_id, @field_name, @old_value, @new_value, @reason, @operator, @created_at)
    `);
    const result = stmt.run(record);
    return Number(result.lastInsertRowid);
  }

  getOverridesByImportId(importId: number): OverrideRecord[] {
    return this.db.prepare('SELECT * FROM override_records WHERE import_record_id = ? ORDER BY created_at').all(importId) as OverrideRecord[];
  }

  insertCheckResult(result: Omit<CheckResult, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO check_results 
      (import_record_id, check_type, status, message, details, created_at)
      VALUES (@import_record_id, @check_type, @status, @message, @details, @created_at)
    `);
    const r = stmt.run(result);
    return Number(r.lastInsertRowid);
  }

  getCheckResultsByImportId(importId: number): CheckResult[] {
    return this.db.prepare('SELECT * FROM check_results WHERE import_record_id = ? ORDER BY created_at').all(importId) as CheckResult[];
  }

  getCheckResultsByBatch(batchId: string): CheckResult[] {
    return this.db.prepare(`
      SELECT cr.* FROM check_results cr
      JOIN import_records ir ON cr.import_record_id = ir.id
      WHERE ir.batch_id = ?
      ORDER BY cr.created_at
    `).all(batchId) as CheckResult[];
  }

  clearCheckResultsByBatch(batchId: string): void {
    this.db.prepare(`
      DELETE FROM check_results 
      WHERE import_record_id IN (SELECT id FROM import_records WHERE batch_id = ?)
    `).run(batchId);
  }

  insertExportRecord(record: Omit<ExportRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO export_records 
      (batch_id, export_time, export_type, file_path, record_count, created_at)
      VALUES (@batch_id, @export_time, @export_type, @file_path, @record_count, @created_at)
    `);
    const r = stmt.run(record);
    return Number(r.lastInsertRowid);
  }

  getExportHistory(): ExportRecord[] {
    return this.db.prepare('SELECT * FROM export_records ORDER BY created_at DESC').all() as ExportRecord[];
  }

  freezeBatch(batchId: string): void {
    this.db.prepare(`
      UPDATE import_records SET status = 'frozen', updated_at = ? 
      WHERE batch_id = ? AND status != 'withdrawn'
    `).run(new Date().toISOString(), batchId);
  }

  isBatchFrozen(batchId: string): boolean {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM import_records 
      WHERE batch_id = ? AND status = 'frozen'
    `).get(batchId) as { count: number };
    return row.count > 0;
  }

  getBatchList(): { batch_id: string; record_count: number; created_at: string }[] {
    return this.db.prepare(`
      SELECT batch_id, COUNT(*) as record_count, MIN(created_at) as created_at
      FROM import_records
      GROUP BY batch_id
      ORDER BY created_at DESC
    `).all() as { batch_id: string; record_count: number; created_at: string }[];
  }

  getStatistics(batchId?: string): {
    total: number;
    success: number;
    failed: number;
    pending: number;
    fixed: number;
    withdrawn: number;
    frozen: number;
  } {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'fixed' THEN 1 ELSE 0 END) as fixed,
        SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn,
        SUM(CASE WHEN status = 'frozen' THEN 1 ELSE 0 END) as frozen
      FROM import_records
    `;
    const params: string[] = [];
    if (batchId) {
      query += ' WHERE batch_id = ?';
      params.push(batchId);
    }
    return this.db.prepare(query).get(...params) as {
      total: number;
      success: number;
      failed: number;
      pending: number;
      fixed: number;
      withdrawn: number;
      frozen: number;
    };
  }

  close(): void {
    this.db.close();
  }
}
