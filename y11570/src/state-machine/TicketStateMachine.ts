import {
    Ticket,
    TicketStatus,
    AssignmentType,
    AssignmentRecord,
    TimeoutRecord,
    StateTransition,
    ApprovalStatus,
    FrozenType,
    SLARule,
    CompensationRule
} from '../types';
import TicketDao from '../daos/TicketDao';

export class InvalidStateTransitionError extends Error {
    constructor(from: TicketStatus, to: TicketStatus) {
        super(`Invalid state transition from ${from} to ${to}`);
        this.name = 'InvalidStateTransitionError';
    }
}

export class TicketStateMachine {
    private static readonly VALID_TRANSITIONS: Map<TicketStatus, TicketStatus[]> = new Map([
        [TicketStatus.CREATED, [TicketStatus.ASSIGNED, TicketStatus.PROCESSING, TicketStatus.FROZEN, TicketStatus.CLOSED]],
        [TicketStatus.ASSIGNED, [TicketStatus.PROCESSING, TicketStatus.ESCALATED, TicketStatus.FROZEN, TicketStatus.CLOSED]],
        [TicketStatus.PROCESSING, [TicketStatus.COMPENSATION_APPROVING, TicketStatus.ESCALATED, TicketStatus.FROZEN, TicketStatus.SETTLED, TicketStatus.CLOSED]],
        [TicketStatus.ESCALATED, [TicketStatus.PROCESSING, TicketStatus.COMPENSATION_APPROVING, TicketStatus.FROZEN, TicketStatus.CLOSED]],
        [TicketStatus.COMPENSATION_APPROVING, [TicketStatus.COMPENSATION_APPROVED, TicketStatus.COMPENSATION_REJECTED, TicketStatus.FROZEN]],
        [TicketStatus.COMPENSATION_APPROVED, [TicketStatus.PROCESSING, TicketStatus.SETTLED, TicketStatus.FROZEN]],
        [TicketStatus.COMPENSATION_REJECTED, [TicketStatus.PROCESSING, TicketStatus.ESCALATED, TicketStatus.FROZEN, TicketStatus.CLOSED]],
        [TicketStatus.FROZEN, [TicketStatus.FROZEN]],
        [TicketStatus.SETTLED, [TicketStatus.ARCHIVED, TicketStatus.FROZEN]],
        [TicketStatus.ARCHIVED, [TicketStatus.FROZEN]],
        [TicketStatus.CLOSED, [TicketStatus.FROZEN]]
    ]);

    private dao: TicketDao;

    constructor(dao: TicketDao) {
        this.dao = dao;
    }

    canTransition(from: TicketStatus, to: TicketStatus): boolean {
        if (to === TicketStatus.FROZEN) {
            return true;
        }
        const validNextStates = TicketStateMachine.VALID_TRANSITIONS.get(from);
        return validNextStates ? validNextStates.includes(to) : false;
    }

    async transition(
        ticketId: string,
        toStatus: TicketStatus,
        reason: string,
        operatorId: string,
        operatorName?: string,
        metadata?: Record<string, any>
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const fromStatus = ticket.status;

        if (toStatus === TicketStatus.FROZEN && fromStatus === TicketStatus.FROZEN) {
            throw new InvalidStateTransitionError(fromStatus, toStatus);
        }

        if (!this.canTransition(fromStatus, toStatus)) {
            throw new InvalidStateTransitionError(fromStatus, toStatus);
        }

        const statusBeforeFrozen = toStatus === TicketStatus.FROZEN ? fromStatus : undefined;

        await this.dao.updateTicketStatus(ticketId, toStatus, statusBeforeFrozen);

        await this.dao.createStateTransition({
            ticketId,
            fromStatus,
            toStatus,
            reason,
            operatorId,
            operatorName,
            manual: true,
            metadata,
            createdAt: new Date()
        });

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'status_change',
            oldValue: fromStatus,
            newValue: toStatus,
            operatorId,
            operatorName,
            createdAt: new Date()
        });

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`Failed to retrieve updated ticket ${ticketId}`);
        }

        return updatedTicket;
    }

    async reassignTicket(
        ticketId: string,
        toAgentId: string,
        assignmentType: AssignmentType,
        reason: string,
        operatorId: string,
        slaRule?: SLARule
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status === TicketStatus.FROZEN) {
            throw new Error('Cannot reassign a frozen ticket');
        }

        const fromAgentId = ticket.currentAgentId;

        let expectedCompleteTime: Date | undefined;
        if (slaRule) {
            expectedCompleteTime = new Date(Date.now() + slaRule.resolutionTime * 60 * 1000);
        }

        const assignment = await this.dao.createAssignment({
            ticketId,
            fromAgentId,
            toAgentId,
            assignmentType,
            reason,
            assignedAt: new Date(),
            expectedCompleteTime
        });

        await this.dao.updateTicketAgent(ticketId, toAgentId);

        if (ticket.status === TicketStatus.CREATED) {
            await this.transition(
                ticketId,
                TicketStatus.ASSIGNED,
                `工单已分配给坐席 ${toAgentId}`,
                operatorId
            );
        }

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'reassign',
            oldValue: fromAgentId,
            newValue: toAgentId,
            operatorId,
            createdAt: new Date()
        });

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`Failed to retrieve updated ticket ${ticketId}`);
        }

        updatedTicket.assignmentHistory = await this.dao.getAssignmentsByTicketId(ticketId);

        return updatedTicket;
    }

    async checkForTimeout(
        ticketId: string,
        slaRule: SLARule
    ): Promise<TimeoutRecord[]> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const assignments = await this.dao.getAssignmentsByTicketId(ticketId);
        const timeoutRecords: TimeoutRecord[] = [];

        for (const assignment of assignments) {
            if (!assignment.expectedCompleteTime) continue;

            const now = new Date();
            const expectedTime = new Date(assignment.expectedCompleteTime);

            if (now > expectedTime) {
                const duration = (now.getTime() - expectedTime.getTime()) / (1000 * 60);
                const blameLevel = this.calculateBlameLevel(duration, slaRule);

                const existingTimeout = await this.dao.getTimeoutRecordsByTicketId(ticketId);
                const alreadyRecorded = existingTimeout.some(
                    t => t.assignmentId === assignment.id
                );

                if (!alreadyRecorded) {
                    const timeoutRecord = await this.dao.createTimeoutRecord({
                        ticketId,
                        assignmentId: assignment.id,
                        agentId: assignment.toAgentId,
                        timeoutType: 'resolution',
                        duration,
                        blameLevel,
                        createdAt: new Date()
                    });
                    timeoutRecords.push(timeoutRecord);
                }
            }
        }

        return timeoutRecords;
    }

    private calculateBlameLevel(duration: number, slaRule: SLARule): number {
        const ratio = duration / slaRule.resolutionTime;
        if (ratio < 1.5) return 1;
        if (ratio < 2) return 2;
        if (ratio < 3) return 3;
        return 4;
    }

    async calculateTimeoutResponsibility(ticketId: string): Promise<Map<string, number>> {
        const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
        const responsibility = new Map<string, number>();

        for (const timeout of timeouts) {
            const current = responsibility.get(timeout.agentId) || 0;
            responsibility.set(timeout.agentId, current + timeout.blameLevel);
        }

        return responsibility;
    }

    async calculateCompensation(
        ticketId: string,
        compensationRules: CompensationRule[],
        baseAmount?: number
    ): Promise<number> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const issueType = ticket.sessionSummary.issueType;
        const rule = compensationRules.find(r => r.issueType === issueType);

        if (!rule && !baseAmount) {
            throw new Error(`No compensation rule found for issue type: ${issueType}`);
        }

        const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
        const totalBlame = timeouts.reduce((sum, t) => sum + t.blameLevel, 0);

        const base = baseAmount || rule!.baseAmount;
        const multiplier = rule ? rule.multiplier : 1;
        const maxAmount = rule ? rule.maxAmount : base * 3;

        let compensation = base * (1 + (totalBlame * 0.1) * multiplier);
        compensation = Math.min(compensation, maxAmount);

        return Math.round(compensation * 100) / 100;
    }

    async requestCompensation(
        ticketId: string,
        requestedAmount: number,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status === TicketStatus.FROZEN) {
            throw new Error('Cannot request compensation for a frozen ticket');
        }

        await this.dao.createCompensationApproval({
            ticketId,
            requestedAmount,
            status: ApprovalStatus.PENDING,
            reason,
            createdAt: new Date()
        });

        const updatedTicket = await this.transition(
            ticketId,
            TicketStatus.COMPENSATION_APPROVING,
            `补偿申请已提交，申请金额: ${requestedAmount}`,
            operatorId
        );

        return updatedTicket;
    }

    async reviewCompensation(
        ticketId: string,
        approvalId: string,
        approved: boolean,
        approvedAmount: number | undefined,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status !== TicketStatus.COMPENSATION_APPROVING) {
            throw new Error('Ticket is not in compensation approving status');
        }

        const newStatus = approved ? TicketStatus.COMPENSATION_APPROVED : TicketStatus.COMPENSATION_REJECTED;
        const finalAmount = approved ? approvedAmount : 0;

        await this.dao.updateCompensationApproval(approvalId, newStatus, finalAmount, operatorId);

        if (approved && finalAmount) {
            await this.dao.addTotalCompensation(ticketId, finalAmount);
        }

        const updatedTicket = await this.transition(
            ticketId,
            newStatus,
            `补偿审批${approved ? '通过' : '拒绝'}，${approved ? `审批金额: ${finalAmount}` : `拒绝理由: ${reason}`}`,
            operatorId
        );

        if (ticket.batchId) {
            await this.dao.updateBatchStats(ticket.batchId);
        }

        return updatedTicket;
    }

    async freezeTicket(
        ticketId: string,
        frozenType: FrozenType,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status === TicketStatus.FROZEN) {
            throw new Error('Ticket is already frozen');
        }

        await this.dao.freezeTicket(ticketId, frozenType, reason, operatorId);
        const updatedTicket = await this.transition(
            ticketId,
            TicketStatus.FROZEN,
            `工单已冻结，冻结类型: ${frozenType}，冻结理由: ${reason}`,
            operatorId
        );

        if (ticket.batchId) {
            await this.dao.updateBatchStats(ticket.batchId);
        }

        return updatedTicket;
    }

    async unfreezeTicket(
        ticketId: string,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status !== TicketStatus.FROZEN) {
            throw new Error('Ticket is not frozen');
        }

        if (!ticket.statusBeforeFrozen) {
            throw new Error('No status before frozen found');
        }

        await this.dao.unfreezeTicket(ticketId);

        await this.dao.createStateTransition({
            ticketId,
            fromStatus: TicketStatus.FROZEN,
            toStatus: ticket.statusBeforeFrozen,
            reason: `工单已解冻，解冻理由: ${reason}`,
            operatorId,
            manual: true,
            metadata: { frozenType: ticket.frozenType, frozenReason: ticket.frozenReason },
            createdAt: new Date()
        });

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'unfreeze',
            oldValue: TicketStatus.FROZEN,
            newValue: ticket.statusBeforeFrozen,
            operatorId,
            createdAt: new Date()
        });

        if (ticket.batchId) {
            await this.dao.updateBatchStats(ticket.batchId);
        }

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`Failed to retrieve updated ticket ${ticketId}`);
        }

        return updatedTicket;
    }

    async settleTicket(
        ticketId: string,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status === TicketStatus.FROZEN) {
            throw new Error('Cannot settle a frozen ticket');
        }

        await this.dao.settleTicket(ticketId);

        await this.dao.createStateTransition({
            ticketId,
            fromStatus: ticket.status,
            toStatus: TicketStatus.SETTLED,
            reason: `工单已结算: ${reason}`,
            operatorId,
            manual: true,
            createdAt: new Date()
        });

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'settle',
            oldValue: ticket.status,
            newValue: TicketStatus.SETTLED,
            operatorId,
            createdAt: new Date()
        });

        if (ticket.batchId) {
            await this.dao.updateBatchStats(ticket.batchId);
        }

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`Failed to retrieve updated ticket ${ticketId}`);
        }

        return updatedTicket;
    }

    async archiveTicket(
        ticketId: string,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.status !== TicketStatus.SETTLED) {
            throw new Error('Only settled tickets can be archived');
        }

        await this.dao.archiveTicket(ticketId);

        await this.dao.createStateTransition({
            ticketId,
            fromStatus: ticket.status,
            toStatus: TicketStatus.ARCHIVED,
            reason: `工单已归档: ${reason}`,
            operatorId,
            manual: true,
            createdAt: new Date()
        });

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'archive',
            oldValue: ticket.status,
            newValue: TicketStatus.ARCHIVED,
            operatorId,
            createdAt: new Date()
        });

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`Failed to retrieve updated ticket ${ticketId}`);
        }

        return updatedTicket;
    }

    async getTicketDetail(ticketId: string): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        ticket.assignmentHistory = await this.dao.getAssignmentsByTicketId(ticketId);
        ticket.compensationApprovals = await this.dao.getCompensationApprovalsByTicketId(ticketId);
        ticket.timeoutRecords = await this.dao.getTimeoutRecordsByTicketId(ticketId);

        return ticket;
    }
}

export default TicketStateMachine;
