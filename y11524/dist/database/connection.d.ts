import Database from 'better-sqlite3';
export declare function getDatabase(dbPath?: string): Database.Database;
export declare function closeDatabase(): void;
export declare function resetDatabase(): void;
