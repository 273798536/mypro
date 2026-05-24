export declare class StatusChangeLogEntity {
    id: string;
    entityType: string;
    entityId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    changedAt: Date;
    reason: string;
}
