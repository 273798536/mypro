import { MaterialRecord, RecordStatus, ImportSource } from '../types';
export interface RawRecordData {
    material_id: string;
    material_name: string;
    platform: string;
    record_date: string;
    impressions?: number;
    clicks?: number;
    cost?: number;
    audit_status?: string;
    audit_reason?: string;
    [key: string]: any;
}
export declare function findExistingRecord(material_id: string, platform: string, record_date: string, source: ImportSource): Promise<MaterialRecord | null>;
export declare function findByRequestId(request_id: string): Promise<MaterialRecord[]>;
export declare function createRecord(data: RawRecordData, source: ImportSource, sourceLine?: number, requestId?: string): Promise<MaterialRecord>;
export declare function updateRecord(id: string, updates: Partial<RawRecordData>, reason: string): Promise<MaterialRecord>;
export declare function updateRecordStatus(id: string, status: RecordStatus, reason: string): Promise<void>;
export declare function getRecordById(id: string): Promise<MaterialRecord | null>;
export declare function getRecordsByStatus(status: RecordStatus): Promise<MaterialRecord[]>;
export declare function getAllRecords(limit?: number): Promise<MaterialRecord[]>;
export declare function getRecordHistory(recordId: string): Promise<Array<{
    id: string;
    field_name: string;
    old_value?: string;
    new_value?: string;
    changed_by: string;
    changed_at: string;
    change_reason: string;
}>>;
