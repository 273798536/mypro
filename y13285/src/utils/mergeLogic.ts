import type {
  ApprovalLedger,
  ProcessingRecord,
  ExceptionQueue,
  ExceptionType,
} from '@/types';
import { generateId } from './storage';

function parseVersion(version: string): number {
  const match = version.match(/V(\d+\.?\d*)/i);
  return match ? parseFloat(match[1]) : 0;
}

function parseDate(dateStr: string): number {
  return new Date(dateStr).getTime();
}

export interface MergeResult {
  mergedLedgers: ApprovalLedger[];
  newRecords: ProcessingRecord[];
  newExceptions: ExceptionQueue[];
}

export function detectOldOverrideNew(
  ledgers: ApprovalLedger[]
): Array<{ group: ApprovalLedger[]; reason: string; impact: string }> {
  const groups = new Map<string, ApprovalLedger[]>();

  ledgers.forEach((ledger) => {
    const key = `${ledger.projectName}-${ledger.pointLocation}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(ledger);
  });

  const anomalies: Array<{
    group: ApprovalLedger[];
    reason: string;
    impact: string;
  }> = [];

  groups.forEach((group) => {
    if (group.length < 2) return;

    const sortedByVersion = [...group].sort(
      (a, b) => parseVersion(b.schemeVersion) - parseVersion(a.schemeVersion)
    );

    for (let i = 0; i < sortedByVersion.length - 1; i++) {
      const newer = sortedByVersion[i];
      const older = sortedByVersion[i + 1];

      if (
        parseVersion(newer.schemeVersion) > parseVersion(older.schemeVersion) &&
        parseDate(newer.approvalDate) < parseDate(older.approvalDate)
      ) {
        anomalies.push({
          group,
          reason: `发现旧方案(${older.schemeVersion})审批日期(${older.approvalDate})晚于新方案(${newer.schemeVersion})审批日期(${newer.approvalDate})，存在旧意见覆盖新方案的风险`,
          impact: `涉及${group.length}条审批记录，影响${group[0].street}点位的卸货时间安排，可能导致夜间卸货许可与白天卸货规定冲突`,
        });
        break;
      }
    }
  });

  return anomalies;
}

export function detectSameStreetComplaints(
  ledgers: ApprovalLedger[]
): Array<{ group: ApprovalLedger[]; reason: string; impact: string }> {
  const complaintGroups = new Map<string, ApprovalLedger[]>();

  ledgers.forEach((ledger) => {
    if (ledger.complaintContent) {
      const key = `${ledger.street}-${ledger.pointLocation}`;
      if (!complaintGroups.has(key)) {
        complaintGroups.set(key, []);
      }
      complaintGroups.get(key)!.push(ledger);
    }
  });

  const anomalies: Array<{
    group: ApprovalLedger[];
    reason: string;
    impact: string;
  }> = [];

  complaintGroups.forEach((group) => {
    if (group.length >= 2) {
      const complaints = group.map((g) => g.complaintContent).join('；');
      anomalies.push({
        group,
        reason: `同一街口(${group[0].street})发现${group.length}条投诉记录：${complaints}`,
        impact: `涉及${group.length}条投诉，影响${group[0].street}的居民满意度和消防评估，归并后需综合考虑噪音和消防安全双重因素`,
      });
    }
  });

  return anomalies;
}

export function createException(
  group: ApprovalLedger[],
  exceptionType: ExceptionType,
  reason: string,
  impactScope: string
): ExceptionQueue {
  return {
    id: generateId(),
    ledgerIds: group.map((g) => g.id),
    exceptionType,
    reason,
    impactScope,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function createRecord(
  ledgerIds: string[],
  action: 'merge' | 'withdraw' | 'confirm' | 'skip',
  result: string,
  mergedPoint?: string,
  reason?: string
): ProcessingRecord {
  return {
    id: generateId(),
    ledgerIds,
    action,
    operator: '老曹',
    operateTime: new Date().toISOString(),
    result,
    mergedPoint,
    reason,
  };
}

export function runMergeProcess(ledgers: ApprovalLedger[]): MergeResult {
  const updatedLedgers = [...ledgers];
  const newRecords: ProcessingRecord[] = [];
  const newExceptions: ExceptionQueue[] = [];

  const processedIds = new Set<string>();

  const oldOverrideAnomalies = detectOldOverrideNew(ledgers);
  oldOverrideAnomalies.forEach(({ group, reason, impact }) => {
    const exception = createException(
      group,
      'old_override_new',
      reason,
      impact
    );
    newExceptions.push(exception);

    group.forEach((ledger) => {
      const idx = updatedLedgers.findIndex((l) => l.id === ledger.id);
      if (idx !== -1) {
        updatedLedgers[idx] = { ...updatedLedgers[idx], status: 'pending_confirm' };
      }
      processedIds.add(ledger.id);
    });
  });

  const complaintAnomalies = detectSameStreetComplaints(ledgers);
  complaintAnomalies.forEach(({ group, reason, impact }) => {
    const hasOverlap = group.some((g) => processedIds.has(g.id));
    if (hasOverlap) return;

    const exception = createException(
      group,
      'same_street_complaints',
      reason,
      impact
    );
    newExceptions.push(exception);

    group.forEach((ledger) => {
      const idx = updatedLedgers.findIndex((l) => l.id === ledger.id);
      if (idx !== -1) {
        updatedLedgers[idx] = { ...updatedLedgers[idx], status: 'pending_confirm' };
      }
      processedIds.add(ledger.id);
    });
  });

  const normalGroups = new Map<string, ApprovalLedger[]>();
  updatedLedgers.forEach((ledger) => {
    if (processedIds.has(ledger.id)) return;
    const key = `${ledger.projectName}-${ledger.pointLocation}`;
    if (!normalGroups.has(key)) {
      normalGroups.set(key, []);
    }
    normalGroups.get(key)!.push(ledger);
  });

  normalGroups.forEach((group) => {
    if (group.length >= 1) {
      group.forEach((ledger) => {
        const idx = updatedLedgers.findIndex((l) => l.id === ledger.id);
        if (idx !== -1) {
          updatedLedgers[idx] = { ...updatedLedgers[idx], status: 'merged' };
        }
      });

      const record = createRecord(
        group.map((g) => g.id),
        'merge',
        `正常归并完成，共${group.length}条记录`,
        group[0].pointLocation
      );
      newRecords.push(record);
    }
  });

  return {
    mergedLedgers: updatedLedgers,
    newRecords,
    newExceptions,
  };
}
