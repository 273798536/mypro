"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const liabilityRecord_1 = require("../models/liabilityRecord");
const historyRecord_1 = require("../models/historyRecord");
const dirtyRecordLog_1 = require("../models/dirtyRecordLog");
const liabilityService_1 = require("../services/liabilityService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const idempotency_1 = require("../utils/idempotency");
const router = (0, express_1.Router)();
router.get('/', (0, auth_1.requirePermission)('view_list'), async (req, res) => {
    const user = req.user;
    const { status, startDate, endDate, department, agentId, isDirty, limit = '50', offset = '0' } = req.query;
    const records = await liabilityRecord_1.liabilityRecordModel.list({
        status: status,
        startDate: startDate,
        endDate: endDate,
        department: department,
        agentId: agentId,
        isDirty: isDirty !== undefined ? isDirty === 'true' : undefined,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
    });
    const filteredRecords = (0, auth_1.filterListByRole)(records, user.role);
    res.json({
        success: true,
        data: filteredRecords,
        total: records.length
    });
});
router.get('/:id', (0, auth_1.requirePermission)('view_detail'), async (req, res) => {
    const user = req.user;
    const record = await liabilityRecord_1.liabilityRecordModel.findById(req.params.id);
    if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const filteredRecord = (0, auth_1.filterFieldsByRole)(record, user.role);
    res.json({
        success: true,
        data: filteredRecord
    });
});
router.get('/:id/history', (0, auth_1.requirePermission)('view_history'), async (req, res) => {
    const history = await historyRecord_1.historyRecordModel.findByRecordId(req.params.id);
    res.json({
        success: true,
        data: history
    });
});
router.get('/:id/dirty-logs', (0, auth_1.requirePermission)('view_detail'), async (req, res) => {
    const dirtyLogs = await dirtyRecordLog_1.dirtyRecordLogModel.findByRecordId(req.params.id);
    res.json({
        success: true,
        data: dirtyLogs
    });
});
router.post('/', (0, auth_1.requirePermission)('create_draft'), async (req, res) => {
    const user = req.user;
    const { ticketId, ticketNumber, customerName, customerPhone, agentName, agentId, department, slaBreachType, slaBreachDuration, compensationAmount, compensationType, escalationLevel, transferCount, responsibleParty, liabilityReason, dataSources, sourceSessionSummaryId, sourceSlaRuleId, sourceCompensationApprovalId, sourceSupplierStatementId, sourceApprovalEmailId, occurrenceDate, idempotencyKey, duplicateStrategy, changeReason } = req.body;
    const finalIdempotencyKey = idempotencyKey || (0, idempotency_1.generateIdempotencyKey)(ticketId, dataSources || [], {
        sessionSummaryId: sourceSessionSummaryId,
        slaRuleId: sourceSlaRuleId,
        compensationApprovalId: sourceCompensationApprovalId,
        supplierStatementId: sourceSupplierStatementId,
        approvalEmailId: sourceApprovalEmailId
    });
    try {
        const result = await liabilityService_1.liabilityService.createRecord({
            ticketId,
            ticketNumber,
            customerName,
            customerPhone,
            agentName,
            agentId,
            department,
            slaBreachType,
            slaBreachDuration,
            compensationAmount,
            compensationType,
            escalationLevel,
            transferCount,
            responsibleParty,
            liabilityReason,
            dataSources: dataSources || [types_1.DataSource.SESSION_SUMMARY],
            sourceSessionSummaryId,
            sourceSlaRuleId,
            sourceCompensationApprovalId,
            sourceSupplierStatementId,
            sourceApprovalEmailId,
            occurrenceDate: occurrenceDate || new Date().toISOString().split('T')[0],
            idempotencyKey: finalIdempotencyKey,
            duplicateStrategy: duplicateStrategy,
            changeReason
        }, user, req.ip);
        const filteredRecord = (0, auth_1.filterFieldsByRole)(result.record, user.role);
        res.json({
            success: true,
            data: filteredRecord,
            isDuplicate: result.isDuplicate,
            duplicateStrategy: result.duplicateStrategy,
            idempotencyKey: finalIdempotencyKey
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.put('/:id', (0, auth_1.requirePermission)('update_draft'), async (req, res) => {
    const user = req.user;
    const { changeReason, ...updates } = req.body;
    const existing = await liabilityRecord_1.liabilityRecordModel.findById(req.params.id);
    if (!existing) {
        return res.status(404).json({ success: false, error: 'Record not found' });
    }
    if (existing.status !== types_1.WorkflowStatus.DRAFT && existing.status !== types_1.WorkflowStatus.REJECTED) {
        return res.status(400).json({
            success: false,
            error: 'Only draft or rejected records can be updated'
        });
    }
    const updated = await liabilityService_1.liabilityService.updateRecord(req.params.id, updates, user, changeReason || '更新记录', req.ip);
    const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
    res.json({
        success: true,
        data: filteredRecord
    });
});
router.post('/:id/submit', (0, auth_1.requirePermission)('submit'), async (req, res) => {
    const user = req.user;
    try {
        const updated = await liabilityService_1.liabilityService.submitRecord(req.params.id, user, req.ip);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
        res.json({
            success: true,
            data: filteredRecord
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.post('/:id/approve', (0, auth_1.requirePermission)('approve'), async (req, res) => {
    const user = req.user;
    const { requestSecondConfirmation } = req.body;
    try {
        const updated = await liabilityService_1.liabilityService.approveRecord(req.params.id, user, requestSecondConfirmation, req.ip);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
        res.json({
            success: true,
            data: filteredRecord
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.post('/:id/reject', (0, auth_1.requirePermission)('reject'), async (req, res) => {
    const user = req.user;
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }
    try {
        const updated = await liabilityService_1.liabilityService.rejectRecord(req.params.id, user, reason, req.ip);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
        res.json({
            success: true,
            data: filteredRecord
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.post('/:id/second-confirm', (0, auth_1.requirePermission)('second_confirm'), async (req, res) => {
    const user = req.user;
    try {
        const updated = await liabilityService_1.liabilityService.secondConfirmRecord(req.params.id, user, req.ip);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
        res.json({
            success: true,
            data: filteredRecord
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.post('/:id/handling-opinion', (0, auth_1.requirePermission)('add_handling_opinion'), async (req, res) => {
    const user = req.user;
    const { opinion } = req.body;
    if (!opinion) {
        return res.status(400).json({ success: false, error: 'Opinion is required' });
    }
    const updated = await liabilityService_1.liabilityService.addHandlingOpinion(req.params.id, user, opinion);
    if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
    res.json({
        success: true,
        data: filteredRecord
    });
});
router.post('/:id/resolve-dirty/:dirtyLogId', (0, auth_1.requirePermission)('mark_dirty_resolved'), async (req, res) => {
    const user = req.user;
    const { resolution, corrections } = req.body;
    if (!resolution) {
        return res.status(400).json({ success: false, error: 'Resolution is required' });
    }
    const updated = await liabilityService_1.liabilityService.resolveDirtyRecord(req.params.id, req.params.dirtyLogId, user, resolution, corrections);
    if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
    res.json({
        success: true,
        data: filteredRecord
    });
});
router.post('/:id/supplement-source', (0, auth_1.requirePermission)('update_draft'), async (req, res) => {
    const user = req.user;
    const { dataSource, sourceId, sourceIdField } = req.body;
    if (!dataSource || !sourceId || !sourceIdField) {
        return res.status(400).json({
            success: false,
            error: 'dataSource, sourceId and sourceIdField are required'
        });
    }
    const validSourceIdFields = [
        'sourceSessionSummaryId',
        'sourceSlaRuleId',
        'sourceCompensationApprovalId',
        'sourceSupplierStatementId',
        'sourceApprovalEmailId'
    ];
    if (!validSourceIdFields.includes(sourceIdField)) {
        return res.status(400).json({
            success: false,
            error: `Invalid sourceIdField. Must be one of: ${validSourceIdFields.join(', ')}`
        });
    }
    const updated = await liabilityService_1.liabilityService.supplementDataSource(req.params.id, user, dataSource, sourceId, sourceIdField);
    if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const filteredRecord = (0, auth_1.filterFieldsByRole)(updated, user.role);
    res.json({
        success: true,
        data: filteredRecord,
        message: `Successfully supplemented data source: ${dataSource}`
    });
});
exports.default = router;
