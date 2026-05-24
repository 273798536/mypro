import { AuditLog } from '../models';
import { AuditAction, DataSource, QueueStatus, RetryCategory } from '../models/types';
interface CreateAuditLogParams {
    action: AuditAction;
    source: DataSource;
    recordType: string;
    recordId?: number;
    recordNo?: string;
    queueId?: number;
    queueNo?: string;
    oldStatus?: QueueStatus;
    newStatus?: QueueStatus;
    retryCategory?: RetryCategory;
    beforeData?: any;
    afterData?: any;
    changeReason?: string;
    operatorId?: number;
    operatorName?: string;
    operatorRole?: string;
    ipAddress?: string;
    userAgent?: string;
    remark?: string;
}
export declare function createAuditLog(params: CreateAuditLogParams): Promise<AuditLog>;
export declare function getAuditLogs(filters: {
    queueId?: number;
    recordId?: number;
    action?: AuditAction;
    operatorId?: number;
    startTime?: Date;
    endTime?: Date;
}): Promise<AuditLog[]>;
export {};
