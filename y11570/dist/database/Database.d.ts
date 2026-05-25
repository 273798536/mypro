import * as sqlite3 from 'sqlite3';
export declare class Database {
    private db;
    private static instance;
    private constructor();
    static getInstance(dbPath?: string): Database;
    private initialize;
    run(sql: string, params?: any[]): Promise<{
        lastID: string;
        changes: number;
    }>;
    get<T>(sql: string, params?: any[]): Promise<T | undefined>;
    all<T>(sql: string, params?: any[]): Promise<T[]>;
    prepare(sql: string): sqlite3.Statement;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    close(): Promise<void>;
}
export default Database;
