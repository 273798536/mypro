import { Batch } from './batch.entity';
import { DirtyType } from '../common/enums/dirty-type.enum';
export declare class DirtyRecord {
    id: string;
    dirtyType: DirtyType;
    sourceType: string;
    sourceId: string;
    originalContent: string;
    conflictFields: string[];
    handlingOpinion: string;
    isResolved: boolean;
    resolvedContent: string;
    resolvedBy: string;
    resolvedAt: Date;
    batch: Batch;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
}
