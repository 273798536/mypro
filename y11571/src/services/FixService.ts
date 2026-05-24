import { v4 as uuidv4 } from 'uuid';
import {
  Ticket,
  SLARule,
  CompensationApproval,
  EntityType,
} from '../types';
import { storage } from '../storage/FileStorage';
import { calculateDiff } from '../utils/diff';

export interface FixResult {
  fixedCount: number;
  skippedCount: number;
  fixes: {
    entityType: string;
    entityId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export class FixService {
  fixSLAViolations(performedBy: string = 'system'): FixResult {
    const result: FixResult = {
      fixedCount: 0,
      skippedCount: 0,
      fixes: [],
    };

    const slaRules = storage.getSLARules();
    const now = new Date();
    let changed = false;

    for (const rule of slaRules) {
      const deadline = new Date(rule.deadline);
      if (!rule.isViolated && now > deadline) {
        const before = { ...rule } as Record<string, unknown>;
        rule.isViolated = true;
        const after = { ...rule } as Record<string, unknown>;

        storage.addHistoryRecord({
          entityType: 'slaRule',
          entityId: rule.id,
          action: 'fix_auto_mark_violation',
          before,
          after,
          diff: calculateDiff(before, after),
          performedBy,
        });

        result.fixes.push({
          entityType: 'slaRule',
          entityId: rule.id,
          field: 'isViolated',
          oldValue: false,
          newValue: true,
        });
        result.fixedCount++;
        changed = true;
      }
    }

    if (changed) {
      storage.saveSLARules(slaRules);
    }

    return result;
  }

  fixOrphanedRecords(performedBy: string = 'system'): FixResult {
    const result: FixResult = {
      fixedCount: 0,
      skippedCount: 0,
      fixes: [],
    };

    const tickets = storage.getTickets();
    const ticketIds = new Set(tickets.map((t) => t.id));

    const sessionSummaries = storage.getSessionSummaries();
    const validSummaries = sessionSummaries.filter((s) => {
      if (!ticketIds.has(s.ticketId)) {
        result.fixes.push({
          entityType: 'sessionSummary',
          entityId: s.id,
          field: '_deleted',
          oldValue: s,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validSummaries.length !== sessionSummaries.length) {
      storage.saveSessionSummaries(validSummaries);
    }

    const slaRules = storage.getSLARules();
    const validSLAs = slaRules.filter((r) => {
      if (!ticketIds.has(r.ticketId)) {
        result.fixes.push({
          entityType: 'slaRule',
          entityId: r.id,
          field: '_deleted',
          oldValue: r,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validSLAs.length !== slaRules.length) {
      storage.saveSLARules(validSLAs);
    }

    const compensations = storage.getCompensationApprovals();
    const validCompensations = compensations.filter((c) => {
      if (!ticketIds.has(c.ticketId)) {
        result.fixes.push({
          entityType: 'compensationApproval',
          entityId: c.id,
          field: '_deleted',
          oldValue: c,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validCompensations.length !== compensations.length) {
      storage.saveCompensationApprovals(validCompensations);
    }

    const notes = storage.getCustomerServiceNotes();
    const validNotes = notes.filter((n) => {
      if (!ticketIds.has(n.ticketId)) {
        result.fixes.push({
          entityType: 'customerServiceNote',
          entityId: n.id,
          field: '_deleted',
          oldValue: n,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validNotes.length !== notes.length) {
      storage.saveCustomerServiceNotes(validNotes);
    }

    const photos = storage.getExceptionPhotos();
    const validPhotos = photos.filter((p) => {
      if (!ticketIds.has(p.ticketId)) {
        result.fixes.push({
          entityType: 'exceptionPhoto',
          entityId: p.id,
          field: '_deleted',
          oldValue: p,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validPhotos.length !== photos.length) {
      storage.saveExceptionPhotos(validPhotos);
    }

    const histories = storage.getAssignmentHistories();
    const validHistories = histories.filter((h) => {
      if (!ticketIds.has(h.ticketId)) {
        result.fixes.push({
          entityType: 'assignmentHistory',
          entityId: h.id,
          field: '_deleted',
          oldValue: h,
          newValue: null,
        });
        result.fixedCount++;
        return false;
      }
      return true;
    });
    if (validHistories.length !== histories.length) {
      storage.saveAssignmentHistories(validHistories);
    }

    return result;
  }

  updateEntity(
    entityType: EntityType,
    entityId: string,
    updates: Record<string, unknown>,
    performedBy: string = 'system'
  ): boolean {
    const entity = storage.getEntityById(entityType, entityId);
    if (!entity) {
      return false;
    }

    const before = { ...(entity as Record<string, unknown>) };
    const after = { ...before, ...updates };

    switch (entityType) {
      case 'ticket':
        const tickets = storage.getTickets();
        const ticketIndex = tickets.findIndex((t) => t.id === entityId);
        if (ticketIndex >= 0) {
          tickets[ticketIndex] = { ...tickets[ticketIndex], ...updates } as Ticket;
          storage.saveTickets(tickets);
        }
        break;
      case 'slaRule':
        const slaRules = storage.getSLARules();
        const slaIndex = slaRules.findIndex((r) => r.id === entityId);
        if (slaIndex >= 0) {
          slaRules[slaIndex] = { ...slaRules[slaIndex], ...updates } as SLARule;
          storage.saveSLARules(slaRules);
        }
        break;
      case 'compensationApproval':
        const approvals = storage.getCompensationApprovals();
        const approvalIndex = approvals.findIndex((a) => a.id === entityId);
        if (approvalIndex >= 0) {
          approvals[approvalIndex] = { ...approvals[approvalIndex], ...updates } as CompensationApproval;
          storage.saveCompensationApprovals(approvals);
        }
        break;
      default:
        return false;
    }

    storage.addHistoryRecord({
      entityType,
      entityId,
      action: 'update',
      before,
      after,
      diff: calculateDiff(before, after),
      performedBy,
    });

    return true;
  }

  approveCompensation(
    compensationId: string,
    approver: string,
    performedBy: string = 'system'
  ): boolean {
    const approvals = storage.getCompensationApprovals();
    const approval = approvals.find((a) => a.id === compensationId);

    if (!approval || approval.status !== 'pending') {
      return false;
    }

    const before = { ...approval } as Record<string, unknown>;
    approval.status = 'approved';
    approval.approver = approver;
    approval.approvedAt = new Date().toISOString();
    const after = { ...approval } as Record<string, unknown>;

    storage.saveCompensationApprovals(approvals);

    storage.addHistoryRecord({
      entityType: 'compensationApproval',
      entityId: compensationId,
      action: 'approve',
      before,
      after,
      diff: calculateDiff(before, after),
      performedBy,
    });

    return true;
  }

  rejectCompensation(
    compensationId: string,
    approver: string,
    performedBy: string = 'system'
  ): boolean {
    const approvals = storage.getCompensationApprovals();
    const approval = approvals.find((a) => a.id === compensationId);

    if (!approval || approval.status !== 'pending') {
      return false;
    }

    const before = { ...approval } as Record<string, unknown>;
    approval.status = 'rejected';
    approval.approver = approver;
    approval.approvedAt = new Date().toISOString();
    const after = { ...approval } as Record<string, unknown>;

    storage.saveCompensationApprovals(approvals);

    storage.addHistoryRecord({
      entityType: 'compensationApproval',
      entityId: compensationId,
      action: 'reject',
      before,
      after,
      diff: calculateDiff(before, after),
      performedBy,
    });

    return true;
  }
}

export const fixService = new FixService();
