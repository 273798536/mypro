import { MaterialRecord, DirtyRecord, DirtyType, Database } from '../types';
export declare function detectMissingFields(record: MaterialRecord): DirtyRecord | null;
export declare function detectCrossDate(record: MaterialRecord, existingRecords: MaterialRecord[]): DirtyRecord | null;
export declare function detectNameChanged(record: MaterialRecord, existingRecords: MaterialRecord[]): DirtyRecord | null;
export declare function detectAmountConflict(record: MaterialRecord): DirtyRecord | null;
export declare function detectQuantityConflict(record: MaterialRecord, existingRecords: MaterialRecord[]): DirtyRecord | null;
export declare function detectAllDirty(record: MaterialRecord, db: Database): DirtyRecord[];
export declare function getDirtyTypeName(type: DirtyType): string;
