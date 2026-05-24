import { MeetingLedger, LedgerStatus, DataSource, ImportStrategy, Role, AccessRecord } from '../types';
import { createLedger, getLedgerById, getLedgerByMeetingId, getAllLedgers, updateLedger } from '../dao/ledgerDao';
import { createChangeRecord, getChangeRecordsByLedgerId } from '../dao/changeRecordDao';
import { compareLedgerChanges, getSimplifiedLedger } from '../utils/diffUtils';
import { maskLedger } from '../utils/maskUtils';

export interface CreateLedgerRequest {
  meetingId: string;
  meetingTitle: string;
  roomName: string;
  startTime: string;
  endTime: string;
  organizer: string;
  participants: string[];
  hasTeaBreak?: boolean;
  hasEquipment?: boolean;
  teaBreakCost?: number;
  equipmentCost?: number;
  isCanceled?: boolean;
  cancelTime?: string;
  cancelReason?: string;
  dataSources?: DataSource[];
  accessRecords?: AccessRecord[];
}

export async function createDraftLedger(
  data: CreateLedgerRequest,
  userId: string,
  userName: string
): Promise<MeetingLedger> {
  const existing = await getLedgerByMeetingId(data.meetingId);
  if (existing) {
    throw new Error(`会议ID ${data.meetingId} 已存在台账记录`);
  }

  const ledger = await createLedger({
    meetingId: data.meetingId,
    meetingTitle: data.meetingTitle,
    roomName: data.roomName,
    startTime: data.startTime,
    endTime: data.endTime,
    organizer: data.organizer,
    participants: data.participants,
    status: LedgerStatus.DRAFT,
    hasTeaBreak: data.hasTeaBreak ?? false,
    hasEquipment: data.hasEquipment ?? false,
    teaBreakCost: data.teaBreakCost ?? 0,
    equipmentCost: data.equipmentCost ?? 0,
    isCanceled: data.isCanceled ?? false,
    cancelTime: data.cancelTime,
    cancelReason: data.cancelReason,
    dataSources: data.dataSources || [],
    customerServiceNotes: [],
    accessRecords: data.accessRecords || [],
    createdBy: userId,
    updatedBy: userId
  });

  await createChangeRecord({
    ledgerId: ledger.id,
    version: 1,
    action: 'create_draft',
    operatorId: userId,
    operatorName: userName,
    changeReason: '创建草稿台账',
    beforeData: {},
    afterData: getSimplifiedLedger(ledger),
    diffSummary: '创建新台账草稿',
    changedFields: ['all']
  });

  return ledger;
}

export async function submitLedger(
  ledgerId: string,
  userId: string,
  userName: string,
  reason: string = '提交审核'
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  if (existing.status !== LedgerStatus.DRAFT && existing.status !== LedgerStatus.REJECTED) {
    throw new Error(`只有草稿或已驳回状态才能提交，当前状态: ${existing.status}`);
  }

  const beforeData = getSimplifiedLedger(existing);
  const updated = await updateLedger(ledgerId, { status: LedgerStatus.SUBMITTED }, userId) as MeetingLedger;
  const afterData = getSimplifiedLedger(updated);
  const diff = compareLedgerChanges(beforeData, afterData);

  await createChangeRecord({
    ledgerId,
    version: updated.version,
    action: 'submit',
    operatorId: userId,
    operatorName: userName,
    changeReason: reason,
    beforeData,
    afterData,
    diffSummary: diff.diffSummary || '状态变更为已提交',
    changedFields: diff.changedFields
  });

  return updated;
}

export async function rejectLedger(
  ledgerId: string,
  userId: string,
  userName: string,
  reason: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  if (existing.status !== LedgerStatus.SUBMITTED) {
    throw new Error(`只有已提交状态才能驳回，当前状态: ${existing.status}`);
  }

  const beforeData = getSimplifiedLedger(existing);
  const updated = await updateLedger(ledgerId, { status: LedgerStatus.REJECTED }, userId) as MeetingLedger;
  const afterData = getSimplifiedLedger(updated);
  const diff = compareLedgerChanges(beforeData, afterData);

  await createChangeRecord({
    ledgerId,
    version: updated.version,
    action: 'reject',
    operatorId: userId,
    operatorName: userName,
    changeReason: reason,
    beforeData,
    afterData,
    diffSummary: diff.diffSummary || `驳回原因: ${reason}`,
    changedFields: diff.changedFields
  });

  return updated;
}

export async function confirmLedger(
  ledgerId: string,
  userId: string,
  userName: string,
  reason: string = '审核通过'
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  if (existing.status !== LedgerStatus.SUBMITTED) {
    throw new Error(`只有已提交状态才能确认，当前状态: ${existing.status}`);
  }

  const beforeData = getSimplifiedLedger(existing);
  const updated = await updateLedger(ledgerId, { status: LedgerStatus.CONFIRMED }, userId) as MeetingLedger;
  const afterData = getSimplifiedLedger(updated);
  const diff = compareLedgerChanges(beforeData, afterData);

  await createChangeRecord({
    ledgerId,
    version: updated.version,
    action: 'confirm',
    operatorId: userId,
    operatorName: userName,
    changeReason: reason,
    beforeData,
    afterData,
    diffSummary: diff.diffSummary || '状态变更为已确认',
    changedFields: diff.changedFields
  });

  return updated;
}

export async function updateLedgerWithAudit(
  ledgerId: string,
  updates: Partial<MeetingLedger>,
  userId: string,
  userName: string,
  reason: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  if (existing.status === LedgerStatus.CONFIRMED) {
    throw new Error('已确认的台账不能修改，如需修改请先创建新版本');
  }

  if (existing.status === LedgerStatus.AUDIT_ONLY) {
    throw new Error('只读审计状态的台账不能修改');
  }

  const beforeData = getSimplifiedLedger(existing);
  const updated = await updateLedger(ledgerId, updates, userId);
  if (!updated) return null;

  const afterData = getSimplifiedLedger(updated);
  const diff = compareLedgerChanges(beforeData, afterData);

  if (diff.changedFields.length > 0) {
    await createChangeRecord({
      ledgerId,
      version: updated.version,
      action: 'update',
      operatorId: userId,
      operatorName: userName,
      changeReason: reason,
      beforeData,
      afterData,
      diffSummary: diff.diffSummary,
      changedFields: diff.changedFields
    });
  }

  return updated;
}

export async function addCustomerServiceNote(
  ledgerId: string,
  note: string,
  userId: string,
  userName: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  const newNotes = [...existing.customerServiceNotes, note];
  return updateLedgerWithAudit(
    ledgerId,
    { customerServiceNotes: newNotes, dataSources: [...new Set([...existing.dataSources, DataSource.CUSTOMER_SERVICE])] },
    userId,
    userName,
    '追加客服备注'
  );
}

export async function addAccessRecord(
  ledgerId: string,
  record: AccessRecord,
  userId: string,
  userName: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  const newRecords = [...existing.accessRecords, record];
  return updateLedgerWithAudit(
    ledgerId,
    { accessRecords: newRecords, dataSources: [...new Set([...existing.dataSources, DataSource.ACCESS_CARD])] },
    userId,
    userName,
    '追加门禁刷卡记录'
  );
}

export async function setAuditOnly(
  ledgerId: string,
  userId: string,
  userName: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(ledgerId);
  if (!existing) return null;

  const beforeData = getSimplifiedLedger(existing);
  const updated = await updateLedger(ledgerId, { status: LedgerStatus.AUDIT_ONLY }, userId) as MeetingLedger;
  const afterData = getSimplifiedLedger(updated);
  const diff = compareLedgerChanges(beforeData, afterData);

  await createChangeRecord({
    ledgerId,
    version: updated.version,
    action: 'set_audit_only',
    operatorId: userId,
    operatorName: userName,
    changeReason: '设置为只读审计状态',
    beforeData,
    afterData,
    diffSummary: diff.diffSummary || '状态变更为只读审计',
    changedFields: diff.changedFields
  });

  return updated;
}

export async function getLedgerHistory(ledgerId: string) {
  return getChangeRecordsByLedgerId(ledgerId);
}

export function getLedgerForRole(ledger: MeetingLedger, role: Role): MeetingLedger {
  if (role === Role.ADMIN || role === Role.MANAGER) {
    return ledger;
  }
  return maskLedger(ledger);
}

export async function batchImportLedgers(
  ledgersData: CreateLedgerRequest[],
  strategy: ImportStrategy,
  userId: string,
  userName: string
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  for (const data of ledgersData) {
    try {
      const existing = await getLedgerByMeetingId(data.meetingId);

      if (!existing) {
        await createDraftLedger(data, userId, userName);
        result.created++;
      } else {
        switch (strategy) {
          case ImportStrategy.IGNORE:
            result.skipped++;
            break;
          case ImportStrategy.OVERWRITE:
            await updateLedgerWithAudit(
              existing.id,
              {
                meetingTitle: data.meetingTitle,
                roomName: data.roomName,
                startTime: data.startTime,
                endTime: data.endTime,
                organizer: data.organizer,
                participants: data.participants,
                hasTeaBreak: data.hasTeaBreak,
                hasEquipment: data.hasEquipment,
                teaBreakCost: data.teaBreakCost,
                equipmentCost: data.equipmentCost
              },
              userId,
              userName,
              `批量覆盖导入 (策略: ${strategy})`
            );
            result.updated++;
            break;
          case ImportStrategy.APPEND:
            if (data.accessRecords && data.accessRecords.length > 0) {
              for (const record of data.accessRecords) {
                await addAccessRecord(existing.id, record, userId, userName);
              }
            }
            if (data.isCanceled && !existing.isCanceled) {
              await updateLedgerWithAudit(
                existing.id,
                {
                  isCanceled: data.isCanceled,
                  cancelTime: data.cancelTime,
                  cancelReason: data.cancelReason
                },
                userId,
                userName,
                `追加取消信息 (策略: ${strategy})`
              );
            }
            result.updated++;
            break;
        }
      }
    } catch (e: any) {
      result.errors.push(`会议 ${data.meetingId}: ${e.message}`);
    }
  }

  return result;
}
