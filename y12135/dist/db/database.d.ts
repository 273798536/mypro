import { Database } from 'sqlite3';
export declare function getDatabase(testMode?: boolean): Promise<Database>;
export declare function closeDatabase(): Promise<void>;
export declare function resetDatabase(): Promise<void>;
