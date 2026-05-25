import { DirtyRecordLog, DirtyRecordType } from '../types';
interface CreateDirtyRecordLogDto {
    recordId: string;
    dirtyType: DirtyRecordType;
    fieldName?: string;
    expectedValue?: string;
    actualValue?: string;
}
export declare const dirtyRecordLogModel: {
    create(dto: CreateDirtyRecordLogDto): Promise<DirtyRecordLog>;
    findById(id: string): Promise<DirtyRecordLog | null>;
    findByRecordId(recordId: string): Promise<DirtyRecordLog[]>;
    resolve(id: string, resolvedBy: string, resolution: string): Promise<DirtyRecordLog | null>;
    listUnresolved(): Promise<DirtyRecordLog[]>;
    getStats(): Promise<Array<{
        type: string;
        count: number;
        unresolved: number;
    }>>;
};
export {};
