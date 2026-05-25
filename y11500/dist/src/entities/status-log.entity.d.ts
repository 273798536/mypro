import { BatchStatus } from '../common/enums/batch-status.enum';
export declare class StatusLog {
    id: string;
    fromStatus: BatchStatus;
    toStatus: BatchStatus;
    reason: string;
    operatorId: string;
    operatorName: string;
    metadata: Record<string, any>;
    batchId: string;
    operatedAt: Date;
}
