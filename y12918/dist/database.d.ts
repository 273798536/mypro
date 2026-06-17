import { Database } from 'sql.js';
export declare function initDatabase(): Promise<Database>;
export declare function saveDb(): void;
export declare function getDb(): Database;
export interface RunResult {
    changes: number;
    lastInsertRowid: number;
}
export declare function run(sql: string, params?: any[]): RunResult;
export declare function get<T = any>(sql: string, params?: any[]): T | undefined;
export declare function all<T = any>(sql: string, params?: any[]): T[];
export declare function exec(sql: string): void;
export declare function transaction<T>(fn: () => T): T;
