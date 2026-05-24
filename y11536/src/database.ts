import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  AttendanceRecord,
  SourceEvidence,
  StatusHistory,
  CheckIssue,
  AttendanceStatus,
  SourceType,
  CheckIssueType,
} from './types';

export class AttendanceDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.dbPath = path.join(dataDir, 'attendance.db');
  }

  async init(): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        course_id TEXT NOT NULL,
        course_name TEXT NOT NULL,
        attend_date TEXT NOT NULL,
        current_status TEXT NOT NULL,
        is_frozen INTEGER NOT NULL DEFAULT 0,
        frozen_by TEXT,
        frozen_at TEXT,
        frozen_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS source_evidence (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_data TEXT NOT NULL,
        parsed_data TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        import_batch_id TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES attendance_records(id)
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        operator TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES attendance_records(id)
      );

      CREATE TABLE IF NOT EXISTS check_issues (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        related_record_ids TEXT,
        detected_at TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_at TEXT,
        resolved_by TEXT,
        FOREIGN KEY (record_id) REFERENCES attendance_records(id)
      );

      CREATE TABLE IF NOT EXISTS import_failures (
        id TEXT PRIMARY KEY,
        import_batch_id TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_type TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        raw_data TEXT NOT NULL,
        error TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_records_tracking ON attendance_records(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_records_employee ON attendance_records(employee_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_sources_record ON source_evidence(record_id);
      CREATE INDEX IF NOT EXISTS idx_history_record ON status_history(record_id);
      CREATE INDEX IF NOT EXISTS idx_issues_record ON check_issues(record_id);
    `);
  }

  async addStatusHistory(
    recordId: string,
    fromStatus: AttendanceStatus | null,
    toStatus: AttendanceStatus,
    operator: string,
    reason: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO status_history (id, record_id, from_status, to_status, operator, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(),
      recordId,
      fromStatus,
      toStatus,
      operator,
      reason,
      new Date().toISOString()
    );
  }

  async upsertRecord(
    parsedData: SourceEvidence['parsedData'],
    sourceEvidence: Omit<SourceEvidence, 'parsedData'> & { parsedData: SourceEvidence['parsedData'] }
  ): Promise<{ recordId: string; isNew: boolean; previousStatus: AttendanceStatus | null }> {
    if (!this.db) throw new Error('Database not initialized');

    const uniqueKey = `${parsedData.employeeId}-${parsedData.courseId}-${parsedData.attendDate}`;
    
    const existing = await this.db.get<{ id: string; current_status: AttendanceStatus }>(
      `SELECT id, current_status FROM attendance_records 
       WHERE employee_id = ? AND course_id = ? AND attend_date = ?`,
      parsedData.employeeId,
      parsedData.courseId,
      parsedData.attendDate
    );

    const now = new Date().toISOString();
    let recordId: string;
    let isNew = false;
    let previousStatus: AttendanceStatus | null = null;

    if (existing) {
      recordId = existing.id;
      previousStatus = existing.current_status;
    } else {
      recordId = uuidv4();
      isNew = true;
      await this.db.run(
        `INSERT INTO attendance_records 
         (id, employee_id, employee_name, tracking_number, course_id, course_name, attend_date, 
          current_status, is_frozen, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        recordId,
        parsedData.employeeId,
        parsedData.employeeName,
        parsedData.trackingNumber,
        parsedData.courseId,
        parsedData.courseName,
        parsedData.attendDate,
        'pending',
        now,
        now
      );
    }

    await this.db.run(
      `INSERT INTO source_evidence 
       (id, record_id, source_file, source_type, original_line_number, raw_data, parsed_data, imported_at, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(),
      recordId,
      sourceEvidence.sourceFile,
      sourceEvidence.sourceType,
      sourceEvidence.originalLineNumber,
      JSON.stringify(sourceEvidence.rawData),
      JSON.stringify(sourceEvidence.parsedData),
      sourceEvidence.importedAt,
      sourceEvidence.importBatchId
    );

    return { recordId, isNew, previousStatus };
  }

  async updateRecordStatus(
    recordId: string,
    newStatus: AttendanceStatus,
    operator: string,
    reason: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const current = await this.db.get<{ current_status: AttendanceStatus }>(
      `SELECT current_status FROM attendance_records WHERE id = ?`,
      recordId
    );

    if (!current) throw new Error(`Record ${recordId} not found`);

    await this.db.run(
      `UPDATE attendance_records SET current_status = ?, updated_at = ? WHERE id = ?`,
      newStatus,
      new Date().toISOString(),
      recordId
    );

    await this.addStatusHistory(recordId, current.current_status, newStatus, operator, reason);
  }

  async freezeRecord(recordId: string, operator: string, reason: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE attendance_records 
       SET is_frozen = 1, frozen_by = ?, frozen_at = ?, frozen_reason = ?, updated_at = ?
       WHERE id = ?`,
      operator,
      now,
      reason,
      now,
      recordId
    );
  }

  async unfreezeRecord(recordId: string, operator: string, reason: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `UPDATE attendance_records 
       SET is_frozen = 0, frozen_by = NULL, frozen_at = NULL, frozen_reason = NULL, updated_at = ?
       WHERE id = ?`,
      new Date().toISOString(),
      recordId
    );
  }

  async addIssue(
    recordId: string,
    type: CheckIssueType,
    severity: CheckIssue['severity'],
    description: string,
    relatedRecordIds?: string[]
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const issueId = uuidv4();
    await this.db.run(
      `INSERT INTO check_issues 
       (id, record_id, type, severity, description, related_record_ids, detected_at, resolved)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      issueId,
      recordId,
      type,
      severity,
      description,
      relatedRecordIds ? JSON.stringify(relatedRecordIds) : null,
      new Date().toISOString()
    );

    return issueId;
  }

  async resolveIssue(issueId: string, resolvedBy: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `UPDATE check_issues SET resolved = 1, resolved_at = ?, resolved_by = ? WHERE id = ?`,
      new Date().toISOString(),
      resolvedBy,
      issueId
    );
  }

  async addImportFailure(
    batchId: string,
    sourceFile: string,
    sourceType: SourceType,
    lineNumber: number,
    rawData: Record<string, string>,
    error: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO import_failures 
       (id, import_batch_id, source_file, source_type, line_number, raw_data, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(),
      batchId,
      sourceFile,
      sourceType,
      lineNumber,
      JSON.stringify(rawData),
      error,
      new Date().toISOString()
    );
  }

  async getRecord(recordId: string): Promise<AttendanceRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.db.get(
      `SELECT * FROM attendance_records WHERE id = ?`,
      recordId
    );

    if (!record) return null;

    return this.hydrateRecord(record);
  }

  async getAllRecords(): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.all(`SELECT * FROM attendance_records`);
    return Promise.all(records.map(r => this.hydrateRecord(r)));
  }

  async getRecordsByTrackingNumber(trackingNumber: string): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.all(
      `SELECT * FROM attendance_records WHERE tracking_number = ?`,
      trackingNumber
    );
    return Promise.all(records.map(r => this.hydrateRecord(r)));
  }

  async getRecordHistory(recordId: string): Promise<StatusHistory[]> {
    if (!this.db) throw new Error('Database not initialized');

    const history = await this.db.all(
      `SELECT * FROM status_history WHERE record_id = ? ORDER BY timestamp ASC`,
      recordId
    );

    return history.map(h => ({
      id: h.id,
      recordId: h.record_id,
      fromStatus: h.from_status as AttendanceStatus | null,
      toStatus: h.to_status as AttendanceStatus,
      operator: h.operator,
      reason: h.reason,
      timestamp: h.timestamp,
    }));
  }

  async getImportFailures(): Promise<Array<{
    sourceFile: string;
    sourceType: SourceType;
    lineNumber: number;
    error: string;
    rawData: Record<string, string>;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const failures = await this.db.all(`SELECT * FROM import_failures ORDER BY created_at DESC`);
    return failures.map(f => ({
      sourceFile: f.source_file,
      sourceType: f.source_type as SourceType,
      lineNumber: f.line_number,
      error: f.error,
      rawData: JSON.parse(f.raw_data),
    }));
  }

  async getAllIssues(): Promise<CheckIssue[]> {
    if (!this.db) throw new Error('Database not initialized');

    const issues = await this.db.all(`SELECT * FROM check_issues ORDER BY detected_at DESC`);
    return issues.map(i => ({
      id: i.id,
      recordId: i.record_id,
      type: i.type as CheckIssueType,
      severity: i.severity as CheckIssue['severity'],
      description: i.description,
      relatedRecordIds: i.related_record_ids ? JSON.parse(i.related_record_ids) : undefined,
      detectedAt: i.detected_at,
      resolved: i.resolved === 1,
      resolvedAt: i.resolved_at,
      resolvedBy: i.resolved_by,
    }));
  }

  private async hydrateRecord(row: any): Promise<AttendanceRecord> {
    if (!this.db) throw new Error('Database not initialized');

    const sources = await this.db.all(
      `SELECT * FROM source_evidence WHERE record_id = ?`,
      row.id
    );

    const issues = await this.db.all(
      `SELECT * FROM check_issues WHERE record_id = ?`,
      row.id
    );

    const history = await this.db.all(
      `SELECT * FROM status_history WHERE record_id = ? ORDER BY timestamp ASC`,
      row.id
    );

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      trackingNumber: row.tracking_number,
      courseId: row.course_id,
      courseName: row.course_name,
      attendDate: row.attend_date,
      currentStatus: row.current_status as AttendanceStatus,
      sources: sources.map(s => ({
        sourceFile: s.source_file,
        sourceType: s.source_type as SourceType,
        originalLineNumber: s.original_line_number,
        rawData: JSON.parse(s.raw_data),
        parsedData: JSON.parse(s.parsed_data),
        importedAt: s.imported_at,
        importBatchId: s.import_batch_id,
      })),
      issues: issues.map(i => ({
        id: i.id,
        recordId: i.record_id,
        type: i.type as CheckIssueType,
        severity: i.severity as CheckIssue['severity'],
        description: i.description,
        relatedRecordIds: i.related_record_ids ? JSON.parse(i.related_record_ids) : undefined,
        detectedAt: i.detected_at,
        resolved: i.resolved === 1,
        resolvedAt: i.resolved_at,
        resolvedBy: i.resolved_by,
      })),
      history: history.map(h => ({
        id: h.id,
        recordId: h.record_id,
        fromStatus: h.from_status as AttendanceStatus | null,
        toStatus: h.to_status as AttendanceStatus,
        operator: h.operator,
        reason: h.reason,
        timestamp: h.timestamp,
      })),
      isFrozen: row.is_frozen === 1,
      frozenBy: row.frozen_by,
      frozenAt: row.frozen_at,
      frozenReason: row.frozen_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
}
