import { Batch } from './batch.entity';
import { PartType } from '../common/enums/part-type.enum';
export declare class ScanDetail {
    id: string;
    detailNo: string;
    barcode: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    partType: PartType;
    scanTime: Date;
    source: string;
    rawContent: string;
    isDirty: boolean;
    batch: Batch;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
}
