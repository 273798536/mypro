"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liabilityService = void 0;
const types_1 = require("../types");
const liabilityRecord_1 = require("../models/liabilityRecord");
const historyRecord_1 = require("../models/historyRecord");
const dirtyRecordLog_1 = require("../models/dirtyRecordLog");
const dirtyRecordDetector_1 = require("../utils/dirtyRecordDetector");
exports.liabilityService = {
    async createRecord(params, user, ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findByIdempotencyKey(params.idempotencyKey);
        if (existing) {
            const strategy = params.duplicateStrategy || types_1.DuplicateStrategy.IGNORE;
            await historyRecord_1.historyRecordModel.create({
                recordId: existing.id,
                operation: `重复数据处理-${strategy === types_1.DuplicateStrategy.OVERWRITE ? '覆盖' : '忽略'}`,
                operationType: 'duplicate_process',
                operatorId: user.id,
                operatorName: user.name,
                operatorRole: user.role,
                previousValues: { idempotencyKey: params.idempotencyKey },
                newValues: params,
                changedFields: ['duplicate_strategy'],
                changeReason: params.changeReason,
                duplicateStrategy: strategy,
                ipAddress
            });
            if (strategy === types_1.DuplicateStrategy.IGNORE) {
                return { record: existing, isDuplicate: true, duplicateStrategy: strategy };
            }
            if (strategy === types_1.DuplicateStrategy.OVERWRITE) {
                const updated = await this.updateRecord(existing.id, { ...params, status: existing.status }, user, params.changeReason || '覆盖更新');
                return { record: updated, isDuplicate: true, duplicateStrategy: strategy };
            }
        }
        const record = await liabilityRecord_1.liabilityRecordModel.create({
            idempotencyKey: params.idempotencyKey,
            ticketId: params.ticketId,
            ticketNumber: params.ticketNumber,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
            agentName: params.agentName,
            agentId: params.agentId,
            department: params.department,
            slaBreachType: params.slaBreachType,
            slaBreachDuration: params.slaBreachDuration,
            compensationAmount: params.compensationAmount,
            compensationType: params.compensationType,
            escalationLevel: params.escalationLevel,
            transferCount: params.transferCount,
            responsibleParty: params.responsibleParty,
            liabilityReason: params.liabilityReason,
            dataSources: params.dataSources,
            sourceSessionSummaryId: params.sourceSessionSummaryId,
            sourceSlaRuleId: params.sourceSlaRuleId,
            sourceCompensationApprovalId: params.sourceCompensationApprovalId,
            sourceSupplierStatementId: params.sourceSupplierStatementId,
            sourceApprovalEmailId: params.sourceApprovalEmailId,
            occurrenceDate: params.occurrenceDate
        });
        const sameTicketRecords = await liabilityRecord_1.liabilityRecordModel.findByTicketId(params.ticketId);
        const detectionResult = (0, dirtyRecordDetector_1.detectDirtyRecords)(record, sameTicketRecords);
        if (detectionResult.isDirty) {
            await this.markRecordDirty(record.id, detectionResult, user);
        }
        await historyRecord_1.historyRecordModel.create({
            recordId: record.id,
            operation: '创建草稿',
            operationType: 'create',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            newValues: { ...record },
            changedFields: Object.keys(params),
            changeReason: params.changeReason,
            ipAddress
        });
        const finalRecord = await liabilityRecord_1.liabilityRecordModel.findById(record.id);
        return { record: finalRecord, isDuplicate: false };
    },
    async updateRecord(id, updates, user, changeReason = '更新记录', ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        const changedFields = [];
        const previousValues = {};
        const newValues = {};
        for (const [key, value] of Object.entries(updates)) {
            if (key in existing && existing[key] !== value) {
                changedFields.push(key);
                previousValues[key] = existing[key];
                newValues[key] = value;
            }
        }
        if (changedFields.length === 0) {
            return existing;
        }
        const updated = await liabilityRecord_1.liabilityRecordModel.update(id, updates);
        await historyRecord_1.historyRecordModel.create({
            recordId: id,
            operation: '更新记录',
            operationType: 'update',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            previousValues,
            newValues,
            changedFields,
            changeReason,
            ipAddress
        });
        return updated;
    },
    async submitRecord(id, user, ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        if (existing.status !== types_1.WorkflowStatus.DRAFT && existing.status !== types_1.WorkflowStatus.REJECTED) {
            throw new Error('Only draft or rejected records can be submitted');
        }
        const updated = await liabilityRecord_1.liabilityRecordModel.update(id, {
            status: types_1.WorkflowStatus.SUBMITTED,
            submittedBy: user.id,
            submittedAt: new Date().toISOString()
        });
        await historyRecord_1.historyRecordModel.create({
            recordId: id,
            operation: '提交审核',
            operationType: 'status_change',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            previousValues: { status: existing.status },
            newValues: { status: types_1.WorkflowStatus.SUBMITTED },
            changedFields: ['status', 'submittedBy', 'submittedAt'],
            ipAddress
        });
        return updated;
    },
    async approveRecord(id, user, requestSecondConfirmation = false, ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        if (existing.status !== types_1.WorkflowStatus.SUBMITTED) {
            throw new Error('Only submitted records can be approved');
        }
        const newStatus = requestSecondConfirmation
            ? types_1.WorkflowStatus.SECOND_CONFIRMATION
            : types_1.WorkflowStatus.AUDIT_ONLY;
        const updated = await liabilityRecord_1.liabilityRecordModel.update(id, {
            status: newStatus,
            reviewedBy: user.id,
            reviewedAt: new Date().toISOString()
        });
        await historyRecord_1.historyRecordModel.create({
            recordId: id,
            operation: requestSecondConfirmation ? '申请二次确认' : '审核通过',
            operationType: 'status_change',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            previousValues: { status: existing.status },
            newValues: { status: newStatus },
            changedFields: ['status', 'reviewedBy', 'reviewedAt'],
            ipAddress
        });
        return updated;
    },
    async rejectRecord(id, user, reason, ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        if (existing.status !== types_1.WorkflowStatus.SUBMITTED && existing.status !== types_1.WorkflowStatus.SECOND_CONFIRMATION) {
            throw new Error('Only submitted or second confirmation records can be rejected');
        }
        const updated = await liabilityRecord_1.liabilityRecordModel.update(id, {
            status: types_1.WorkflowStatus.REJECTED,
            rejectedBy: user.id,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
        });
        await historyRecord_1.historyRecordModel.create({
            recordId: id,
            operation: '驳回',
            operationType: 'status_change',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            previousValues: { status: existing.status },
            newValues: { status: types_1.WorkflowStatus.REJECTED, rejectionReason: reason },
            changedFields: ['status', 'rejectedBy', 'rejectedAt', 'rejectionReason'],
            changeReason: reason,
            ipAddress
        });
        return updated;
    },
    async secondConfirmRecord(id, user, ipAddress) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        if (existing.status !== types_1.WorkflowStatus.SECOND_CONFIRMATION) {
            throw new Error('Only records in second confirmation status can be confirmed');
        }
        const updated = await liabilityRecord_1.liabilityRecordModel.update(id, {
            status: types_1.WorkflowStatus.AUDIT_ONLY,
            secondConfirmedBy: user.id,
            secondConfirmedAt: new Date().toISOString()
        });
        await historyRecord_1.historyRecordModel.create({
            recordId: id,
            operation: '二次确认通过',
            operationType: 'status_change',
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: user.role,
            previousValues: { status: existing.status },
            newValues: { status: types_1.WorkflowStatus.AUDIT_ONLY },
            changedFields: ['status', 'secondConfirmedBy', 'secondConfirmedAt'],
            ipAddress
        });
        return updated;
    },
    async markRecordDirty(id, detectionResult, user) {
        const record = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!record)
            return;
        await liabilityRecord_1.liabilityRecordModel.markDirty(id, detectionResult.dirtyTypes, record.originalContent || { ...record });
        for (const detail of detectionResult.details) {
            await dirtyRecordLog_1.dirtyRecordLogModel.create({
                recordId: id,
                dirtyType: detail.type,
                fieldName: detail.field,
                expectedValue: detail.expected,
                actualValue: detail.actual
            });
        }
    },
    async resolveDirtyRecord(recordId, dirtyLogId, user, resolution, corrections) {
        await dirtyRecordLog_1.dirtyRecordLogModel.resolve(dirtyLogId, user.id, resolution);
        if (corrections) {
            await this.updateRecord(recordId, corrections, user, '修正脏数据');
        }
        const remainingDirty = await dirtyRecordLog_1.dirtyRecordLogModel.findByRecordId(recordId);
        const hasUnresolved = remainingDirty.some(d => !d.resolvedAt);
        if (!hasUnresolved) {
            return await liabilityRecord_1.liabilityRecordModel.markCorrected(recordId);
        }
        return await liabilityRecord_1.liabilityRecordModel.findById(recordId);
    },
    async addHandlingOpinion(id, user, opinion) {
        return this.updateRecord(id, { handlingOpinion: opinion }, user, '添加处理意见');
    },
    async supplementDataSource(id, user, dataSource, sourceId, sourceIdField) {
        const existing = await liabilityRecord_1.liabilityRecordModel.findById(id);
        if (!existing)
            return null;
        const currentDataSources = [...existing.dataSources];
        if (!currentDataSources.includes(dataSource)) {
            currentDataSources.push(dataSource);
        }
        const updates = {
            dataSources: currentDataSources,
            [sourceIdField]: sourceId
        };
        return this.updateRecord(id, updates, user, `补全数据源: ${dataSource}`);
    }
};
