"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixService = exports.FixService = void 0;
const FileStorage_1 = require("../storage/FileStorage");
const diff_1 = require("../utils/diff");
class FixService {
    fixSLAViolations(performedBy = 'system') {
        const result = {
            fixedCount: 0,
            skippedCount: 0,
            fixes: [],
        };
        const slaRules = FileStorage_1.storage.getSLARules();
        const now = new Date();
        let changed = false;
        for (const rule of slaRules) {
            const deadline = new Date(rule.deadline);
            if (!rule.isViolated && now > deadline) {
                const before = { ...rule };
                rule.isViolated = true;
                const after = { ...rule };
                FileStorage_1.storage.addHistoryRecord({
                    entityType: 'slaRule',
                    entityId: rule.id,
                    action: 'fix_auto_mark_violation',
                    before,
                    after,
                    diff: (0, diff_1.calculateDiff)(before, after),
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
            FileStorage_1.storage.saveSLARules(slaRules);
        }
        return result;
    }
    fixOrphanedRecords(performedBy = 'system') {
        const result = {
            fixedCount: 0,
            skippedCount: 0,
            fixes: [],
        };
        const tickets = FileStorage_1.storage.getTickets();
        const ticketIds = new Set(tickets.map((t) => t.id));
        const sessionSummaries = FileStorage_1.storage.getSessionSummaries();
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
            FileStorage_1.storage.saveSessionSummaries(validSummaries);
        }
        const slaRules = FileStorage_1.storage.getSLARules();
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
            FileStorage_1.storage.saveSLARules(validSLAs);
        }
        const compensations = FileStorage_1.storage.getCompensationApprovals();
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
            FileStorage_1.storage.saveCompensationApprovals(validCompensations);
        }
        const notes = FileStorage_1.storage.getCustomerServiceNotes();
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
            FileStorage_1.storage.saveCustomerServiceNotes(validNotes);
        }
        const photos = FileStorage_1.storage.getExceptionPhotos();
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
            FileStorage_1.storage.saveExceptionPhotos(validPhotos);
        }
        const histories = FileStorage_1.storage.getAssignmentHistories();
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
            FileStorage_1.storage.saveAssignmentHistories(validHistories);
        }
        return result;
    }
    updateEntity(entityType, entityId, updates, performedBy = 'system') {
        const entity = FileStorage_1.storage.getEntityById(entityType, entityId);
        if (!entity) {
            return false;
        }
        const before = { ...entity };
        const after = { ...before, ...updates };
        switch (entityType) {
            case 'ticket':
                const tickets = FileStorage_1.storage.getTickets();
                const ticketIndex = tickets.findIndex((t) => t.id === entityId);
                if (ticketIndex >= 0) {
                    tickets[ticketIndex] = { ...tickets[ticketIndex], ...updates };
                    FileStorage_1.storage.saveTickets(tickets);
                }
                break;
            case 'slaRule':
                const slaRules = FileStorage_1.storage.getSLARules();
                const slaIndex = slaRules.findIndex((r) => r.id === entityId);
                if (slaIndex >= 0) {
                    slaRules[slaIndex] = { ...slaRules[slaIndex], ...updates };
                    FileStorage_1.storage.saveSLARules(slaRules);
                }
                break;
            case 'compensationApproval':
                const approvals = FileStorage_1.storage.getCompensationApprovals();
                const approvalIndex = approvals.findIndex((a) => a.id === entityId);
                if (approvalIndex >= 0) {
                    approvals[approvalIndex] = { ...approvals[approvalIndex], ...updates };
                    FileStorage_1.storage.saveCompensationApprovals(approvals);
                }
                break;
            default:
                return false;
        }
        FileStorage_1.storage.addHistoryRecord({
            entityType,
            entityId,
            action: 'update',
            before,
            after,
            diff: (0, diff_1.calculateDiff)(before, after),
            performedBy,
        });
        return true;
    }
    approveCompensation(compensationId, approver, performedBy = 'system') {
        const approvals = FileStorage_1.storage.getCompensationApprovals();
        const approval = approvals.find((a) => a.id === compensationId);
        if (!approval || approval.status !== 'pending') {
            return false;
        }
        const before = { ...approval };
        approval.status = 'approved';
        approval.approver = approver;
        approval.approvedAt = new Date().toISOString();
        const after = { ...approval };
        FileStorage_1.storage.saveCompensationApprovals(approvals);
        FileStorage_1.storage.addHistoryRecord({
            entityType: 'compensationApproval',
            entityId: compensationId,
            action: 'approve',
            before,
            after,
            diff: (0, diff_1.calculateDiff)(before, after),
            performedBy,
        });
        return true;
    }
    rejectCompensation(compensationId, approver, performedBy = 'system') {
        const approvals = FileStorage_1.storage.getCompensationApprovals();
        const approval = approvals.find((a) => a.id === compensationId);
        if (!approval || approval.status !== 'pending') {
            return false;
        }
        const before = { ...approval };
        approval.status = 'rejected';
        approval.approver = approver;
        approval.approvedAt = new Date().toISOString();
        const after = { ...approval };
        FileStorage_1.storage.saveCompensationApprovals(approvals);
        FileStorage_1.storage.addHistoryRecord({
            entityType: 'compensationApproval',
            entityId: compensationId,
            action: 'reject',
            before,
            after,
            diff: (0, diff_1.calculateDiff)(before, after),
            performedBy,
        });
        return true;
    }
}
exports.FixService = FixService;
exports.fixService = new FixService();
//# sourceMappingURL=FixService.js.map