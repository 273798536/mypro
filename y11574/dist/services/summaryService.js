"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryService = void 0;
const types_1 = require("../types");
const liabilityRecord_1 = require("../models/liabilityRecord");
const historyRecord_1 = require("../models/historyRecord");
const dirtyRecordLog_1 = require("../models/dirtyRecordLog");
const exportLog_1 = require("../models/exportLog");
exports.summaryService = {
    async getRoleViewSummary(user) {
        const stats = await liabilityRecord_1.liabilityRecordModel.getStats();
        let pendingActions = 0;
        switch (user.role) {
            case types_1.UserRole.DATA_ENTRY:
                pendingActions = stats.byStatus[types_1.WorkflowStatus.REJECTED] + stats.byStatus[types_1.WorkflowStatus.DRAFT];
                break;
            case types_1.UserRole.REVIEWER:
                pendingActions = stats.byStatus[types_1.WorkflowStatus.SUBMITTED];
                break;
            case types_1.UserRole.SUPERVISOR:
                pendingActions = stats.byStatus[types_1.WorkflowStatus.SECOND_CONFIRMATION] + stats.dirtyCount;
                break;
            case types_1.UserRole.READ_ONLY:
                pendingActions = 0;
                break;
        }
        return {
            role: user.role,
            pendingActions,
            totalRecords: stats.total,
            recordsByStatus: stats.byStatus,
            keyMetrics: {
                totalCompensation: stats.totalAmount,
                avgCompensation: stats.total > 0 ? stats.totalAmount / stats.total : 0,
                dirtyRecordCount: stats.dirtyCount
            }
        };
    },
    async getChangeReasons() {
        const reasons = await historyRecord_1.historyRecordModel.getChangeReasons();
        const total = reasons.reduce((sum, r) => sum + r.count, 0);
        return reasons.map(r => ({
            reason: r.reason,
            count: r.count,
            percentage: total > 0 ? (r.count / total) * 100 : 0
        }));
    },
    async getSensitiveFieldHandling() {
        const allHistory = await historyRecord_1.historyRecordModel.list({ limit: 1000 });
        const sensitiveOperations = allHistory.filter(h => h.sensitiveFieldsHandled && h.sensitiveFieldsHandled.length > 0);
        const fieldMap = new Map();
        for (const record of sensitiveOperations) {
            for (const field of record.sensitiveFieldsHandled || []) {
                if (!fieldMap.has(field)) {
                    fieldMap.set(field, {
                        field,
                        totalHandled: 0,
                        handlings: []
                    });
                }
                const handling = fieldMap.get(field);
                handling.totalHandled++;
                handling.handlings.push({
                    timestamp: record.timestamp,
                    operator: record.operatorName,
                    operation: record.operation
                });
                handling.lastHandledAt = record.timestamp;
            }
        }
        return Array.from(fieldMap.values());
    },
    async getDataConsistencyReport() {
        const listRecords = await liabilityRecord_1.liabilityRecordModel.list({ limit: 10000 });
        const listCount = listRecords.length;
        const totalAmountFromList = listRecords.reduce((sum, r) => sum + r.compensationAmount, 0);
        const allHistory = await historyRecord_1.historyRecordModel.list({ limit: 10000 });
        const liabilityHistoryRecordIds = new Set(allHistory
            .map(h => h.recordId)
            .filter(recordId => !recordId.startsWith('export-')));
        const historyCount = liabilityHistoryRecordIds.size;
        const allExportLogs = await exportLog_1.exportLogModel.list(10000);
        const exportLogCount = allExportLogs.length;
        const inconsistencies = [];
        if (listCount !== historyCount) {
            inconsistencies.push(`台账记录数与历史记录数不一致: 列表${listCount}条 vs 历史${historyCount}条`);
        }
        for (const record of listRecords) {
            if (!liabilityHistoryRecordIds.has(record.id)) {
                inconsistencies.push(`台账记录${record.id}无对应的历史记录`);
            }
        }
        const statusDistribution = {};
        for (const record of listRecords) {
            statusDistribution[record.status] = (statusDistribution[record.status] || 0) + 1;
        }
        const stats = await liabilityRecord_1.liabilityRecordModel.getStats();
        for (const [status, count] of Object.entries(stats.byStatus)) {
            if (statusDistribution[status] !== count) {
                inconsistencies.push(`状态${status}统计不一致: 统计${count} vs 实际${statusDistribution[status] || 0}`);
            }
        }
        const historyAmounts = {};
        for (const record of listRecords) {
            const recordHistory = allHistory.filter(h => h.recordId === record.id);
            const lastUpdate = recordHistory.find(h => h.operationType === 'update' || h.operationType === 'create');
            if (lastUpdate?.newValues?.compensationAmount !== undefined) {
                historyAmounts[record.id] = lastUpdate.newValues.compensationAmount;
            }
        }
        const totalAmountFromHistory = Object.values(historyAmounts).reduce((s, v) => s + v, 0);
        if (Math.abs(totalAmountFromList - totalAmountFromHistory) > 0.01 && historyCount > 0) {
            inconsistencies.push(`总金额不一致: 列表${totalAmountFromList} vs 历史${totalAmountFromHistory}`);
        }
        return {
            listCount,
            detailCount: listCount,
            historyCount,
            exportLogCount,
            totalAmountFromList,
            totalAmountFromDetails: totalAmountFromList,
            isConsistent: inconsistencies.length === 0,
            inconsistencies
        };
    },
    async getDirtyRecordStats() {
        return await dirtyRecordLog_1.dirtyRecordLogModel.getStats();
    }
};
