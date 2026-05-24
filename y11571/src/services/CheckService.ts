import {
  Ticket,
  SLARule,
  CompensationApproval,
  AssignmentHistory,
  AssignmentConflict,
} from '../types';
import { storage } from '../storage/FileStorage';

export interface CheckResult {
  totalIssues: number;
  slaViolations: SLARule[];
  assignmentConflicts: AssignmentConflict[];
  pendingCompensations: CompensationApproval[];
  orphanedRecords: {
    type: string;
    id: string;
    ticketId: string;
  }[];
  dataInconsistencies: {
    type: string;
    ticketId: string;
    issue: string;
  }[];
}

export class CheckService {
  runAllChecks(): CheckResult {
    const result: CheckResult = {
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

  checkSLAViolations(): SLARule[] {
    const slaRules = storage.getSLARules();
    const now = new Date();

    return slaRules.filter((rule) => {
      if (rule.isViolated) {
        return true;
      }

      const deadline = new Date(rule.deadline);
      return now > deadline;
    });
  }

  checkAssignmentConflicts(): AssignmentConflict[] {
    const tickets = storage.getTickets();
    const assignments = storage.getAssignmentHistories();
    const slaRules = storage.getSLARules();
    const compensations = storage.getCompensationApprovals();
    const conflicts: AssignmentConflict[] = [];

    for (const ticket of tickets) {
      const ticketAssignments = assignments
        .filter((a) => a.ticketId === ticket.id)
        .sort((a, b) => new Date(a.transferredAt).getTime() - new Date(b.transferredAt).getTime());

      if (ticketAssignments.length >= 2) {
        const ticketSLA = slaRules.find((s) => s.ticketId === ticket.id);
        const ticketCompensations = compensations.filter((c) => c.ticketId === ticket.id);
        const totalCompensation = ticketCompensations.reduce((sum, c) => sum + c.amount, 0);

        const timeoutResponsible = this.determineTimeoutResponsible(
          ticketAssignments,
          ticketSLA
        );

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

  private determineTimeoutResponsible(
    assignments: AssignmentHistory[],
    slaRule?: SLARule
  ): string[] {
    const responsible: string[] = [];

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
      } else if (transferTime >= deadline) {
        responsible.push(current.toAssignee);
      }
    }

    return [...new Set(responsible)];
  }

  checkPendingCompensations(): CompensationApproval[] {
    return storage.getCompensationApprovals().filter((c) => c.status === 'pending');
  }

  checkOrphanedRecords(): {
    type: string;
    id: string;
    ticketId: string;
  }[] {
    const tickets = storage.getTickets();
    const ticketIds = new Set(tickets.map((t) => t.id));
    const orphans: { type: string; id: string; ticketId: string }[] = [];

    const sessionSummaries = storage.getSessionSummaries();
    for (const s of sessionSummaries) {
      if (!ticketIds.has(s.ticketId)) {
        orphans.push({ type: 'sessionSummary', id: s.id, ticketId: s.ticketId });
      }
    }

    const slaRules = storage.getSLARules();
    for (const r of slaRules) {
      if (!ticketIds.has(r.ticketId)) {
        orphans.push({ type: 'slaRule', id: r.id, ticketId: r.ticketId });
      }
    }

    const compensations = storage.getCompensationApprovals();
    for (const c of compensations) {
      if (!ticketIds.has(c.ticketId)) {
        orphans.push({ type: 'compensationApproval', id: c.id, ticketId: c.ticketId });
      }
    }

    const notes = storage.getCustomerServiceNotes();
    for (const n of notes) {
      if (!ticketIds.has(n.ticketId)) {
        orphans.push({ type: 'customerServiceNote', id: n.id, ticketId: n.ticketId });
      }
    }

    const photos = storage.getExceptionPhotos();
    for (const p of photos) {
      if (!ticketIds.has(p.ticketId)) {
        orphans.push({ type: 'exceptionPhoto', id: p.id, ticketId: p.ticketId });
      }
    }

    const histories = storage.getAssignmentHistories();
    for (const h of histories) {
      if (!ticketIds.has(h.ticketId)) {
        orphans.push({ type: 'assignmentHistory', id: h.id, ticketId: h.ticketId });
      }
    }

    return orphans;
  }

  checkDataInconsistencies(): {
    type: string;
    ticketId: string;
    issue: string;
  }[] {
    const issues: { type: string; ticketId: string; issue: string }[] = [];
    const tickets = storage.getTickets();
    const slaRules = storage.getSLARules();

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

export const checkService = new CheckService();
