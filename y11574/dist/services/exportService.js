"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportService = void 0;
const json2csv_1 = require("json2csv");
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("../types");
const liabilityRecord_1 = require("../models/liabilityRecord");
const exportLog_1 = require("../models/exportLog");
const historyRecord_1 = require("../models/historyRecord");
const roles_1 = require("../config/roles");
const SENSITIVE_FIELDS = [
    'customerPhone',
    'customerName',
    'agentId'
];
function generateChecksum(records) {
    const sortedRecords = [...records].sort((a, b) => a.id.localeCompare(b.id));
    const normalizedData = sortedRecords.map(r => ({
        id: r.id,
        compensationAmount: r.compensationAmount,
        status: r.status,
        occurrenceDate: r.occurrenceDate,
        ticketId: r.ticketId
    }));
    return crypto_1.default
        .createHash('md5')
        .update(JSON.stringify(normalizedData) + records.length + normalizedData.reduce((s, r) => s + r.compensationAmount, 0))
        .digest('hex');
}
function maskValue(value, type) {
    if (!value)
        return '';
    switch (type) {
        case 'phone':
            return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        case 'name':
            if (value.length <= 1)
                return value;
            return value[0] + '*'.repeat(value.length - 1);
        case 'id':
            if (value.length <= 4)
                return '****';
            return '****' + value.slice(-4);
        default:
            return '*'.repeat(value.length);
    }
}
function getFieldMaskType(field) {
    switch (field) {
        case 'customerPhone':
            return 'phone';
        case 'customerName':
            return 'name';
        case 'agentId':
            return 'id';
        default:
            return null;
    }
}
exports.exportService = {
    async exportToCSV(filters, user, isMasked = true) {
        const records = await liabilityRecord_1.liabilityRecordModel.list(filters);
        const visibleRecords = records.map(record => {
            const result = {};
            for (const [key, value] of Object.entries(record)) {
                if ((0, roles_1.canViewField)(user.role, key)) {
                    if (isMasked && SENSITIVE_FIELDS.includes(key)) {
                        const maskType = getFieldMaskType(key);
                        if (maskType) {
                            result[key] = maskValue(value, maskType);
                        }
                        else {
                            result[key] = value;
                        }
                    }
                    else {
                        result[key] = value;
                    }
                }
            }
            return result;
        });
        const fields = Object.keys(visibleRecords[0] || {});
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(visibleRecords);
        const totalAmount = records.reduce((sum, r) => sum + r.compensationAmount, 0);
        const checksum = generateChecksum(records);
        const maskedFields = isMasked ? SENSITIVE_FIELDS.filter(f => (0, roles_1.canViewField)(user.role, f)) : [];
        const exportLog = await exportLog_1.exportLogModel.create({
            exportedBy: user.id,
            exportedByName: user.name,
            exportType: 'csv',
            recordCount: records.length,
            totalAmount,
            isMasked,
            maskedFields,
            filters: filters,
            checksum
        });
        await historyRecord_1.historyRecordModel.create({
            recordId: 'export-' + exportLog.id,
            operation: `导出CSV-${isMasked ? '脱敏' : '完整'}`,
            operationType: 'export',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            changedFields: ['export'],
            sensitiveFieldsHandled: maskedFields,
            newValues: {
                exportId: exportLog.id,
                recordCount: records.length,
                totalAmount,
                isMasked
            }
        });
        return { csv, exportLogId: exportLog.id };
    },
    async getExportHistory(user, limit = 20) {
        if (user.role === types_1.UserRole.SUPERVISOR) {
            return await exportLog_1.exportLogModel.list(limit);
        }
        return await exportLog_1.exportLogModel.getRecentByUser(user.id, limit);
    },
    async verifyExportConsistency(exportId) {
        const exportLog = await exportLog_1.exportLogModel.findById(exportId);
        if (!exportLog) {
            throw new Error('Export log not found');
        }
        const filters = exportLog.filters;
        const records = await liabilityRecord_1.liabilityRecordModel.list(filters);
        const totalAmount = records.reduce((sum, r) => sum + r.compensationAmount, 0);
        const currentChecksum = generateChecksum(records);
        return {
            consistent: exportLog.checksum === currentChecksum &&
                exportLog.recordCount === records.length &&
                Math.abs(exportLog.totalAmount - totalAmount) < 0.01,
            expectedChecksum: exportLog.checksum,
            actualChecksum: currentChecksum,
            details: {
                recordCount: records.length,
                totalAmount
            }
        };
    }
};
