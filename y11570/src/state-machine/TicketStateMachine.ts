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
        [TicketStatus.FROZEN, [TicketStatus.CREATED, TicketStatus.ASSIGNED, TicketStatus.PROCESSING, TicketStatus.ESCALATED, TicketStatus.COMPENSATION_APPROVING, TicketStatus.COMPENSATION_APPROVED, TicketStatus.COMPENSATION_REJECTED, TicketStatus.SETTLED, TicketStatus.CLOSED, TicketStatus.ARCHIVED]],
        [TicketStatus.SETTLED, [TicketStatus.ARCHIVED, TicketStatus.FROZEN, TicketStatus.PROCESSING]],
        [TicketStatus.ARCHIVED, [TicketStatus.FROZEN, TicketStatus.SETTLED]],
        [TicketStatus.CLOSED, [TicketStatus.FROZEN, TicketStatus.PROCESSING]]
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

    async calculateAgentTimeoutResponsibility(ticketId: string): Promise<Map<string, number>> {
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
        const approvalStatus = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        const finalAmount = approved ? approvedAmount : 0;

        await this.dao.updateCompensationApproval(approvalId, approvalStatus, finalAmount, operatorId);

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

        if (ticket.status !== TicketStatus.SETTLED && ticket.status !== TicketStatus.CLOSED) {
            throw new Error('Only settled or closed tickets can be archived');
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
        ticket.inventoryDifferences = await this.dao.getInventoryDifferencesByTicketId(ticketId);

        return ticket;
    }

    async calculateFullResponsibility(ticketId: string): Promise<any> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const slaRule = await this.dao.getSLARuleById(ticket.slaRuleId);
        const assignments = await this.dao.getAssignmentsByTicketId(ticketId);
        const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
        const approvals = await this.dao.getCompensationApprovalsByTicketId(ticketId);
        const inventoryDiffs = await this.dao.getInventoryDifferencesByTicketId(ticketId);
        const transitions = await this.dao.getStateTransitionsByTicketId(ticketId);

        const responsibility: any = {
            ticketId,
            basicInfo: {
                issueType: ticket.sessionSummary.issueType,
                severity: ticket.sessionSummary.severity,
                description: ticket.sessionSummary.description,
                initialContactTime: ticket.sessionSummary.initialContactTime,
                expectedResolutionTime: ticket.sessionSummary.expectedResolutionTime
            },
            sources: {
                sessionSummary: true,
                slaRule: !!slaRule,
                compensationApprovals: approvals.length > 0,
                inventoryDifferences: inventoryDiffs.length > 0
            },
            slaDetails: slaRule ? {
                ticketType: slaRule.ticketType,
                priority: slaRule.priority,
                firstResponseTime: slaRule.firstResponseTime,
                resolutionTime: slaRule.resolutionTime,
                escalationThreshold: slaRule.escalationThreshold
            } : null,
            assignmentResponsibility: this.calculateAssignmentResponsibility(assignments, timeouts),
            timeoutResponsibility: this.summarizeTimeoutResponsibility(timeouts),
            compensationResponsibility: this.calculateCompensationResponsibility(approvals, transitions),
            inventoryResponsibility: this.calculateInventoryResponsibility(inventoryDiffs),
            totalCompensation: ticket.totalCompensation
        };

        responsibility.summary = this.generateResponsibilitySummary(responsibility);

        return responsibility;
    }

    private calculateAssignmentResponsibility(assignments: any[], timeouts: any[]): any {
        const agentStats: Record<string, { assignments: number; timeouts: number; blameScore: number }> = {};

        for (const assignment of assignments) {
            const agentId = assignment.toAgentId;
            if (!agentStats[agentId]) {
                agentStats[agentId] = { assignments: 0, timeouts: 0, blameScore: 0 };
            }
            agentStats[agentId].assignments++;
        }

        for (const timeout of timeouts) {
            const agentId = timeout.agentId;
            if (!agentStats[agentId]) {
                agentStats[agentId] = { assignments: 0, timeouts: 0, blameScore: 0 };
            }
            agentStats[agentId].timeouts++;
            agentStats[agentId].blameScore += timeout.blameLevel;
        }

        return {
            totalAssignments: assignments.length,
            totalReassignments: assignments.filter((a: any) => a.fromAgentId).length,
            agentStats,
            bottleneckAgents: Object.entries(agentStats)
                .filter(([_, stats]) => stats.timeouts > 0)
                .sort((a, b) => b[1].blameScore - a[1].blameScore)
                .map(([agentId, stats]) => ({ agentId, ...stats }))
        };
    }

    private summarizeTimeoutResponsibility(timeouts: any[]): any {
        const byType: Record<string, number> = {};
        const byAgent: Record<string, number> = {};
        let totalDuration = 0;
        let totalBlame = 0;

        for (const timeout of timeouts) {
            byType[timeout.timeoutType] = (byType[timeout.timeoutType] || 0) + 1;
            byAgent[timeout.agentId] = (byAgent[timeout.agentId] || 0) + timeout.blameLevel;
            totalDuration += timeout.duration;
            totalBlame += timeout.blameLevel;
        }

        return {
            totalTimeouts: timeouts.length,
            totalDurationMinutes: Math.round(totalDuration),
            totalBlameScore: totalBlame,
            byType,
            byAgent,
            averageBlamePerTimeout: timeouts.length > 0 ? (totalBlame / timeouts.length).toFixed(2) : 0
        };
    }

    private calculateCompensationResponsibility(approvals: any[], transitions: any[]): any {
        const approved = approvals.filter(a => a.status === 'approved');
        const rejected = approvals.filter(a => a.status === 'rejected');
        const pending = approvals.filter(a => a.status === 'pending');

        const approvedTotal = approved.reduce((sum, a) => sum + (a.approvedAmount || 0), 0);
        const requestedTotal = approvals.reduce((sum, a) => sum + a.requestedAmount, 0);

        const approverStats: Record<string, { approved: number; rejected: number; totalAmount: number }> = {};

        for (const approval of approvals) {
            if (approval.approverId) {
                if (!approverStats[approval.approverId]) {
                    approverStats[approval.approverId] = { approved: 0, rejected: 0, totalAmount: 0 };
                }
                if (approval.status === 'approved') {
                    approverStats[approval.approverId].approved++;
                    approverStats[approval.approverId].totalAmount += approval.approvedAmount || 0;
                } else if (approval.status === 'rejected') {
                    approverStats[approval.approverId].rejected++;
                }
            }
        }

        const stuckStep = this.findCompensationStuckStep(approvals, transitions);

        return {
            totalRequests: approvals.length,
            approvedCount: approved.length,
            rejectedCount: rejected.length,
            pendingCount: pending.length,
            totalRequestedAmount: requestedTotal,
            totalApprovedAmount: approvedTotal,
            approvalRate: approvals.length > 0 ? ((approved.length / approvals.length) * 100).toFixed(2) + '%' : '0%',
            approverStats,
            stuckStep
        };
    }

    private findCompensationStuckStep(approvals: any[], transitions: any[]): any {
        if (approvals.length === 0) {
            return { stuck: false };
        }

        const pendingApproval = approvals.find(a => a.status === 'pending');
        if (pendingApproval) {
            return {
                stuck: true,
                step: '等待补偿审批',
                waitingSince: pendingApproval.createdAt,
                requestedAmount: pendingApproval.requestedAmount,
                reason: pendingApproval.reason
            };
        }

        const approved = approvals.filter(a => a.status === 'approved');
        if (approved.length > 0) {
            const lastApproval = approved[approved.length - 1];
            const settleTransition = transitions.find(t => t.toStatus === 'settled');
            if (!settleTransition) {
                return {
                    stuck: true,
                    step: '等待结算',
                    approvedAt: lastApproval.approvedAt,
                    approvedAmount: lastApproval.approvedAmount,
                    reason: '补偿已审批但尚未结算'
                };
            }
        }

        return { stuck: false };
    }

    private calculateInventoryResponsibility(inventoryDiffs: any[]): any {
        if (inventoryDiffs.length === 0) {
            return { hasDifferences: false, totalDifferences: 0 };
        }

        let totalMissing = 0;
        let totalExtra = 0;
        const byProduct: Record<string, { expected: number; actual: number; diff: number; reason?: string }> = {};
        const unresolvedDiffs: any[] = [];

        for (const diff of inventoryDiffs) {
            byProduct[diff.productId] = {
                expected: diff.expectedQuantity,
                actual: diff.actualQuantity,
                diff: diff.difference,
                reason: diff.reason
            };

            if (diff.difference < 0) {
                totalMissing += Math.abs(diff.difference);
            } else {
                totalExtra += diff.difference;
            }

            if (!diff.reason) {
                unresolvedDiffs.push(diff);
            }
        }

        return {
            hasDifferences: true,
            totalRecords: inventoryDiffs.length,
            totalMissing,
            totalExtra,
            netDifference: totalExtra - totalMissing,
            byProduct,
            unresolvedCount: unresolvedDiffs.length,
            unresolvedDiffs
        };
    }

    private generateResponsibilitySummary(detail: any): any {
        const warnings: string[] = [];
        const recommendations: string[] = [];

        if (detail.assignmentResponsibility.bottleneckAgents.length > 0) {
            const topBottleneck = detail.assignmentResponsibility.bottleneckAgents[0];
            warnings.push(`坐席 ${topBottleneck.agentId} 存在 ${topBottleneck.timeouts} 次超时，责任分 ${topBottleneck.blameScore}`);
        }

        if (detail.compensationResponsibility.stuckStep?.stuck) {
            warnings.push(`补偿流程卡壳在: ${detail.compensationResponsibility.stuckStep.step}`);
            recommendations.push(`请尽快处理 ${detail.compensationResponsibility.stuckStep.step}`);
        }

        if (detail.inventoryResponsibility.unresolvedCount > 0) {
            warnings.push(`${detail.inventoryResponsibility.unresolvedCount} 条盘点差异未说明原因`);
            recommendations.push('请补充盘点差异原因');
        }

        return {
            totalAgentsInvolved: Object.keys(detail.assignmentResponsibility.agentStats).length,
            totalBlameScore: detail.timeoutResponsibility.totalBlameScore,
            warnings,
            recommendations,
            primaryResponsibleAgent: detail.assignmentResponsibility.bottleneckAgents.length > 0
                ? detail.assignmentResponsibility.bottleneckAgents[0].agentId
                : null
        };
    }

    async unarchiveTicket(
        ticketId: string,
        reason: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`工单不存在: ${ticketId}`);
        }

        if (ticket.status !== TicketStatus.ARCHIVED) {
            throw new Error('只能取消归档已归档的工单');
        }

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'unarchive',
            oldValue: ticket.status,
            newValue: TicketStatus.SETTLED,
            operatorId,
            createdAt: new Date()
        });

        return this.transition(
            ticketId,
            TicketStatus.SETTLED,
            `工单已取消归档: ${reason}`,
            operatorId,
            undefined,
            { unarchiveReason: reason }
        );
    }

    async reviewTicket(
        ticketId: string,
        reviewResult: 'approved' | 'rejected' | 'escalated',
        reviewComments: string,
        operatorId: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`工单不存在: ${ticketId}`);
        }

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'review',
            oldValue: ticket.status,
            newValue: reviewResult,
            operatorId,
            createdAt: new Date()
        });

        await this.dao.createStateTransition({
            ticketId,
            fromStatus: ticket.status,
            toStatus: ticket.status,
            reason: `复核结果: ${reviewResult}, 评论: ${reviewComments}`,
            operatorId,
            manual: true,
            metadata: { reviewResult, reviewComments },
            createdAt: new Date()
        });

        const updatedTicket = await this.dao.getTicketById(ticketId);
        if (!updatedTicket) {
            throw new Error(`获取更新后工单失败: ${ticketId}`);
        }

        return updatedTicket;
    }

    async overrideTicket(
        ticketId: string,
        toStatus: TicketStatus,
        overrideReason: string,
        newCompensation?: number,
        operatorId?: string
    ): Promise<Ticket> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`工单不存在: ${ticketId}`);
        }

        const operator = operatorId || 'SYSTEM_OVERRIDE';

        if (newCompensation !== undefined) {
            await this.dao.updateTicketCompensation(ticketId, newCompensation);
        }

        await this.dao.createAuditLog({
            entityType: 'ticket',
            entityId: ticketId,
            action: 'override',
            oldValue: `${ticket.status}|${ticket.totalCompensation || 0}`,
            newValue: `${toStatus}|${newCompensation !== undefined ? newCompensation : ticket.totalCompensation || 0}`,
            operatorId: operator,
            createdAt: new Date()
        });

        return this.transition(
            ticketId,
            toStatus,
            `人工改判: ${overrideReason}`,
            operator,
            undefined,
            {
                overrideReason,
                newCompensation,
                previousCompensation: ticket.totalCompensation || 0
            }
        );
    }
}

export default TicketStateMachine;
