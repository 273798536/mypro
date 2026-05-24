"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFailedRecord = createFailedRecord;
exports.resolveFailedRecord = resolveFailedRecord;
exports.getFailedRecords = getFailedRecords;
exports.classifyError = classifyError;
const models_1 = require("../models");
const types_1 = require("../models/types");
const sequelize_1 = require("sequelize");
async function createFailedRecord(params) {
    const failureNo = `FAIL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    return models_1.FailedRecord.create({
        failureNo,
        source: params.source,
        recordType: params.recordType,
        recordId: params.recordId,
        recordNo: params.recordNo,
        queueId: params.queueId,
        queueNo: params.queueNo,
        retryCategory: params.retryCategory,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        errorDetail: params.errorDetail,
        originalData: params.originalData,
        validationErrors: params.validationErrors,
        affectedReportFields: params.affectedReportFields,
        excludedFromReport: true,
        createdBy: params.createdBy
    });
}
async function resolveFailedRecord(id, params) {
    const record = await models_1.FailedRecord.findByPk(id);
    if (!record)
        return null;
    return record.update({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: params.resolvedBy,
        resolutionMethod: params.resolutionMethod,
        resolutionRemark: params.resolutionRemark
    });
}
async function getFailedRecords(filters) {
    const where = {};
    if (filters.source)
        where.source = filters.source;
    if (filters.retryCategory)
        where.retryCategory = filters.retryCategory;
    if (filters.isResolved !== undefined)
        where.isResolved = filters.isResolved;
    if (filters.excludedFromReport !== undefined)
        where.excludedFromReport = filters.excludedFromReport;
    if (filters.startTime && filters.endTime) {
        where.createdAt = {
            [sequelize_1.Op.between]: [filters.startTime, filters.endTime]
        };
    }
    return models_1.FailedRecord.findAll({
        where,
        order: [['createdAt', 'DESC']]
    });
}
function classifyError(error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('timeout') || message.includes('econn')) {
        return types_1.RetryCategory.NETWORK_ERROR;
    }
    if (message.includes('duplicate') || message.includes('unique') || message.includes('conflict')) {
        return types_1.RetryCategory.DUPLICATE_RECORD;
    }
    if (message.includes('validation') || message.includes('invalid')) {
        return types_1.RetryCategory.VALIDATION_ERROR;
    }
    if (message.includes('not found') || message.includes('missing') || message.includes('null')) {
        return types_1.RetryCategory.MISSING_DATA;
    }
    if (message.includes('system') || message.includes('internal') || message.includes('500')) {
        return types_1.RetryCategory.SYSTEM_ERROR;
    }
    return types_1.RetryCategory.UNKNOWN;
}
//# sourceMappingURL=failedRecordService.js.map