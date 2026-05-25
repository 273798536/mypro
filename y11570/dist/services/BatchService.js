"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchService = void 0;
const types_1 = require("../types");
const schemas_1 = require("../validation/schemas");
class BatchService {
    constructor(dao, stateMachine) {
        this.dao = dao;
        this.stateMachine = stateMachine;
    }
    async createBatch(name, createdBy) {
        if (!name || !name.trim()) {
            throw new Error('批次名称不能为空');
        }
        if (!createdBy || !createdBy.trim()) {
            throw new Error('创建人不能为空');
        }
        const batch = await this.dao.createBatch({
            name: name.trim(),
            status: types_1.BatchStatus.DRAFT,
            ticketCount: 0,
            totalAmount: 0,
            frozenCount: 0,
            settledCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: createdBy.trim()
        });
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batch.id,
            action: 'create',
            newValue: batch,
            operatorId: createdBy,
            createdAt: new Date()
        });
        return batch;
    }
    async submitBatch(batchId, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== types_1.BatchStatus.DRAFT) {
            throw new Error('Only draft batches can be submitted');
        }
        await this.dao.updateBatchStatus(batchId, types_1.BatchStatus.SUBMITTED);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'submit',
            oldValue: types_1.BatchStatus.DRAFT,
            newValue: types_1.BatchStatus.SUBMITTED,
            operatorId,
            createdAt: new Date()
        });
        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }
        return updatedBatch;
    }
    async startReview(batchId, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== types_1.BatchStatus.SUBMITTED) {
            throw new Error('Only submitted batches can be reviewed');
        }
        await this.dao.updateBatchStatus(batchId, types_1.BatchStatus.REVIEWING, operatorId);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'start_review',
            oldValue: types_1.BatchStatus.SUBMITTED,
            newValue: types_1.BatchStatus.REVIEWING,
            operatorId,
            createdAt: new Date()
        });
        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }
        return updatedBatch;
    }
    async processBatch(batchId, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        const tickets = await this.dao.getTicketsByBatchId(batchId);
        for (const ticket of tickets) {
            try {
                if (ticket.status !== types_1.TicketStatus.FROZEN) {
                    await this.stateMachine.settleTicket(ticket.id, `批次结算: ${batch.name}`, operatorId);
                }
            }
            catch (error) {
                await this.dao.createFailedRecord({
                    batchId,
                    ticketId: ticket.id,
                    recordType: 'ticket',
                    rawData: JSON.stringify(ticket),
                    errorCode: 'BATCH_PROCESS_ERROR',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    failedAt: new Date()
                });
            }
        }
        await this.dao.updateBatchStatus(batchId, types_1.BatchStatus.PROCESSED, operatorId);
        await this.dao.updateBatchStats(batchId);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'process',
            oldValue: batch.status,
            newValue: types_1.BatchStatus.PROCESSED,
            operatorId,
            createdAt: new Date()
        });
        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }
        return updatedBatch;
    }
    async freezeBatch(batchId, frozenType, reason, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        const tickets = await this.dao.getTicketsByBatchId(batchId);
        for (const ticket of tickets) {
            try {
                if (ticket.status !== types_1.TicketStatus.FROZEN) {
                    await this.stateMachine.freezeTicket(ticket.id, frozenType, `批次冻结: ${reason}`, operatorId);
                }
            }
            catch (error) {
                await this.dao.createFailedRecord({
                    batchId,
                    ticketId: ticket.id,
                    recordType: 'ticket',
                    rawData: JSON.stringify(ticket),
                    errorCode: 'BATCH_FREEZE_ERROR',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    failedAt: new Date()
                });
            }
        }
        await this.dao.updateBatchStatus(batchId, types_1.BatchStatus.FROZEN);
        await this.dao.updateBatchStats(batchId);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'freeze',
            oldValue: batch.status,
            newValue: types_1.BatchStatus.FROZEN,
            operatorId,
            createdAt: new Date()
        });
        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }
        return updatedBatch;
    }
    async archiveBatch(batchId, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== types_1.BatchStatus.PROCESSED) {
            throw new Error('Only processed batches can be archived');
        }
        await this.dao.updateBatchStatus(batchId, types_1.BatchStatus.ARCHIVED);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'archive',
            oldValue: batch.status,
            newValue: types_1.BatchStatus.ARCHIVED,
            operatorId,
            createdAt: new Date()
        });
        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }
        return updatedBatch;
    }
    async addTicketsToBatch(batchId, requests, operatorId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        if (batch.status !== types_1.BatchStatus.DRAFT) {
            throw new Error('Can only add tickets to draft batches');
        }
        if (!operatorId || !operatorId.trim()) {
            throw new Error('操作人不能为空');
        }
        const tickets = [];
        for (const request of requests) {
            try {
                const validation = (0, schemas_1.validateSchema)(schemas_1.createTicketSchema, request);
                if (!validation.valid) {
                    throw new Error(`输入校验失败: ${validation.errors?.join('; ')}`);
                }
                const slaRule = await this.dao.getSLARuleById(request.slaRuleId);
                if (!slaRule) {
                    throw new Error(`SLA 规则不存在: ${request.slaRuleId}`);
                }
                const ticket = await this.createTicketInBatch(batchId, request);
                tickets.push(ticket);
            }
            catch (error) {
                await this.dao.createFailedRecord({
                    batchId,
                    recordType: 'ticket',
                    rawData: JSON.stringify(request),
                    errorCode: 'TICKET_VALIDATION_ERROR',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    failedAt: new Date()
                });
            }
        }
        await this.dao.updateBatchStats(batchId);
        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'add_tickets',
            newValue: { addedCount: tickets.length, failedCount: requests.length - tickets.length },
            operatorId: operatorId.trim(),
            createdAt: new Date()
        });
        return tickets;
    }
    async createTicketInBatch(batchId, request) {
        const sessionSummary = {
            ...request.sessionSummary,
            ticketId: '',
            customerId: request.sessionSummary.customerId.trim(),
            issueType: request.sessionSummary.issueType.trim(),
            description: request.sessionSummary.description.trim()
        };
        const ticket = await this.dao.createTicket({
            batchId,
            status: types_1.TicketStatus.CREATED,
            sessionSummary: sessionSummary,
            slaRuleId: request.slaRuleId.trim(),
            currentAgentId: request.sessionSummary.agentId?.trim(),
            assignmentHistory: [],
            compensationApprovals: [],
            inventoryDifferences: [],
            timeoutRecords: [],
            totalCompensation: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: request.createdBy.trim()
        });
        ticket.sessionSummary.ticketId = ticket.id;
        await this.dao.createStateTransition({
            ticketId: ticket.id,
            fromStatus: types_1.TicketStatus.CREATED,
            toStatus: types_1.TicketStatus.CREATED,
            reason: '工单创建',
            operatorId: request.createdBy,
            manual: false,
            createdAt: new Date()
        });
        return ticket;
    }
    async getBatchDetail(batchId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        const tickets = await this.dao.getTicketsByBatchId(batchId);
        const failedRecords = await this.dao.getFailedRecords({ batchId });
        for (const ticket of tickets) {
            ticket.assignmentHistory = await this.dao.getAssignmentsByTicketId(ticket.id);
            ticket.compensationApprovals = await this.dao.getCompensationApprovalsByTicketId(ticket.id);
            ticket.timeoutRecords = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
        }
        return { batch, tickets, failedRecords };
    }
    async getBatchStats(batchId) {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }
        const tickets = await this.dao.getTicketsByBatchId(batchId);
        const statusCounts = {};
        let totalAmount = 0;
        let frozenAmount = 0;
        let settledAmount = 0;
        for (const ticket of tickets) {
            statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
            totalAmount += ticket.totalCompensation;
            if (ticket.status === types_1.TicketStatus.FROZEN) {
                frozenAmount += ticket.totalCompensation;
            }
            if (ticket.status === types_1.TicketStatus.SETTLED || ticket.status === types_1.TicketStatus.ARCHIVED) {
                settledAmount += ticket.totalCompensation;
            }
        }
        return {
            batchId,
            batchName: batch.name,
            batchStatus: batch.status,
            totalTickets: tickets.length,
            totalAmount,
            frozenAmount,
            settledAmount,
            statusCounts,
            ticketCount: batch.ticketCount,
            frozenCount: batch.frozenCount,
            settledCount: batch.settledCount
        };
    }
    async createInventoryDifference(diffData, operatorId) {
        if (!operatorId || !operatorId.trim()) {
            throw new Error('操作人不能为空');
        }
        const ticket = await this.dao.getTicketById(diffData.ticketId);
        if (!ticket) {
            throw new Error(`工单不存在: ${diffData.ticketId}`);
        }
        const calculatedDiff = diffData.actualQuantity - diffData.expectedQuantity;
        if (calculatedDiff !== diffData.difference) {
            throw new Error(`差异计算不一致: 计算值=${calculatedDiff}, 输入值=${diffData.difference}`);
        }
        const diff = await this.dao.createInventoryDifference({
            ...diffData,
            ticketId: diffData.ticketId.trim(),
            productId: diffData.productId.trim(),
            reason: diffData.reason?.trim(),
            createdAt: new Date()
        });
        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: diffData.ticketId,
            action: 'add_inventory_difference',
            newValue: diff,
            operatorId: operatorId.trim(),
            createdAt: new Date()
        });
        return diff;
    }
    async getInventoryDifferencesByTicketId(ticketId) {
        if (!ticketId || !ticketId.trim()) {
            throw new Error('工单ID不能为空');
        }
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`工单不存在: ${ticketId}`);
        }
        return await this.dao.getInventoryDifferencesByTicketId(ticketId.trim());
    }
    async getInventoryDifferenceById(id) {
        if (!id || !id.trim()) {
            throw new Error('盘点差异ID不能为空');
        }
        return await this.dao.getInventoryDifferenceById(id.trim());
    }
    async getInventoryDifferences(filters = {}) {
        const differences = await this.dao.getInventoryDifferences(filters);
        let totalMissing = 0;
        let totalExtra = 0;
        let unresolvedCount = 0;
        const byProduct = {};
        for (const diff of differences) {
            if (diff.difference < 0) {
                totalMissing += Math.abs(diff.difference);
            }
            else {
                totalExtra += diff.difference;
            }
            if (!diff.reason) {
                unresolvedCount++;
            }
            if (!byProduct[diff.productId]) {
                byProduct[diff.productId] = { count: 0, diff: 0 };
            }
            byProduct[diff.productId].count++;
            byProduct[diff.productId].diff += diff.difference;
        }
        return {
            differences,
            summary: {
                totalRecords: differences.length,
                totalMissing,
                totalExtra,
                netDifference: totalExtra - totalMissing,
                unresolvedCount,
                byProduct
            }
        };
    }
    async updateInventoryDifferenceReason(id, reason, operatorId) {
        if (!id || !id.trim()) {
            throw new Error('盘点差异ID不能为空');
        }
        if (!reason || !reason.trim()) {
            throw new Error('原因不能为空');
        }
        if (!operatorId || !operatorId.trim()) {
            throw new Error('操作人不能为空');
        }
        const diff = await this.dao.getInventoryDifferenceById(id.trim());
        if (!diff) {
            throw new Error(`盘点差异不存在: ${id}`);
        }
        await this.dao.updateInventoryDifferenceReason(id.trim(), reason.trim());
        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: diff.ticketId,
            action: 'update_inventory_diff_reason',
            oldValue: diff.reason,
            newValue: reason.trim(),
            operatorId: operatorId.trim(),
            createdAt: new Date()
        });
    }
}
exports.BatchService = BatchService;
exports.default = BatchService;
//# sourceMappingURL=BatchService.js.map