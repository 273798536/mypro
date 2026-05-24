import { Batch } from './batch.entity';
export declare class CustomerSignPhoto {
    id: string;
    photoNo: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    customerName: string;
    signTime: Date;
    remark: string;
    rawContent: string;
    isDirty: boolean;
    batch: Batch;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
}
