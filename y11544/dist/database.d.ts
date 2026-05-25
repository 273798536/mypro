export declare class Database {
    private db;
    constructor(dbPath?: string);
    init(): Promise<void>;
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
    run(sql: string, params?: any[]): Promise<{
        lastID: number;
        changes: number;
    }>;
    close(): Promise<void>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export declare function getDatabase(dbPath?: string): Database;
export declare function resetDatabase(): void;
