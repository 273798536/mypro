import { DirtyType, MaterialRecord } from '../types';
export interface DirtyCheckResult {
    type: DirtyType;
    field?: string;
    expected?: string;
    actual?: string;
    suggestion: string;
}
export declare function checkMissingFields(data: Record<string, any>, source: string): DirtyCheckResult[];
export declare function checkCrossDay(data: Record<string, any>): DirtyCheckResult[];
export declare function checkNameChange(data: Record<string, any>, existingRecords: MaterialRecord[]): DirtyCheckResult[];
export declare function checkAmountConflict(data: Record<string, any>, existingRecords: MaterialRecord[]): DirtyCheckResult[];
export declare function checkQuantityConflict(data: Record<string, any>, existingRecords: MaterialRecord[]): DirtyCheckResult[];
export declare function checkAllDirty(data: Record<string, any>, source: string, existingRecords: MaterialRecord[]): DirtyCheckResult[];
export declare function saveDirtyRecords(recordId: string, dirtyResults: DirtyCheckResult[]): Promise<void>;
export declare function getDirtyRecords(recordId: string): Promise<Array<{
    id: string;
    dirty_type: DirtyType;
    field_name?: string;
    expected_value?: string;
    actual_value?: string;
    suggestion: string;
    fixed: boolean;
    created_at: string;
}>>;
export declare function fixDirtyRecord(dirtyRecordId: string): Promise<void>;
export declare function getUnfixedDirtyRecords(): Promise<Array<{
    id: string;
    record_id: string;
    material_id: string;
    material_name: string;
    source_line?: number;
    dirty_type: DirtyType;
    suggestion: string;
}>>;
