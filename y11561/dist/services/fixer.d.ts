import { User } from '../types';
export declare class RecordFixer {
    private db;
    fixDirtyRecord(dirtyId: string, fixRemark: string, fixedBy: User, newValue?: string): void;
    private applyFixToSourceRecord;
    private parseValue;
    ignoreDirtyRecord(dirtyId: string, ignoreRemark: string, ignoredBy: User): void;
    batchFix(batchId: string, fixedBy: User): {
        fixedCount: number;
        remainingCount: number;
    };
}
