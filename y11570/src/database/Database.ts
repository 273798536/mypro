import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class Database {
    private db: sqlite3.Database;
    private static instance: Database | null = null;

    private constructor(dbPath: string) {
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = new sqlite3.Database(dbPath);
        this.initialize();
    }

    public static getInstance(dbPath: string = './data/tickets.db'): Database {
        if (!Database.instance) {
            Database.instance = new Database(dbPath);
        }
        return Database.instance;
    }

    private initialize(): void {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        this.db.exec(schema, (err) => {
            if (err) {
                console.error('Failed to initialize database schema:', err);
            } else {
                console.log('Database schema initialized successfully');
            }
        });
    }

    public run(sql: string, params: any[] = []): Promise<{ lastID: string; changes: number }> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(this: any, err: Error | null) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    public get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row: any) => {
                if (err) reject(err);
                else resolve(row as T);
            });
        });
    }

    public all<T>(sql: string, params: any[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows as T[]);
            });
        });
    }

    public prepare(sql: string): sqlite3.Statement {
        return this.db.prepare(sql);
    }

    public beginTransaction(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public commit(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public rollback(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('ROLLBACK', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export default Database;
