import { LiabilityRecord, DirtyRecordType, DataSource } from '../types';
export interface DetectionResult {
    isDirty: boolean;
    dirtyTypes: DirtyRecordType[];
    details: Array<{
        type: DirtyRecordType;
        field?: string;
        expected?: string;
        actual?: string;
    }>;
}
export declare function detectDirtyRecords(record: Partial<LiabilityRecord>, existingRecords?: LiabilityRecord[]): DetectionResult;
export declare function hasAllDataSourcesPresent(dataSources: DataSource[]): {
    complete: boolean;
    missing: DataSource[];
};
