import * as sqlite3 from 'sqlite3';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './database.sqlite') {
    this.db = new sqlite3.Database(dbPath);
  }

  async init(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        materialId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        originalName TEXT NOT NULL,
        status TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        auditResult TEXT NOT NULL,
        auditComment TEXT,
        auditedBy TEXT NOT NULL,
        auditedAt TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS daily_costs (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        date TEXT NOT NULL,
        cost REAL NOT NULL,
        impressions INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        importedAt TEXT NOT NULL,
        isValid INTEGER NOT NULL DEFAULT 1,
        validationError TEXT,
        UNIQUE(materialId, date),
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS manager_comments (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        comment TEXT NOT NULL,
        evidence TEXT,
        commentedBy TEXT NOT NULL,
        commentedAt TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS status_change_logs (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        fromStatus TEXT,
        toStatus TEXT NOT NULL,
        changedBy TEXT NOT NULL,
        changedAt TEXT NOT NULL,
        reason TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS failed_records (
        id TEXT PRIMARY KEY,
        recordType TEXT NOT NULL,
        originalData TEXT NOT NULL,
        errorReason TEXT NOT NULL,
        failedAt TEXT NOT NULL,
        source TEXT NOT NULL
      )
    `);

    await this.run(`CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_costs_date ON daily_costs(date)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_logs_material ON status_change_logs(materialId)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_failed_records_type ON failed_records(recordType)`);
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async beginTransaction(): Promise<void> {
    await this.run('BEGIN TRANSACTION');
  }

  async commit(): Promise<void> {
    await this.run('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.run('ROLLBACK');
  }
}

let dbInstance: Database | null = null;

export function getDatabase(dbPath?: string): Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
  }
  return dbInstance;
}

export function resetDatabase(): void {
  dbInstance = null;
}
