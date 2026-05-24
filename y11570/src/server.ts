import express, { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import TicketDao from './daos/TicketDao';
import TicketStateMachine from './state-machine/TicketStateMachine';
import BatchService from './services/BatchService';
import ExportService from './services/ExportService';
import OperationsViewService from './services/OperationsViewService';
import { AssignmentType, FrozenType, BatchStatus } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/exports', express.static(path.join(__dirname, '../exports')));

const dao = new TicketDao();
const stateMachine = new TicketStateMachine(dao);
const batchService = new BatchService(dao, stateMachine);
const exportService = new ExportService(dao);
const operationsViewService = new OperationsViewService(dao);

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sla-rules', asyncHandler(async (req, res) => {
    const rules = await dao.getSLARules();
    res.json(rules);
}));

app.post('/api/sla-rules', asyncHandler(async (req, res) => {
    const { ticketType, priority, firstResponseTime, resolutionTime, escalationThreshold } = req.body;
    const rule = await dao.createSLARule({
        ticketType,
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

app.post('/api/compensation-rules', asyncHandler(async (req, res) => {
    const { issueType, baseAmount, maxAmount, multiplier } = req.body;
    const rule = await dao.createCompensationRule({
        issueType,
        baseAmount,
        maxAmount,
        multiplier,
        createdAt: new Date()
    });
    res.status(201).json(rule);
}));

app.get('/api/tickets', asyncHandler(async (req, res) => {
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

app.get('/api/tickets/:id/trace', asyncHandler(async (req, res) => {
    const trace = await operationsViewService.getTicketTraceability(req.params.id);
    res.json(trace);
}));

app.get('/api/tickets/:id/consistency', asyncHandler(async (req, res) => {
    const result = await operationsViewService.verifyDataConsistency(req.params.id);
    res.json(result);
}));

app.post('/api/tickets/:id/reassign', asyncHandler(async (req, res) => {
    const { toAgentId, assignmentType, reason, operatorId } = req.body;
    const slaRule = await dao.getSLARuleById(req.body.slaRuleId);

    const ticket = await stateMachine.reassignTicket(
        req.params.id,
        toAgentId,
        assignmentType as AssignmentType,
        reason,
        operatorId,
        slaRule || undefined
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/compensation/request', asyncHandler(async (req, res) => {
    const { requestedAmount, reason, operatorId } = req.body;
    const ticket = await stateMachine.requestCompensation(
        req.params.id,
        requestedAmount,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/compensation/review', asyncHandler(async (req, res) => {
    const { approvalId, approved, approvedAmount, reason, operatorId } = req.body;
    const ticket = await stateMachine.reviewCompensation(
        req.params.id,
        approvalId,
        approved,
        approvedAmount,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/freeze', asyncHandler(async (req, res) => {
    const { frozenType, reason, operatorId } = req.body;
    const ticket = await stateMachine.freezeTicket(
        req.params.id,
        frozenType as FrozenType,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/unfreeze', asyncHandler(async (req, res) => {
    const { reason, operatorId } = req.body;
    const ticket = await stateMachine.unfreezeTicket(
        req.params.id,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/settle', asyncHandler(async (req, res) => {
    const { reason, operatorId } = req.body;
    const ticket = await stateMachine.settleTicket(
        req.params.id,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/archive', asyncHandler(async (req, res) => {
    const { reason, operatorId } = req.body;
    const ticket = await stateMachine.archiveTicket(
        req.params.id,
        reason,
        operatorId
    );
    res.json(ticket);
}));

app.post('/api/tickets/:id/attachments', asyncHandler(async (req, res) => {
    const { fileName, fileType, fileUrl, uploadedBy } = req.body;
    const attachment = await dao.createAttachment({
        ticketId: req.params.id,
        fileName,
        fileType,
        fileUrl,
        uploadedBy,
        uploadedAt: new Date()
    });
    res.status(201).json(attachment);
}));

app.get('/api/tickets/:id/attachments', asyncHandler(async (req, res) => {
    const attachments = await dao.getAttachmentsByTicketId(req.params.id);
    res.json(attachments);
}));

app.get('/api/batches', asyncHandler(async (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    const filters: any = {};
    if (status) filters.status = status;

    const batches = await dao.getBatches(filters, Number(limit), Number(offset));
    res.json(batches);
}));

app.post('/api/batches', asyncHandler(async (req, res) => {
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

app.post('/api/batches/:id/tickets', asyncHandler(async (req, res) => {
    const { tickets, operatorId } = req.body;
    const createdTickets = await batchService.addTicketsToBatch(
        req.params.id,
        tickets,
        operatorId
    );
    res.status(201).json(createdTickets);
}));

app.post('/api/batches/:id/submit', asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.submitBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/review', asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.startReview(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/process', asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.processBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/batches/:id/freeze', asyncHandler(async (req, res) => {
    const { frozenType, reason, operatorId } = req.body;
    const batch = await batchService.freezeBatch(
        req.params.id,
        frozenType as FrozenType,
        reason,
        operatorId
    );
    res.json(batch);
}));

app.post('/api/batches/:id/archive', asyncHandler(async (req, res) => {
    const { operatorId } = req.body;
    const batch = await batchService.archiveBatch(req.params.id, operatorId);
    res.json(batch);
}));

app.post('/api/exports/batches/:batchId', asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportBatchToCSV(
        req.params.batchId,
        requestedBy
    );
    res.json(result);
}));

app.post('/api/exports/tickets/:ticketId', asyncHandler(async (req, res) => {
    const { requestedBy } = req.body;
    const result = await exportService.exportTicketDetailToCSV(
        req.params.ticketId,
        requestedBy
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

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`客服工单升级异常回执状态机服务已启动，端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
});

export default app;
