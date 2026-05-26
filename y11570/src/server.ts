import express, { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import TicketDao from './daos/TicketDao';
import TicketStateMachine from './state-machine/TicketStateMachine';
import BatchService from './services/BatchService';
import ExportService from './services/ExportService';
import OperationsViewService from './services/OperationsViewService';
import ReportService from './services/ReportService';
import { AssignmentType, FrozenType, BatchStatus, TicketStatus } from './types';
import { Permission, checkPermission, getRoleForOperator, getPermissionsForOperator, DEFAULT_ROLE_FOR_OPERATOR, Role, ROLE_PERMISSIONS } from './auth/roles';
import {
    slaRuleSchema,
    compensationRuleSchema,
    createTicketSchema,
    reassignTicketSchema,
    compensationRequestSchema,
    compensationReviewSchema,
    freezeTicketSchema,
    unfreezeTicketSchema,
    settleTicketSchema,
    archiveTicketSchema,
    unarchiveTicketSchema,
    createBatchSchema,
    addTicketsToBatchSchema,
    batchOperatorSchema,
    freezeBatchSchema,
    attachmentSchema,
    inventoryDifferenceSchema,
    inventoryDiffReasonSchema,
    exportRequestSchema,
    queryParamsSchema,
    reviewTicketSchema,
    overrideTicketSchema,
    reportOptionsSchema,
    operationsReportSchema,
    validateSchema
} from './validation/schemas';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/exports', express.static(path.join(__dirname, '../exports')));
app.use('/reports', express.static(path.join(__dirname, '../reports')));

const dao = new TicketDao();
const stateMachine = new TicketStateMachine(dao);
const batchService = new BatchService(dao, stateMachine);
const exportService = new ExportService(dao);
const operationsViewService = new OperationsViewService(dao);
const reportService = new ReportService(dao, stateMachine, batchService, operationsViewService);

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

function validateRequest(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = validateSchema(schema, req.body);
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

function validateQuery(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = validateSchema(schema, req.query);
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

function requirePermission(permission: Permission) {
    return (req: Request, res: Response, next: NextFunction) => {
        const operatorId = req.body.operatorId || req.query.operatorId as string;
        if (!operatorId) {
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: '缺少操作人ID，无法进行权限校验'
            });
        }

        const check = checkPermission(operatorId, permission);
        if (!check.allowed) {
            return res.status(403).json({
                error: 'PERMISSION_DENIED',
                message: check.message,
                operatorId,
                role: getRoleForOperator(operatorId),
                requiredPermission: permission
            });
        }
        next();
    };
}

function getOperatorId(req: Request): string {
    return req.body.operatorId || req.query.operatorId as string || 'anonymous';
}

async function handleWithFailedRecord(
    req: Request,
    res: Response,
    recordType: 'ticket' | 'batch' | 'export' | 'reassign' | 'compensation_request' | 'compensation_review' | 'freeze' | 'unfreeze' | 'settle' | 'archive' | 'unarchive' | 'inventory_diff' | 'review' | 'override',
    handler: () => Promise<any>
) {
    try {
        return await handler();
    } catch (error) {
        const mappedType: 'ticket' | 'batch' | 'export' = 
            recordType === 'ticket' || recordType === 'batch' || recordType === 'export' 
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

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sla-rules', asyncHandler(async (req, res) => {
    const rules = await dao.getSLARules();
    res.json(rules);
}));

app.post('/api/sla-rules', validateRequest(slaRuleSchema), asyncHandler(async (req, res) => {
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

app.post('/api/compensation-rules', validateRequest(compensationRuleSchema), asyncHandler(async (req, res) => {
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

app.get('/api/tickets', validateQuery(queryParamsSchema), asyncHandler(async (req, res) => {
    const { status, batchId, createdBy, limit = 100, offset = 0 } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (batchId) filters.batchId = batchId;
    if (createdBy) filters.createdBy = createdBy;

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

app.post('/api/tickets/:id/reassign', validateRequest(reassignTicketSchema), requirePermission(Permission.TICKET_REASSIGN), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'reassign', async () => {
        const { toAgentId, assignmentType, reason, operatorId, slaRuleId } = req.body;
        const slaRule = slaRuleId ? await dao.getSLARuleById(slaRuleId) : undefined;

        const ticket = await stateMachine.reassignTicket(
            req.params.id,
            toAgentId.trim(),
            assignmentType as AssignmentType,
            reason?.trim(),
            operatorId.trim(),
            slaRule || undefined
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/compensation/request', validateRequest(compensationRequestSchema), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'compensation_request', async () => {
        const { requestedAmount, reason, operatorId } = req.body;
        const ticket = await stateMachine.requestCompensation(
            req.params.id,
            requestedAmount,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/compensation/review', validateRequest(compensationReviewSchema), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'compensation_review', async () => {
        const { approvalId, approved, approvedAmount, reason, operatorId } = req.body;
        const ticket = await stateMachine.reviewCompensation(
            req.params.id,
            approvalId.trim(),
            approved,
            approvedAmount,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/freeze', validateRequest(freezeTicketSchema), requirePermission(Permission.TICKET_FREEZE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'freeze', async () => {
        const { frozenType, reason, operatorId } = req.body;
        const ticket = await stateMachine.freezeTicket(
            req.params.id,
            frozenType as FrozenType,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/unfreeze', validateRequest(unfreezeTicketSchema), requirePermission(Permission.TICKET_UNFREEZE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'unfreeze', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.unfreezeTicket(
            req.params.id,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/settle', validateRequest(settleTicketSchema), requirePermission(Permission.TICKET_SETTLE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'settle', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.settleTicket(
            req.params.id,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/archive', validateRequest(archiveTicketSchema), requirePermission(Permission.TICKET_ARCHIVE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'archive', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.archiveTicket(
            req.params.id,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/unarchive', validateRequest(unarchiveTicketSchema), requirePermission(Permission.TICKET_UNARCHIVE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'unarchive', async () => {
        const { reason, operatorId } = req.body;
        const ticket = await stateMachine.unarchiveTicket(
            req.params.id,
            reason.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/review', validateRequest(reviewTicketSchema), requirePermission(Permission.TICKET_REVIEW), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'review', async () => {
        const { reviewResult, reviewComments, operatorId } = req.body;
        const ticket = await stateMachine.reviewTicket(
            req.params.id,
            reviewResult as 'approved' | 'rejected' | 'escalated',
            reviewComments.trim(),
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/override', validateRequest(overrideTicketSchema), requirePermission(Permission.TICKET_OVERRIDE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'override', async () => {
        const { toStatus, overrideReason, newCompensation, operatorId } = req.body;
        const ticket = await stateMachine.overrideTicket(
            req.params.id,
            toStatus as TicketStatus,
            overrideReason.trim(),
            newCompensation,
            operatorId.trim()
        );
        res.json(ticket);
    });
}));

app.post('/api/tickets/:id/attachments', validateRequest(attachmentSchema), asyncHandler(async (req, res) => {
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

app.get('/api/inventory-differences', validateQuery(queryParamsSchema), asyncHandler(async (req, res) => {
    const { ticketId, productId, hasDifference, limit = 100, offset = 0 } = req.query;
    const filters: any = {};
    if (ticketId) filters.ticketId = ticketId;
    if (productId) filters.productId = productId;
    if (hasDifference !== undefined) filters.hasDifference = hasDifference === 'true';

    const result = await batchService.getInventoryDifferences(filters);
    res.json(result);
}));

app.post('/api/inventory-differences', validateRequest(inventoryDifferenceSchema), asyncHandler(async (req, res) => {
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

app.patch('/api/inventory-differences/:id/reason', validateRequest(inventoryDiffReasonSchema), asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const operatorId = req.body.operatorId || 'system';
    await batchService.updateInventoryDifferenceReason(
        req.params.id,
        reason,
        operatorId
    );
    res.json({ success: true, message: '原因已更新' });
}));

app.get('/api/batches', validateQuery(queryParamsSchema), asyncHandler(async (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    const filters: any = {};
    if (status) filters.status = status;

    const batches = await dao.getBatches(filters, Number(limit), Number(offset));
    res.json(batches);
}));

app.post('/api/batches', validateRequest(createBatchSchema), asyncHandler(async (req, res) => {
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

app.post('/api/batches/:id/tickets', validateRequest(addTicketsToBatchSchema), asyncHandler(async (req, res) => {
    const { tickets, operatorId } = req.body;
    const createdTickets = await batchService.addTicketsToBatch(
        req.params.id,
        tickets,
        operatorId
    );
    res.status(201).json({
        added: createdTickets.length,
        failed: tickets.length - createdTickets.length,
        tickets: createdTickets
    });
}));

app.post('/api/batches/:id/submit', validateRequest(batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.submitBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/review', validateRequest(batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.startReview(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/process', validateRequest(batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.processBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/freeze', validateRequest(freezeBatchSchema), asyncHandler(async (req, res) => {
    const { frozenType, reason, operatorId } = req.body;
    const batch = await batchService.freezeBatch(
        req.params.id,
        frozenType as FrozenType,
        reason.trim(),
        operatorId.trim()
    );
    res.json(batch);
}));

app.post('/api/batches/:id/archive', validateRequest(batchOperatorSchema), asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.archiveBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/exports/batches/:batchId', validateRequest(exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportBatchToCSV(
        req.params.batchId,
        requestedBy.trim()
    );
    res.json(result);
}));

app.post('/api/exports/tickets/:ticketId', validateRequest(exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportTicketDetailToCSV(
        req.params.ticketId,
        requestedBy.trim()
    );
    res.json(result);
}));

app.post('/api/exports/inventory-differences', validateRequest(exportRequestSchema), asyncHandler(async (req, res) => {
    const { requestedBy, ...filters } = req.body;
    const result = await exportService.exportInventoryDifferencesToCSV(
        filters,
        requestedBy.trim()
    );
    res.json(result);
}));

app.get('/api/exports/:id/status', asyncHandler(async (req, res) => {
    const status = await exportService.getExportStatus(req.params.id);
    if (!status) {
        return res.status(404).json({ error: 'Export request not found' });
    }
    res.json(status);
}));

app.post('/api/reports/tickets/:ticketId', validateRequest(reportOptionsSchema), requirePermission(Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, ...options } = req.body;
        const report = await reportService.generateTicketReport(
            req.params.ticketId,
            options,
            requestedBy.trim()
        );
        res.status(201).json(report);
    });
}));

app.post('/api/reports/batches/:batchId', validateRequest(reportOptionsSchema), requirePermission(Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, ...options } = req.body;
        const report = await reportService.generateBatchReport(
            req.params.batchId,
            options,
            requestedBy.trim()
        );
        res.status(201).json(report);
    });
}));

app.post('/api/reports/operations', validateRequest(operationsReportSchema), requirePermission(Permission.REPORT_CREATE), asyncHandler(async (req, res) => {
    await handleWithFailedRecord(req, res, 'export', async () => {
        const { requestedBy, startDate, endDate, status, includeTicketDetails } = req.body;
        const report = await reportService.generateOperationsReport(
            { startDate, endDate, status },
            { includeTicketDetails },
            requestedBy.trim()
        );
        res.status(201).json(report);
    });
}));

app.get('/api/reports', asyncHandler(async (req, res) => {
    const reports = await reportService.listReports();
    res.json(reports);
}));

app.get('/api/auth/roles', (req, res) => {
    const operatorId = req.query.operatorId as string;
    if (operatorId) {
        res.json({
            operatorId,
            role: getRoleForOperator(operatorId),
            permissions: getPermissionsForOperator(operatorId)
        });
    } else {
        res.json({
            defaultRoles: Object.keys(DEFAULT_ROLE_FOR_OPERATOR),
            roles: Object.values(Role),
            permissions: Object.values(Permission),
            rolePermissions: ROLE_PERMISSIONS
        });
    }
});

app.get('/api/operations/frozen-tickets', asyncHandler(async (req, res) => {
    const { batchId } = req.query;
    const comparison = await operationsViewService.getFrozenTicketsComparison(
        batchId as string | undefined
    );
    res.json(comparison);
}));

app.get('/api/operations/summary-report', asyncHandler(async (req, res) => {
    const { batchId, startDate, endDate } = req.query;
    const report = await operationsViewService.getSummaryReport(
        batchId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
    );
    res.json(report);
}));

app.get('/api/operations/batch-comparison', asyncHandler(async (req, res) => {
    const { batchIds } = req.query;
    const ids = Array.isArray(batchIds) ? batchIds : [batchIds];
    const report = await operationsViewService.getBatchComparisonReport(
        ids.filter(Boolean) as string[]
    );
    res.json(report);
}));

app.get('/api/operations/failed-records', asyncHandler(async (req, res) => {
    const { batchId } = req.query;
    const summary = await operationsViewService.getFailedRecordsSummary(
        batchId as string | undefined
    );
    res.json(summary);
}));

app.get('/api/failed-records', asyncHandler(async (req, res) => {
    const { batchId, recordType } = req.query;
    const filters: any = {};
    if (batchId) filters.batchId = batchId;
    if (recordType) filters.recordType = recordType;

    const records = await dao.getFailedRecords(filters);
    res.json(records);
}));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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

export default app;
