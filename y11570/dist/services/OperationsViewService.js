"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsViewService = void 0;
const types_1 = require("../types");
class OperationsViewService {
    constructor(dao) {
        this.dao = dao;
    }
    async getFrozenTicketsComparison(batchId) {
        const filters = { status: types_1.TicketStatus.FROZEN };
        if (batchId)
            filters.batchId = batchId;
        const frozenTickets = await this.dao.getTickets(filters);
        const results = [];
        for (const ticket of frozenTickets) {
            const transitions = await this.dao.getStateTransitionsByTicketId(ticket.id);
            const frozenTransition = transitions.find(t => t.toStatus === types_1.TicketStatus.FROZEN);
            const manualReasons = this.extractManualReasons(transitions);
            results.push({
                ticketId: ticket.id,
                batchId: ticket.batchId,
                customerId: ticket.sessionSummary.customerId,
                issueType: ticket.sessionSummary.issueType,
                severity: ticket.sessionSummary.severity,
                statusBeforeFrozen: ticket.statusBeforeFrozen,
                currentStatus: ticket.status,
                frozenType: ticket.frozenType,
                frozenReason: ticket.frozenReason,
                frozenBy: ticket.frozenBy,
                frozenAt: ticket.frozenAt,
                totalCompensation: ticket.totalCompensation,
                frozenOperator: frozenTransition?.operatorName || frozenTransition?.operatorId,
                manualReasons,
                manualOperationCount: manualReasons.length,
                assignmentCount: (await this.dao.getAssignmentsByTicketId(ticket.id)).length,
                timeoutCount: (await this.dao.getTimeoutRecordsByTicketId(ticket.id)).length
            });
        }
        return results;
    }
    extractManualReasons(transitions) {
        return transitions
            .filter(t => t.manual)
            .map(t => ({
            fromStatus: t.fromStatus,
            toStatus: t.toStatus,
            reason: t.reason,
            operator: t.operatorName || t.operatorId,
            time: t.createdAt,
            metadata: t.metadata
        }));
    }
    async getTicketTraceability(ticketId) {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }
        const transitions = await this.dao.getStateTransitionsByTicketId(ticketId);
        const assignments = await this.dao.getAssignmentsByTicketId(ticketId);
        const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
        const approvals = await this.dao.getCompensationApprovalsByTicketId(ticketId);
        const auditLogs = await this.dao.getAuditLogs('ticket', ticketId);
        const attachments = await this.dao.getAttachmentsByTicketId(ticketId);
        const timeline = [];
        for (const transition of transitions) {
            timeline.push({
                type: 'state_transition',
                time: transition.createdAt,
                content: `${transition.fromStatus} → ${transition.toStatus}`,
                reason: transition.reason,
                operator: transition.operatorName || transition.operatorId,
                manual: transition.manual
            });
        }
        for (const assignment of assignments) {
            timeline.push({
                type: 'assignment',
                time: assignment.assignedAt,
                content: `转派: ${assignment.fromAgentId || '系统'} → ${assignment.toAgentId}`,
                reason: assignment.reason,
                typeDetail: assignment.assignmentType
            });
        }
        for (const timeout of timeouts) {
            timeline.push({
                type: 'timeout',
                time: timeout.createdAt,
                content: `超时: ${timeout.timeoutType}`,
                duration: timeout.duration,
                blameLevel: timeout.blameLevel,
                agentId: timeout.agentId
            });
        }
        for (const approval of approvals) {
            timeline.push({
                type: 'compensation',
                time: approval.createdAt,
                content: `补偿申请: ${approval.requestedAmount}`,
                status: approval.status,
                approvedAmount: approval.approvedAmount,
                reason: approval.reason,
                approver: approval.approverId
            });
        }
        for (const log of auditLogs) {
            timeline.push({
                type: 'audit',
                time: log.createdAt,
                content: `操作: ${log.action}`,
                operator: log.operatorName || log.operatorId
            });
        }
        timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        return {
            basicInfo: {
                ticketId: ticket.id,
                batchId: ticket.batchId,
                status: ticket.status,
                statusBeforeFrozen: ticket.statusBeforeFrozen,
                totalCompensation: ticket.totalCompensation,
                currentAgent: ticket.currentAgentId,
                createdAt: ticket.createdAt,
                settledAt: ticket.settledAt,
                archivedAt: ticket.archivedAt
            },
            sessionSummary: ticket.sessionSummary,
            frozenInfo: ticket.status === types_1.TicketStatus.FROZEN ? {
                frozenType: ticket.frozenType,
                frozenReason: ticket.frozenReason,
                frozenBy: ticket.frozenBy,
                frozenAt: ticket.frozenAt
            } : null,
            timeline,
            attachments,
            compensationBreakdown: {
                total: ticket.totalCompensation,
                approvals: approvals.map(a => ({
                    requested: a.requestedAmount,
                    approved: a.approvedAmount || 0,
                    status: a.status,
                    reason: a.reason
                }))
            },
            timeoutResponsibility: timeouts.reduce((acc, t) => {
                acc[t.agentId] = (acc[t.agentId] || 0) + t.blameLevel;
                return acc;
            }, {})
        };
    }
    async getSummaryReport(batchId, startDate, endDate) {
        let tickets;
        if (batchId) {
            tickets = await this.dao.getTicketsByBatchId(batchId);
        }
        else {
            tickets = await this.dao.getTickets({});
        }
        if (startDate || endDate) {
            tickets = tickets.filter(t => {
                const created = new Date(t.createdAt);
                if (startDate && created < startDate)
                    return false;
                if (endDate && created > endDate)
                    return false;
                return true;
            });
        }
        const statusBreakdown = {};
        const issueTypeBreakdown = {};
        const frozenByReason = {};
        const frozenByType = {};
        let totalAmount = 0;
        let frozenAmount = 0;
        let settledAmount = 0;
        let totalTimeoutCount = 0;
        let totalAssignmentCount = 0;
        let ticketWithTimeoutCount = 0;
        for (const ticket of tickets) {
            statusBreakdown[ticket.status] = (statusBreakdown[ticket.status] || 0) + 1;
            totalAmount += ticket.totalCompensation;
            if (!issueTypeBreakdown[ticket.sessionSummary.issueType]) {
                issueTypeBreakdown[ticket.sessionSummary.issueType] = { count: 0, amount: 0 };
            }
            issueTypeBreakdown[ticket.sessionSummary.issueType].count++;
            issueTypeBreakdown[ticket.sessionSummary.issueType].amount += ticket.totalCompensation;
            if (ticket.status === types_1.TicketStatus.FROZEN) {
                frozenAmount += ticket.totalCompensation;
                if (ticket.frozenReason) {
                    frozenByReason[ticket.frozenReason] = (frozenByReason[ticket.frozenReason] || 0) + 1;
                }
                if (ticket.frozenType) {
                    frozenByType[ticket.frozenType] = (frozenByType[ticket.frozenType] || 0) + 1;
                }
            }
            if (ticket.status === types_1.TicketStatus.SETTLED || ticket.status === types_1.TicketStatus.ARCHIVED) {
                settledAmount += ticket.totalCompensation;
            }
            const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
            const assignments = await this.dao.getAssignmentsByTicketId(ticket.id);
            totalTimeoutCount += timeouts.length;
            totalAssignmentCount += assignments.length;
            if (timeouts.length > 0)
                ticketWithTimeoutCount++;
        }
        return {
            summary: {
                totalTickets: tickets.length,
                totalAmount,
                frozenAmount,
                settledAmount,
                pendingAmount: totalAmount - frozenAmount - settledAmount,
                frozenRate: tickets.length > 0 ?
                    ((statusBreakdown[types_1.TicketStatus.FROZEN] || 0) / tickets.length * 100).toFixed(2) + '%' : '0%',
                averageAmount: tickets.length > 0 ? (totalAmount / tickets.length).toFixed(2) : 0
            },
            statusBreakdown,
            issueTypeBreakdown,
            frozenAnalysis: {
                byReason: frozenByReason,
                byType: frozenByType
            },
            operationsMetrics: {
                totalTimeoutCount,
                totalAssignmentCount,
                ticketWithTimeoutCount,
                timeoutRate: tickets.length > 0 ?
                    (ticketWithTimeoutCount / tickets.length * 100).toFixed(2) + '%' : '0%',
                averageAssignmentsPerTicket: tickets.length > 0 ?
                    (totalAssignmentCount / tickets.length).toFixed(2) : 0
            }
        };
    }
    async getBatchComparisonReport(batchIds) {
        const results = [];
        for (const batchId of batchIds) {
            const batch = await this.dao.getBatchById(batchId);
            if (!batch)
                continue;
            const tickets = await this.dao.getTicketsByBatchId(batchId);
            const frozenTickets = tickets.filter(t => t.status === types_1.TicketStatus.FROZEN);
            const settledTickets = tickets.filter(t => t.status === types_1.TicketStatus.SETTLED || t.status === types_1.TicketStatus.ARCHIVED);
            let totalAmount = 0;
            let frozenAmount = 0;
            let settledAmount = 0;
            let totalTimeoutCount = 0;
            for (const ticket of tickets) {
                totalAmount += ticket.totalCompensation;
                if (ticket.status === types_1.TicketStatus.FROZEN)
                    frozenAmount += ticket.totalCompensation;
                if (ticket.status === types_1.TicketStatus.SETTLED || ticket.status === types_1.TicketStatus.ARCHIVED)
                    settledAmount += ticket.totalCompensation;
                const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
                totalTimeoutCount += timeouts.length;
            }
            results.push({
                batchId: batch.id,
                batchName: batch.name,
                status: batch.status,
                ticketCount: tickets.length,
                totalAmount,
                frozenCount: frozenTickets.length,
                frozenAmount,
                settledCount: settledTickets.length,
                settledAmount,
                timeoutCount: totalTimeoutCount,
                avgAmount: tickets.length > 0 ? (totalAmount / tickets.length).toFixed(2) : 0,
                frozenRate: tickets.length > 0 ?
                    ((frozenTickets.length / tickets.length) * 100).toFixed(2) + '%' : '0%'
            });
        }
        return results;
    }
    async verifyDataConsistency(ticketId) {
        const issues = [];
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            return { consistent: false, issues: ['Ticket not found'] };
        }
        const transitions = await this.dao.getStateTransitionsByTicketId(ticketId);
        const approvals = await this.dao.getCompensationApprovalsByTicketId(ticketId);
        if (transitions.length > 0) {
            const lastTransition = transitions[transitions.length - 1];
            if (lastTransition.toStatus !== ticket.status && ticket.status !== types_1.TicketStatus.FROZEN) {
                issues.push(`状态不一致: 最后流转记录是 ${lastTransition.toStatus}，但工单当前状态是 ${ticket.status}`);
            }
        }
        const approvedTotal = approvals
            .filter(a => a.status === 'approved')
            .reduce((sum, a) => sum + (a.approvedAmount || 0), 0);
        if (Math.abs(approvedTotal - ticket.totalCompensation) > 0.01) {
            issues.push(`补偿金额不一致: 审批通过总额 ${approvedTotal}，但工单总补偿是 ${ticket.totalCompensation}`);
        }
        if (ticket.batchId) {
            const batch = await this.dao.getBatchById(ticket.batchId);
            if (batch) {
                const batchTickets = await this.dao.getTicketsByBatchId(ticket.batchId);
                const actualAmount = batchTickets.reduce((sum, t) => sum + t.totalCompensation, 0);
                if (Math.abs(actualAmount - batch.totalAmount) > 0.01) {
                    issues.push(`批次金额不一致: 批次记录 ${batch.totalAmount}，实际计算 ${actualAmount}`);
                }
            }
        }
        return {
            consistent: issues.length === 0,
            issues
        };
    }
    async getFailedRecordsSummary(batchId) {
        const failedRecords = await this.dao.getFailedRecords(batchId ? { batchId } : {});
        const byErrorCode = {};
        const byRecordType = {};
        for (const record of failedRecords) {
            byErrorCode[record.errorCode] = (byErrorCode[record.errorCode] || 0) + 1;
            byRecordType[record.recordType] = (byRecordType[record.recordType] || 0) + 1;
        }
        return {
            totalFailed: failedRecords.length,
            retried: failedRecords.filter(r => r.retried).length,
            byErrorCode,
            byRecordType,
            recentFailures: failedRecords.slice(0, 50).map(r => ({
                id: r.id,
                ticketId: r.ticketId,
                recordType: r.recordType,
                errorCode: r.errorCode,
                errorMessage: r.errorMessage,
                failedAt: r.failedAt,
                retried: r.retried
            }))
        };
    }
}
exports.OperationsViewService = OperationsViewService;
exports.default = OperationsViewService;
//# sourceMappingURL=OperationsViewService.js.map