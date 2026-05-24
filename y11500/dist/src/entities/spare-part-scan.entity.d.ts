import { Batch } from './batch.entity';
import { PartType } from '../common/enums/part-type.enum';
export declare class SparePartScan {
    id: string;
    scanNo: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    partType: PartType;
    scanTime: Date;
    operator: string;
    rawContent: string;
    isDirty: boolean;
    batch: Batch;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
}
