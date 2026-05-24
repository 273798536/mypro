import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'hotel-ledger.db');

export class Database {
  private db: sqlite3.Database;

  constructor() {
    const dataDir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.db = new sqlite3.Database(DB_PATH);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.initTables().then(resolve).catch(reject);
      });
    });
  }

  private async initTables(): Promise<void> {
    const createTables = [
      `CREATE TABLE IF NOT EXISTS ledgers (
        id TEXT PRIMARY KEY,
        checkInNo TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        currentRoomNo TEXT,
        currentRoomRate REAL DEFAULT 0,
        totalRoomFee REAL DEFAULT 0,
        totalDeposit REAL DEFAULT 0,
        totalInvoice REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        hasSyncIssue INTEGER DEFAULT 0,
        syncIssueDesc TEXT,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedBy TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        submittedAt TEXT,
        rejectedAt TEXT,
        rejectReason TEXT,
        confirmedAt TEXT,
        auditedAt TEXT,
        exportedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS check_in_records (
        id TEXT PRIMARY KEY,
        ledgerId TEXT NOT NULL,
        checkInNo TEXT UNIQUE NOT NULL,
        guestName TEXT NOT NULL,
        guestIdCard TEXT NOT NULL,
        roomNo TEXT NOT NULL,
        roomType TEXT NOT NULL,
        checkInTime TEXT NOT NULL,
        checkOutTime TEXT NOT NULL,
        expectedDays INTEGER NOT NULL,
        roomRate REAL NOT NULL,
        totalAmount REAL NOT NULL,
        operator TEXT NOT NULL,
        createTime TEXT NOT NULL,
        FOREIGN KEY (ledgerId) REFERENCES ledgers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS deposit_records (
        id TEXT PRIMARY KEY,
        ledgerId TEXT NOT NULL,
        depositNo TEXT UNIQUE NOT NULL,
        checkInNo TEXT NOT NULL,
        amount REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        operator TEXT NOT NULL,
        operateTime TEXT NOT NULL,
        remark TEXT,
        FOREIGN KEY (ledgerId) REFERENCES ledgers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS room_change_records (
        id TEXT PRIMARY KEY,
        ledgerId TEXT NOT NULL,
        changeNo TEXT UNIQUE NOT NULL,
        checkInNo TEXT NOT NULL,
        oldRoomNo TEXT NOT NULL,
        newRoomNo TEXT NOT NULL,
        oldRoomType TEXT NOT NULL,
        newRoomType TEXT NOT NULL,
        oldRoomRate REAL NOT NULL,
        newRoomRate REAL NOT NULL,
        changeTime TEXT NOT NULL,
        changeReason TEXT NOT NULL,
        operator TEXT NOT NULL,
        isMidNight INTEGER DEFAULT 0,
        FOREIGN KEY (ledgerId) REFERENCES ledgers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS scan_code_records (
        id TEXT PRIMARY KEY,
        ledgerId TEXT NOT NULL,
        scanNo TEXT UNIQUE NOT NULL,
        checkInNo TEXT NOT NULL,
        amount REAL NOT NULL,
        scanTime TEXT NOT NULL,
        payChannel TEXT NOT NULL,
        merchantNo TEXT NOT NULL,
        operator TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (ledgerId) REFERENCES ledgers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS ledger_histories (
        id TEXT PRIMARY KEY,
        ledgerId TEXT NOT NULL,
        version INTEGER NOT NULL,
        operation TEXT NOT NULL,
        operator TEXT NOT NULL,
        role TEXT NOT NULL,
        oldStatus TEXT,
        newStatus TEXT,
        changedFields TEXT NOT NULL,
        changeReason TEXT,
        operateTime TEXT NOT NULL,
        FOREIGN KEY (ledgerId) REFERENCES ledgers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS failed_records (
        id TEXT PRIMARY KEY,
        ledgerId TEXT,
        recordType TEXT NOT NULL,
        recordData TEXT NOT NULL,
        failReason TEXT NOT NULL,
        failTime TEXT NOT NULL,
        operator TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ledgers_status ON ledgers(status)`,
      `CREATE INDEX IF NOT EXISTS idx_ledgers_checkInNo ON ledgers(checkInNo)`,
      `CREATE INDEX IF NOT EXISTS idx_histories_ledgerId ON ledger_histories(ledgerId)`,
      `CREATE INDEX IF NOT EXISTS idx_failed_ledgerId ON failed_records(ledgerId)`
    ];

    for (const sql of createTables) {
      await this.run(sql);
    }
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  beginTransaction(): Promise<void> {
    return this.run('BEGIN TRANSACTION');
  }

  commit(): Promise<void> {
    return this.run('COMMIT');
  }

  rollback(): Promise<void> {
    return this.run('ROLLBACK');
  }
}

export const db = new Database();
