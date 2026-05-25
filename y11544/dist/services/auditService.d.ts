import { Database } from '../database';
import { AuditRecord, AuditRequest, ManagerComment, ManagerCommentRequest } from '../types';
export declare class AuditService {
    private db;
    constructor(db?: Database);
    private recordFailedRecord;
    addAuditRecord(request: AuditRequest): Promise<AuditRecord>;
    getAuditRecords(materialId: string): Promise<AuditRecord[]>;
    addManagerComment(request: ManagerCommentRequest): Promise<ManagerComment>;
    getManagerComments(materialId: string): Promise<ManagerComment[]>;
}
export declare const auditService: AuditService;
