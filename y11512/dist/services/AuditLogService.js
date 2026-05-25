"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const database_1 = require("../config/database");
const OperationLog_1 = require("../entities/OperationLog");
class AuditLogService {
    static async log(operationType, entityType, entityId, options = {}) {
        const logData = {
            operationType,
            entityType,
            entityId,
            entityNo: options.entityNo,
            beforeData: options.beforeData,
            afterData: options.afterData,
            changes: options.changes,
            operatorId: options.operatorId,
            operatorName: options.operatorName,
            remark: options.remark,
            ipAddress: options.ipAddress,
            batchId: options.batchId
        };
        const log = this.repository.create(logData);
        return await this.repository.save(log);
    }
    static async getEntityHistory(entityType, entityId) {
        return await this.repository.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' }
        });
    }
    static async getBatchHistory(batchId) {
        return await this.repository.find({
            where: { batchId },
            order: { createdAt: 'DESC' }
        });
    }
    static async getOperatorHistory(operatorId, limit = 100) {
        return await this.repository.find({
            where: { operatorId },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }
}
exports.AuditLogService = AuditLogService;
AuditLogService.repository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
