import { MeetingLedger } from '../types';

export interface DiffResult {
  changedFields: string[];
  diffSummary: string;
}

export function compareLedgerChanges(
  before: Partial<MeetingLedger>,
  after: Partial<MeetingLedger>
): DiffResult {
  const changedFields: string[] = [];
  const diffLines: string[] = [];

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeVal = (before as any)[key];
    const afterVal = (after as any)[key];

    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);

    if (beforeStr !== afterStr) {
      changedFields.push(key);

      if (beforeVal === undefined) {
        diffLines.push(`[新增] ${key}: ${afterStr}`);
      } else if (afterVal === undefined) {
        diffLines.push(`[删除] ${key}: ${beforeStr}`);
      } else {
        diffLines.push(`[修改] ${key}: ${beforeStr} → ${afterStr}`);
      }
    }
  }

  return {
    changedFields,
    diffSummary: diffLines.join('\n') || '无变更'
  };
}

export function getSimplifiedLedger(ledger: MeetingLedger): Partial<MeetingLedger> {
  return {
    meetingTitle: ledger.meetingTitle,
    roomName: ledger.roomName,
    startTime: ledger.startTime,
    endTime: ledger.endTime,
    status: ledger.status,
    hasTeaBreak: ledger.hasTeaBreak,
    hasEquipment: ledger.hasEquipment,
    teaBreakCost: ledger.teaBreakCost,
    equipmentCost: ledger.equipmentCost,
    isCanceled: ledger.isCanceled,
    cancelReason: ledger.cancelReason,
    dataSources: ledger.dataSources,
    version: ledger.version
  };
}
