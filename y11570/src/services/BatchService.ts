import {
    Batch,
    BatchStatus,
    Ticket,
    TicketStatus,
    CreateTicketRequest,
    FrozenType
} from '../types';
import TicketDao from '../daos/TicketDao';
import TicketStateMachine from '../state-machine/TicketStateMachine';

export class BatchService {
    private dao: TicketDao;
    private stateMachine: TicketStateMachine;

    constructor(dao: TicketDao, stateMachine: TicketStateMachine) {
        this.dao = dao;
        this.stateMachine = stateMachine;
    }

    async createBatch(name: string, createdBy: string): Promise<Batch> {
        const batch = await this.dao.createBatch({
            name,
            status: BatchStatus.DRAFT,
            ticketCount: 0,
            totalAmount: 0,
            frozenCount: 0,
            settledCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy
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

    async submitBatch(batchId: string, operatorId: string): Promise<Batch> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        if (batch.status !== BatchStatus.DRAFT) {
            throw new Error('Only draft batches can be submitted');
        }

        await this.dao.updateBatchStatus(batchId, BatchStatus.SUBMITTED);

        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'submit',
            oldValue: BatchStatus.DRAFT,
            newValue: BatchStatus.SUBMITTED,
            operatorId,
            createdAt: new Date()
        });

        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }

        return updatedBatch;
    }

    async startReview(batchId: string, operatorId: string): Promise<Batch> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        if (batch.status !== BatchStatus.SUBMITTED) {
            throw new Error('Only submitted batches can be reviewed');
        }

        await this.dao.updateBatchStatus(batchId, BatchStatus.REVIEWING, operatorId);

        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'start_review',
            oldValue: BatchStatus.SUBMITTED,
            newValue: BatchStatus.REVIEWING,
            operatorId,
            createdAt: new Date()
        });

        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }

        return updatedBatch;
    }

    async processBatch(batchId: string, operatorId: string): Promise<Batch> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        const tickets = await this.dao.getTicketsByBatchId(batchId);

        for (const ticket of tickets) {
            try {
                if (ticket.status !== TicketStatus.FROZEN) {
                    await this.stateMachine.settleTicket(
                        ticket.id,
                        `批次结算: ${batch.name}`,
                        operatorId
                    );
                }
            } catch (error) {
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

        await this.dao.updateBatchStatus(batchId, BatchStatus.PROCESSED, operatorId);
        await this.dao.updateBatchStats(batchId);

        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'process',
            oldValue: batch.status,
            newValue: BatchStatus.PROCESSED,
            operatorId,
            createdAt: new Date()
        });

        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }

        return updatedBatch;
    }

    async freezeBatch(batchId: string, frozenType: FrozenType, reason: string, operatorId: string): Promise<Batch> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        const tickets = await this.dao.getTicketsByBatchId(batchId);

        for (const ticket of tickets) {
            try {
                if (ticket.status !== TicketStatus.FROZEN) {
                    await this.stateMachine.freezeTicket(
                        ticket.id,
                        frozenType,
                        `批次冻结: ${reason}`,
                        operatorId
                    );
                }
            } catch (error) {
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

        await this.dao.updateBatchStatus(batchId, BatchStatus.FROZEN);
        await this.dao.updateBatchStats(batchId);

        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'freeze',
            oldValue: batch.status,
            newValue: BatchStatus.FROZEN,
            operatorId,
            createdAt: new Date()
        });

        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }

        return updatedBatch;
    }

    async archiveBatch(batchId: string, operatorId: string): Promise<Batch> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        if (batch.status !== BatchStatus.PROCESSED) {
            throw new Error('Only processed batches can be archived');
        }

        await this.dao.updateBatchStatus(batchId, BatchStatus.ARCHIVED);

        await this.dao.createAuditLog({
            entityType: 'batch',
            entityId: batchId,
            action: 'archive',
            oldValue: batch.status,
            newValue: BatchStatus.ARCHIVED,
            operatorId,
            createdAt: new Date()
        });

        const updatedBatch = await this.dao.getBatchById(batchId);
        if (!updatedBatch) {
            throw new Error(`Failed to retrieve updated batch ${batchId}`);
        }

        return updatedBatch;
    }

    async addTicketsToBatch(batchId: string, requests: CreateTicketRequest[], operatorId: string): Promise<Ticket[]> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        if (batch.status !== BatchStatus.DRAFT) {
            throw new Error('Can only add tickets to draft batches');
        }

        const tickets: Ticket[] = [];

        for (const request of requests) {
            try {
                const ticket = await this.createTicketInBatch(batchId, request);
                tickets.push(ticket);
            } catch (error) {
                await this.dao.createFailedRecord({
                    batchId,
                    recordType: 'ticket',
                    rawData: JSON.stringify(request),
                    errorCode: 'TICKET_CREATE_ERROR',
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
            newValue: { addedCount: tickets.length },
            operatorId,
            createdAt: new Date()
        });

        return tickets;
    }

    private async createTicketInBatch(batchId: string, request: CreateTicketRequest): Promise<Ticket> {
        const sessionSummary = {
            ...request.sessionSummary,
            ticketId: ''
        };

        const ticket = await this.dao.createTicket({
            batchId,
            status: TicketStatus.CREATED,
            sessionSummary: sessionSummary as any,
            slaRuleId: request.slaRuleId,
            currentAgentId: request.sessionSummary.agentId,
            assignmentHistory: [],
            compensationApprovals: [],
            inventoryDifferences: [],
            timeoutRecords: [],
            totalCompensation: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: request.createdBy
        });

        ticket.sessionSummary.ticketId = ticket.id;

        await this.dao.createStateTransition({
            ticketId: ticket.id,
            fromStatus: TicketStatus.CREATED,
            toStatus: TicketStatus.CREATED,
            reason: '工单创建',
            operatorId: request.createdBy,
            manual: false,
            createdAt: new Date()
        });

        return ticket;
    }

    async getBatchDetail(batchId: string): Promise<{ batch: Batch; tickets: Ticket[]; failedRecords: any[] }> {
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

    async getBatchStats(batchId: string): Promise<any> {
        const batch = await this.dao.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        const tickets = await this.dao.getTicketsByBatchId(batchId);
        const statusCounts: Record<string, number> = {};
        let totalAmount = 0;
        let frozenAmount = 0;
        let settledAmount = 0;

        for (const ticket of tickets) {
            statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
            totalAmount += ticket.totalCompensation;

            if (ticket.status === TicketStatus.FROZEN) {
                frozenAmount += ticket.totalCompensation;
            }
            if (ticket.status === TicketStatus.SETTLED || ticket.status === TicketStatus.ARCHIVED) {
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
}

export default BatchService;
