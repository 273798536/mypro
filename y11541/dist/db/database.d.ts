import sqlite3 from 'sqlite3';
export declare function getDb(): sqlite3.Database;
export declare function closeDb(): void;
export declare function run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
export declare function get<T = any>(sql: string, params?: any[]): Promise<T | null>;
export declare function all<T = any>(sql: string, params?: any[]): Promise<T[]>;
export declare function initDatabase(): Promise<void>;
export declare function resetDatabase(): Promise<void>;
