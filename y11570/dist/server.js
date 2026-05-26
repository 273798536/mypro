"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const TicketDao_1 = __importDefault(require("./daos/TicketDao"));
const TicketStateMachine_1 = __importDefault(require("./state-machine/TicketStateMachine"));
const BatchService_1 = __importDefault(require("./services/BatchService"));
const ExportService_1 = __importDefault(require("./services/ExportService"));
const OperationsViewService_1 = __importDefault(require("./services/OperationsViewService"));
const ReportService_1 = __importDefault(require("./services/ReportService"));
const roles_1 = require("./auth/roles");
const schemas_1 = require("./validation/schemas");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/exports', express_1.default.static(path.join(__dirname, '../exports')));
app.use('/reports', express_1.default.static(path.join(__dirname, '../reports')));
const dao = new TicketDao_1.default();
const stateMachine = new TicketStateMachine_1.default(dao);
const batchService = new BatchService_1.default(dao, stateMachine);
const exportService = new ExportService_1.default(dao);
const operationsViewService = new OperationsViewService_1.default(dao);
const reportService = new ReportService_1.default(dao, stateMachine, batchService, operationsViewService);
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function validateRequest(schema) {
    return (req, res, next) => {
        const result = (0, schemas_1.validateSchema)(schema, req.body);
        if (!result.valid) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: '输入校验失败',
                errors: result.errors
            });
        }
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const result = (0, schemas_1.validateSchema)(schema, req.query);
        if (!result.valid) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: '查询参数校验失败',
                errors: result.errors
            });
        }
        next();
    };
}
function requirePermission(permission) {
    return (req, res, next) => {
        const operatorId = req.body.operatorId || req.query.operatorId;
        if (!operatorId) {
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: '缺少操作人ID，无法进行权限校验'
            });
        }
        const check = (0, roles_1.checkPermission)(operatorId, permission);
        if (!check.allowed) {
            return res.status(403).json({
                error: 'PERMISSION_DENIED',
                message: check.message,
                operatorId,
                role: (0, roles_1.getRoleForOperator)(operatorId),
                requiredPermission: permission
            });
        }
        next();
    };
}
function getOperatorId(req) {
    return req.body.operatorId || req.query.operatorId || 'anonymous';
}
async function handleWithFailedRecord(req, res, recordType, handler) {
    try {
        return await handler();
    }
    catch (error) {
        const mappedType = recordType === 'ticket' || recordType === 'batch' || recordType === 'export'
            ? recordType
            : 'ticket';
        await dao.createFailedRecord({
            ticketId: req.params.id || req.body.ticketId,
            batchId: req.params.batchId || req.body.batchId,
            recordType: mappedType,
            rawData: JSON.stringify({ body: req.body, params: req.params, query: req.query, recordType }),
            errorCode: 'API_ERROR',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date()
        });
        throw error;
    }
}
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/sla-rules', asyncHandler(async (req, res) => {
    const rules = await dao.getSLARules();
    res.json(rules);
}));
app.post('/api/sla-rules', validateRequest(schemas_1.slaRuleSchema), asyncHandler(async (req, res) => {
    const { ticketType, priority, firstResponseTime, resolutionTime, escalationThreshold } = req.body;
    const rule = await dao.createSLARule({
        ticketType: ticketType.trim(),
        priority,
        firstResponseTime,
        resolutionTime,
        escalationThreshold,
        createdAt: new Date()
    });
    res.status(201).json(rule);
}));
app.get('/api/compensation-rules', asyncHandler(async (req, res) => {
    const rules = await dao.getCompensationRules();
    res.json(rules);
}));
app.post('/api/compensation-rules', validateRequest(schemas_1.compensationRuleSchema), asyncHandler(async (req, res) => {
    const { issueType, baseAmount, maxAmount, multiplier } = req.body;
    const rule = await dao.createCompensationRule({
        issueType: issueType.trim(),
        baseAmount,
        maxAmount,
        multiplier,
        createdAt: new Date()
    });
    res.status(201).json(rule);
}));
app.get('/api/tickets', validateQuery(schemas_1.queryParamsSchema), asyncHandler(async (req, res) => {
    const { status, batchId, createdBy, limit = 100, offset = 0 } = req.query;
    const filters = {};
    if (status)
        filters.status = status;
    if (batchId)
        filters.batchId = batchId;
    if (createdBy)
        filters.createdBy = createdBy;
    const tickets = await dao.getTickets(filters, Number(limit), Number(offset));
    res.json(tickets);
}));
app.get('/api/tickets/:id', asyncHandler(async (req, res) => {
    const ticket = await stateMachine.getTicketDetail(req.params.id);
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
}));
app.get('/api/tickets/:id/responsibility', asyncHandler(async (req, res) => {
    const responsibility = await stateMachine.calculateFullResponsibility(req.params.id);
    res.json(responsibility);
}));
app.get('/api/tickets/:id/history', asyncHandler(async (req, res) => {
    const transitions = await dao.getStateTransitionsByTicketId(req.params.id);
    res.json(transitions);
}));
app.get('/api/tickets/:id/audit-logs', asyncHandler(async (req, res) => {
    const logs = await dao.getAuditLogs('ticket', req.params.id);
    res.json(logs);
}));
app.get('/api/tickets/:id/assignments', asyncHandler(async (req, res) => {
    const assignments = await dao.getAssignmentsByTicketId(req.params.id);
    res.json(assignments);
}));
app.get('/api/tickets/:id/timeouts', asyncHandler(async (req, res) => {
    const timeouts = await dao.getTimeoutRecordsByTicketId(req.params.id);
    res.json(timeouts);
}));
app.get('/api/tickets/:id/inventory-differences', asyncHandler(async (req, res) => {
    const differences = await batchService.getInventoryDifferencesByTicketId(req.params.id);
    res.json(differences);
}));
app.get('/api/tickets/:id/trace', asyncHandler(async (req, res) => {
    const trace = await operationsViewService.getTicketTraceability(req.params.id);
    res.json(trace);
}));
app.get('/api/tickets/:id/consistency', asyncHandler(async (req, res) => {
    const result = await operationsViewService.verifyDataConsistency(req.params.id);
    res.json(result);
}));
app.post('/api/tickets/:id/reassign', validateRequest(schemas_1.reassignTicketSchema), requirePermission(roles_1.Permission.TICKET_REASSIGN), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'reassign', async () => {
        const { toAgentId, assignmentType, reason, operatorId, slaRuleId } = req.body;
        const slaRule = slaRuleId ? await dao.getSLARuleById(slaRuleId) : undefined;
        const ticket = await stateMachine.reassignTicket(req.params.id, toAgentId.trim(), assignmentType, reason?.trim(), operatorId.trim(), slaRule || undefined);
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/compensation/request', validateRequest(schemas_1.compensationRequestSchema), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'compensation_request', async () => {
        const { requestedAmount, reason, operatorId } = req.body;
        const ticket = await stateMachine.requestCompensation(req.params.id, requestedAmount, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/compensation/review', validateRequest(schemas_1.compensationReviewSchema), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'compensation_review', async () => {
        const { approvalId, approved, approvedAmount, reason, operatorId } = req.body;
        const ticket = await stateMachine.reviewCompensation(req.params.id, approvalId.trim(), approved, approvedAmount, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/freeze', validateRequest(schemas_1.freezeTicketSchema), requirePermission(roles_1.Permission.TICKET_FREEZE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'freeze', async () => {
        const { frozenType, reason, operatorId } = req.body;
        const ticket = await stateMachine.freezeTicket(req.params.id, frozenType, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/unfreeze', validateRequest(schemas_1.unfreezeTicketSchema), requirePermission(roles_1.Permission.TICKET_UNFREEZE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'unfreeze', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.unfreezeTicket(req.params.id, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/settle', validateRequest(schemas_1.settleTicketSchema), requirePermission(roles_1.Permission.TICKET_SETTLE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'settle', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.settleTicket(req.params.id, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/archive', validateRequest(schemas_1.archiveTicketSchema), requirePermission(roles_1.Permission.TICKET_ARCHIVE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'archive', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.archiveTicket(req.params.id, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/unarchive', validateRequest(schemas_1.unarchiveTicketSchema), requirePermission(roles_1.Permission.TICKET_UNARCHIVE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'unarchive', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.unarchiveTicket(req.params.id, reason.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/review', validateRequest(schemas_1.reviewTicketSchema), requirePermission(roles_1.Permission.TICKET_REVIEW), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'review', async () => {
        const { reviewResult, reviewComments, operatorId } = req.body;
        const ticket = await stateMachine.reviewTicket(req.params.id, reviewResult, reviewComments.trim(), operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/override', validateRequest(schemas_1.overrideTicketSchema), requirePermission(roles_1.Permission.TICKET_OVERRIDE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'override', async () => {
        const { toStatus, overrideReason, newCompensation, operatorId } = req.body;
        const ticket = await stateMachine.overrideTicket(req.params.id, toStatus, overrideReason.trim(), newCompensation, operatorId.trim());
        res.json(ticket);
    });
}));
app.post('/api/tickets/:id/attachments', validateRequest(schemas_1.attachmentSchema), asyncHandler(async (req, res) => {
    const { fileName, fileType, fileUrl, uploadedBy } = req.body;
    const attachment = await dao.createAttachment({
        ticketId: req.params.id,
        fileName: fileName.trim(),
        fileType: fileType.trim(),
        fileUrl: fileUrl.trim(),
        uploadedBy: uploadedBy.trim(),
        uploadedAt: new Date()
    });
    res.status(201).json(attachment);
}));
app.get('/api/tickets/:id/attachments', asyncHandler(async (req, res) => {
    const attachments = await dao.getAttachmentsByTicketId(req.params.id);
    res.json(attachments);
}));
app.get('/api/inventory-differences', validateQuery(schemas_1.queryParamsSchema), asyncHandler(async (req, res) => {
    const { ticketId, productId, hasDifference, limit = 100, offset = 0 } = req.query;
    const filters = {};
    if (ticketId)
        filters.ticketId = ticketId;
    if (productId)
        filters.productId = productId;
    if (hasDifference !== undefined)
        filters.hasDifference = hasDifference === 'true';
    const result = await batchService.getInventoryDifferences(filters);
    res.json(result);
}));
app.post('/api/inventory-differences', validateRequest(schemas_1.inventoryDifferenceSchema), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'inventory_diff', async () => {
        const { ticketId, productId, expectedQuantity, actualQuantity, difference, reason } = req.body;
        const operatorId = req.body.operatorId || req.body.createdBy || 'system';
        const diff = await batchService.createInventoryDifference({
            ticketId,
            productId,
            expectedQuantity,
            actualQuantity,
            difference,
            reason
        }, operatorId);
        res.status(201).json(diff);
    });
}));
app.get('/api/inventory-differences/:id', asyncHandler(async (req, res) => {
    const diff = await batchService.getInventoryDifferenceById(req.params.id);
    if (!diff) {
        return res.status(404).json({ error: 'Inventory difference not found' });
    }
    res.json(diff);
}));
app.patch('/api/inventory-differences/:id/reason', validateRequest(schemas_1.inventoryDiffReasonSchema), asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const operatorId = req.body.operatorId || 'system';
    await batchService.updateInventoryDifferenceReason(req.params.id, reason, operatorId);
    res.json({ success: true, message: '原因已更新' });
}));
app.get('/api/batches', validateQuery(schemas_1.queryParamsSchema), asyncHandler(async (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    const filters = {};
    if (status)
        filters.status = status;
    const batches = await dao.getBatches(filters, Number(limit), Number(offset));
    res.json(batches);
}));
app.post('/api/batches', validateRequest(schemas_1.createBatchSchema), asyncHandler(async (req, res) => {
    const { name, createdBy } = req.body;
    const batch = await batchService.createBatch(name, createdBy);
    res.status(201).json(batch);
}));
app.get('/api/batches/:id', asyncHandler(async (req, res) => {
    const detail = await batchService.getBatchDetail(req.params.id);
    res.json(detail);
}));
app.get('/api/batches/:id/stats', asyncHandler(async (req, res) => {
    const stats = await batchService.getBatchStats(req.params.id);
    res.json(stats);
}));
app.post('/api/batches/:id/tickets', validateRequest(schemas_1.addTicketsToBatchSchema), asyncHandler(async (req, res) => {
    const { tickets, operatorId } = req.body;
    const createdTickets = await batchService.addTicketsToBatch(req.params.id, tickets, operatorId);
    res.status(201).json({
        added: createdTickets.length,
        failed: tickets.length - createdTickets.length,
        tickets: createdTickets
    });
}));
app.post('/api/batches/:id/submit', validateRequest(schemas_1.batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.submitBatch(req.params.id, operatorId);
    res.json(batch);
}));
app.post('/api/batches/:id/review', validateRequest(schemas_1.batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.startReview(req.params.id, operatorId);
    res.json(batch);
}));
app.post('/api/batches/:id/process', validateRequest(schemas_1.batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.processBatch(req.params.id, operatorId);
    res.json(batch);
}));
app.post('/api/batches/:id/freeze', validateRequest(schemas_1.freezeBatchSchema), asyncHandler(async (req, res) => {
    const { frozenType, reason, operatorId } = req.body;
    const batch = await batchService.freezeBatch(req.params.id, frozenType, reason.trim(), operatorId.trim());
    res.json(batch);
}));
app.post('/api/batches/:id/archive', validateRequest(schemas_1.batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.archiveBatch(req.params.id, operatorId);
    res.json(batch);
}));
app.post('/api/exports/batches/:batchId', validateRequest(schemas_1.exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportBatchToCSV(req.params.batchId, requestedBy.trim());
    res.json(result);
}));
app.post('/api/exports/tickets/:ticketId', validateRequest(schemas_1.exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportTicketDetailToCSV(req.params.ticketId, requestedBy.trim());
    res.json(result);
}));
app.post('/api/exports/inventory-differences', validateRequest(schemas_1.exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy, ...filters } = req.body;
    const result = await exportService.exportInventoryDifferencesToCSV(filters, requestedBy.trim());
    res.json(result);
}));
app.get('/api/exports/:id/status', asyncHandler(async (req, res) => {
    const status = await exportService.getExportStatus(req.params.id);
    if (!status) {
        return res.status(404).json({ error: 'Export request not found' });
    }
    res.json(status);
}));
app.post('/api/reports/tickets/:ticketId', validateRequest(schemas_1.reportOptionsSchema), requirePermission(roles_1.Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, ...options } = req.body;
        const report = await reportService.generateTicketReport(req.params.ticketId, options, requestedBy.trim());
        res.status(201).json(report);
    });
}));
app.post('/api/reports/batches/:batchId', validateRequest(schemas_1.reportOptionsSchema), requirePermission(roles_1.Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, ...options } = req.body;
        const report = await reportService.generateBatchReport(req.params.batchId, options, requestedBy.trim());
        res.status(201).json(report);
    });
}));
app.post('/api/reports/operations', validateRequest(schemas_1.operationsReportSchema), requirePermission(roles_1.Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, startDate, endDate, status, includeTicketDetails } = req.body;
        const report = await reportService.generateOperationsReport({ startDate, endDate, status }, { includeTicketDetails }, requestedBy.trim());
        res.status(201).json(report);
    });
}));
app.get('/api/reports', asyncHandler(async (req, res) => {
    const reports = await reportService.listReports();
    res.json(reports);
}));
app.get('/api/auth/roles', (req, res) => {
    const operatorId = req.query.operatorId;
    if (operatorId) {
        res.json({
            operatorId,
            role: (0, roles_1.getRoleForOperator)(operatorId),
            permissions: (0, roles_1.getPermissionsForOperator)(operatorId)
        });
    }
    else {
        res.json({
            defaultRoles: Object.keys(roles_1.DEFAULT_ROLE_FOR_OPERATOR),
            roles: Object.values(roles_1.Role),
            permissions: Object.values(roles_1.Permission),
            rolePermissions: roles_1.ROLE_PERMISSIONS
        });
    }
});
app.get('/api/operations/frozen-tickets', asyncHandler(async (req, res) => {
    const { batchId } = req.query;
    const comparison = await operationsViewService.getFrozenTicketsComparison(batchId);
    res.json(comparison);
}));
app.get('/api/operations/summary-report', asyncHandler(async (req, res) => {
    const { batchId, startDate, endDate } = req.query;
    const report = await operationsViewService.getSummaryReport(batchId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    res.json(report);
}));
app.get('/api/operations/batch-comparison', asyncHandler(async (req, res) => {
    const { batchIds } = req.query;
    const ids = Array.isArray(batchIds) ? batchIds : [batchIds];
    const report = await operationsViewService.getBatchComparisonReport(ids.filter(Boolean));
    res.json(report);
}));
app.get('/api/operations/failed-records', asyncHandler(async (req, res) => {
    const { batchId } = req.query;
    const summary = await operationsViewService.getFailedRecordsSummary(batchId);
    res.json(summary);
}));
app.get('/api/failed-records', asyncHandler(async (req, res) => {
    const { batchId, recordType } = req.query;
    const filters = {};
    if (batchId)
        filters.batchId = batchId;
    if (recordType)
        filters.recordType = recordType;
    const records = await dao.getFailedRecords(filters);
    res.json(records);
}));
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.name === 'VALIDATION_ERROR' ? 400 : 500).json({
        error: err.name || 'InternalError',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
app.listen(PORT, () => {
    console.log(`客服工单升级异常回执状态机服务已启动，端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`API 文档:`);
    console.log(`  盘点差异: POST /api/inventory-differences, GET /api/inventory-differences`);
    console.log(`  责任计算: GET /api/tickets/:id/responsibility`);
    console.log(`  导出差异: POST /api/exports/inventory-differences`);
    console.log(`  工单转派: POST /api/tickets/:id/reassign (权限校验)`);
    console.log(`  工单解冻: POST /api/tickets/:id/unfreeze (权限校验)`);
    console.log(`  工单归档: POST /api/tickets/:id/archive (权限校验)`);
    console.log(`  取消归档: POST /api/tickets/:id/unarchive (权限校验)`);
    console.log(`  工单复核: POST /api/tickets/:id/review (权限校验)`);
    console.log(`  工单改判: POST /api/tickets/:id/override (权限校验)`);
    console.log(`  工单报告: POST /api/reports/tickets/:ticketId (Markdown)`);
    console.log(`  批次报告: POST /api/reports/batches/:batchId (Markdown)`);
    console.log(`  运营报告: POST /api/reports/operations (Markdown)`);
    console.log(`  权限查询: GET /api/auth/roles?operatorId=xxx`);
});
exports.default = app;
//# sourceMappingURL=server.js.map