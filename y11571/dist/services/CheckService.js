"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkService = exports.CheckService = void 0;
const FileStorage_1 = require("../storage/FileStorage");
class CheckService {
    runAllChecks() {
        const result = {
            totalIssues: 0,
            slaViolations: [],
            assignmentConflicts: [],
            pendingCompensations: [],
            orphanedRecords: [],
            dataInconsistencies: [],
        };
        result.slaViolations = this.checkSLAViolations();
        result.assignmentConflicts = this.checkAssignmentConflicts();
        result.pendingCompensations = this.checkPendingCompensations();
        result.orphanedRecords = this.checkOrphanedRecords();
        result.dataInconsistencies = this.checkDataInconsistencies();
        result.totalIssues =
            result.slaViolations.length +
                result.assignmentConflicts.length +
                result.pendingCompensations.length +
                result.orphanedRecords.length +
                result.dataInconsistencies.length;
        return result;
    }
    checkSLAViolations() {
        const slaRules = FileStorage_1.storage.getSLARules();
        const now = new Date();
        return slaRules.filter((rule) => {
            if (rule.isViolated) {
                return true;
            }
            const deadline = new Date(rule.deadline);
            return now > deadline;
        });
    }
    checkAssignmentConflicts() {
        const tickets = FileStorage_1.storage.getTickets();
        const assignments = FileStorage_1.storage.getAssignmentHistories();
        const slaRules = FileStorage_1.storage.getSLARules();
        const compensations = FileStorage_1.storage.getCompensationApprovals();
        const conflicts = [];
        for (const ticket of tickets) {
            const ticketAssignments = assignments
                .filter((a) => a.ticketId === ticket.id)
                .sort((a, b) => new Date(a.transferredAt).getTime() - new Date(b.transferredAt).getTime());
            if (ticketAssignments.length >= 2) {
                const ticketSLA = slaRules.find((s) => s.ticketId === ticket.id);
                const ticketCompensations = compensations.filter((c) => c.ticketId === ticket.id);
                const totalCompensation = ticketCompensations.reduce((sum, c) => sum + c.amount, 0);
                const timeoutResponsible = this.determineTimeoutResponsible(ticketAssignments, ticketSLA);
                let remarks = '';
                if (ticketSLA?.isViolated) {
                    remarks += `SLA已违规; `;
                }
                if (totalCompensation > 0) {
                    remarks += `涉及补偿金额: ¥${totalCompensation}`;
                }
                conflicts.push({
                    ticketId: ticket.id,
                    ticketNo: ticket.ticketNo,
                    transfers: ticketAssignments,
                    timeoutResponsible,
                    compensationAmount: totalCompensation,
                    remarks: remarks || '多次转派，请关注责任划分',
                });
            }
        }
        return conflicts;
    }
    determineTimeoutResponsible(assignments, slaRule) {
        const responsible = [];
        if (!slaRule || !slaRule.isViolated) {
            return responsible;
        }
        const deadline = new Date(slaRule.deadline).getTime();
        for (let i = 0; i < assignments.length; i++) {
            const current = assignments[i];
            const next = assignments[i + 1];
            const transferTime = new Date(current.transferredAt).getTime();
            const endTime = next ? new Date(next.transferredAt).getTime() : Date.now();
            if (transferTime < deadline && endTime > deadline) {
                responsible.push(current.toAssignee);
            }
            else if (transferTime >= deadline) {
                responsible.push(current.toAssignee);
            }
        }
        return [...new Set(responsible)];
    }
    checkPendingCompensations() {
        return FileStorage_1.storage.getCompensationApprovals().filter((c) => c.status === 'pending');
    }
    checkOrphanedRecords() {
        const tickets = FileStorage_1.storage.getTickets();
        const ticketIds = new Set(tickets.map((t) => t.id));
        const orphans = [];
        const sessionSummaries = FileStorage_1.storage.getSessionSummaries();
        for (const s of sessionSummaries) {
            if (!ticketIds.has(s.ticketId)) {
                orphans.push({ type: 'sessionSummary', id: s.id, ticketId: s.ticketId });
            }
        }
        const slaRules = FileStorage_1.storage.getSLARules();
        for (const r of slaRules) {
            if (!ticketIds.has(r.ticketId)) {
                orphans.push({ type: 'slaRule', id: r.id, ticketId: r.ticketId });
            }
        }
        const compensations = FileStorage_1.storage.getCompensationApprovals();
        for (const c of compensations) {
            if (!ticketIds.has(c.ticketId)) {
                orphans.push({ type: 'compensationApproval', id: c.id, ticketId: c.ticketId });
            }
        }
        const notes = FileStorage_1.storage.getCustomerServiceNotes();
        for (const n of notes) {
            if (!ticketIds.has(n.ticketId)) {
                orphans.push({ type: 'customerServiceNote', id: n.id, ticketId: n.ticketId });
            }
        }
        const photos = FileStorage_1.storage.getExceptionPhotos();
        for (const p of photos) {
            if (!ticketIds.has(p.ticketId)) {
                orphans.push({ type: 'exceptionPhoto', id: p.id, ticketId: p.ticketId });
            }
        }
        const histories = FileStorage_1.storage.getAssignmentHistories();
        for (const h of histories) {
            if (!ticketIds.has(h.ticketId)) {
                orphans.push({ type: 'assignmentHistory', id: h.id, ticketId: h.ticketId });
            }
        }
        return orphans;
    }
    checkDataInconsistencies() {
        const issues = [];
        const tickets = FileStorage_1.storage.getTickets();
        const slaRules = FileStorage_1.storage.getSLARules();
        for (const ticket of tickets) {
            const ticketSLAs = slaRules.filter((s) => s.ticketId === ticket.id);
            if (ticket.status === 'closed' || ticket.status === 'resolved') {
                for (const sla of ticketSLAs) {
                    if (!sla.actualResolutionTime) {
                        issues.push({
                            type: 'sla',
                            ticketId: ticket.id,
                            issue: `工单 ${ticket.ticketNo} 已关闭但 SLA 缺少实际解决时间`,
                        });
                    }
                }
            }
            if (ticket.status === 'escalated' && ticketSLAs.length === 0) {
                issues.push({
                    type: 'sla',
                    ticketId: ticket.id,
                    issue: `工单 ${ticket.ticketNo} 已升级但缺少 SLA 规则`,
                });
            }
        }
        return issues;
    }
}
exports.CheckService = CheckService;
exports.checkService = new CheckService();
//# sourceMappingURL=CheckService.js.map