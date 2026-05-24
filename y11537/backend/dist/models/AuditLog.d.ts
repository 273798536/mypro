import { Model, Optional } from 'sequelize';
import { AuditAction, QueueStatus, RetryCategory, DataSource } from './types';
interface AuditLogAttributes {
    id: number;
    logNo: string;
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
    createdAt?: Date;
}
interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt'> {
}
declare class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    id: number;
    logNo: string;
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
    readonly createdAt: Date;
}
export default AuditLog;
