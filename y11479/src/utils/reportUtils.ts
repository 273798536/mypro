import { MeetingLedger, ChangeRecord, Role, LedgerStatus } from '../types';

export interface ManagerReport {
  summary: {
    totalLedgers: number;
    draftCount: number;
    submittedCount: number;
    rejectedCount: number;
    confirmedCount: number;
    canceledWithCost: number;
    totalTeaBreakCost: number;
    totalEquipmentCost: number;
    unrecoveredCost: number;
  };
  byRole: Record<string, number>;
  recentChanges: Array<{
    time: string;
    operator: string;
    action: string;
    ledgerTitle: string;
    reason: string;
  }>;
  sensitiveFieldChanges: Array<{
    ledgerTitle: string;
    fields: string[];
    operator: string;
    time: string;
  }>;
}

export function generateManagerReport(
  ledgers: MeetingLedger[],
  changes: ChangeRecord[]
): ManagerReport {
  const summary = {
    totalLedgers: ledgers.length,
    draftCount: ledgers.filter(l => l.status === LedgerStatus.DRAFT).length,
    submittedCount: ledgers.filter(l => l.status === LedgerStatus.SUBMITTED).length,
    rejectedCount: ledgers.filter(l => l.status === LedgerStatus.REJECTED).length,
    confirmedCount: ledgers.filter(l => l.status === LedgerStatus.CONFIRMED).length,
    canceledWithCost: ledgers.filter(l => 
      l.isCanceled && (l.teaBreakCost > 0 || l.equipmentCost > 0)
    ).length,
    totalTeaBreakCost: ledgers.reduce((sum, l) => sum + l.teaBreakCost, 0),
    totalEquipmentCost: ledgers.reduce((sum, l) => sum + l.equipmentCost, 0),
    unrecoveredCost: ledgers
      .filter(l => l.isCanceled)
      .reduce((sum, l) => sum + l.teaBreakCost + l.equipmentCost, 0)
  };

  const byRole: Record<string, number> = {};
  for (const ledger of ledgers) {
    const creator = ledger.createdBy;
    byRole[creator] = (byRole[creator] || 0) + 1;
  }

  const recentChanges = changes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(c => ({
      time: c.createdAt,
      operator: c.operatorName,
      action: c.action,
      ledgerTitle: c.ledgerId,
      reason: c.changeReason
    }));

  const sensitiveFieldChanges = changes
    .filter(c => c.changedFields.some(f => 
      ['participants', 'organizer', 'accessRecords', 'customerServiceNotes'].includes(f)
    ))
    .map(c => ({
      ledgerTitle: c.ledgerId,
      fields: c.changedFields.filter(f => 
        ['participants', 'organizer', 'accessRecords', 'customerServiceNotes'].includes(f)
      ),
      operator: c.operatorName,
      time: c.createdAt
    }));

  return { summary, byRole, recentChanges, sensitiveFieldChanges };
}

export function getRoleViewData(
  ledgers: MeetingLedger[],
  role: Role
): Partial<MeetingLedger>[] {
  switch (role) {
    case Role.ADMIN:
      return ledgers;
    case Role.MANAGER:
      return ledgers.map(l => ({
        ...l,
        accessRecords: []
      }));
    case Role.AUDITOR:
      return ledgers.map(l => ({
        meetingTitle: l.meetingTitle,
        roomName: l.roomName,
        startTime: l.startTime,
        endTime: l.endTime,
        status: l.status,
        hasTeaBreak: l.hasTeaBreak,
        hasEquipment: l.hasEquipment,
        teaBreakCost: l.teaBreakCost,
        equipmentCost: l.equipmentCost,
        isCanceled: l.isCanceled,
        version: l.version
      }));
    case Role.OPERATOR:
      return ledgers.map(l => ({
        meetingTitle: l.meetingTitle,
        roomName: l.roomName,
        startTime: l.startTime,
        endTime: l.endTime,
        status: l.status
      }));
    default:
      return ledgers.map(l => ({
        meetingTitle: l.meetingTitle,
        roomName: l.roomName,
        status: l.status
      }));
  }
}
