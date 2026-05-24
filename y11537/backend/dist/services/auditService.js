"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.getAuditLogs = getAuditLogs;
const models_1 = require("../models");
async function createAuditLog(params) {
    const logNo = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    return models_1.AuditLog.create({
        logNo,
        action: params.action,
        source: params.source,
        recordType: params.recordType,
        recordId: params.recordId,
        recordNo: params.recordNo,
        queueId: params.queueId,
        queueNo: params.queueNo,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        retryCategory: params.retryCategory,
        beforeData: params.beforeData,
        afterData: params.afterData,
        changeReason: params.changeReason,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        operatorRole: params.operatorRole,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        remark: params.remark
    });
}
async function getAuditLogs(filters) {
    const where = {};
    if (filters.queueId)
        where.queueId = filters.queueId;
    if (filters.recordId)
        where.recordId = filters.recordId;
    if (filters.action)
        where.action = filters.action;
    if (filters.operatorId)
        where.operatorId = filters.operatorId;
    if (filters.startTime && filters.endTime) {
        where.createdAt = {
            $between: [filters.startTime, filters.endTime]
        };
    }
    return models_1.AuditLog.findAll({
        where,
        order: [['createdAt', 'DESC']]
    });
}
//# sourceMappingURL=auditService.js.map