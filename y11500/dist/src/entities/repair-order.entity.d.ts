import { Batch } from './batch.entity';
export declare class RepairOrder {
    id: string;
    orderNo: string;
    customerName: string;
    phone: string;
    productModel: string;
    faultDescription: string;
    repairDate: Date;
    engineerName: string;
    rawContent: string;
    isDirty: boolean;
    batch: Batch;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
}
