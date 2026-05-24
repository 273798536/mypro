import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';
import { runQuery, getAll, getOne } from '../config/database';
import { DiffLog, RecordType } from '../types';

export const logDiff = async (
  queueId: string,
  recordType: RecordType,
  recordId: string,
  action: string,
  beforeData: any,
  afterData: any,
  operator: string,
  remarks?: string
): Promise<void> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  await runQuery(
    `INSERT INTO diff_logs (
      id, queueId, recordType, recordId, action, beforeData, afterData, operator, remarks, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      queueId,
      recordType,
      recordId,
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      operator,
      remarks || null,
      now,
    ]
  );
};

export const getDiffLogsByQueueId = async (queueId: string): Promise<DiffLog[]> => {
  const logs = await getAll<DiffLog>(
    `SELECT * FROM diff_logs WHERE queueId = ? ORDER BY createdAt ASC`,
    [queueId]
  );
  return logs.map(log => ({
    ...log,
    beforeData: log.beforeData ? JSON.parse(log.beforeData as any) : null,
    afterData: log.afterData ? JSON.parse(log.afterData as any) : null,
  })) as any;
};

export const getDiffLogsByRecordId = async (
  recordType: RecordType,
  recordId: string
): Promise<DiffLog[]> => {
  const logs = await getAll<DiffLog>(
    `SELECT * FROM diff_logs WHERE recordType = ? AND recordId = ? ORDER BY createdAt ASC`,
    [recordType, recordId]
  );
  return logs.map(log => ({
    ...log,
    beforeData: log.beforeData ? JSON.parse(log.beforeData as any) : null,
    afterData: log.afterData ? JSON.parse(log.afterData as any) : null,
  })) as any;
};

export const getDiffLog = async (id: string): Promise<DiffLog | null> => {
  const log = await getOne<DiffLog>(
    `SELECT * FROM diff_logs WHERE id = ?`,
    [id]
  );
  if (!log) return null;
  return {
    ...log,
    beforeData: log.beforeData ? JSON.parse(log.beforeData as any) : null,
    afterData: log.afterData ? JSON.parse(log.afterData as any) : null,
  } as any;
};

export const calculateDiff = (before: any, after: any): any[] => {
  const changes: any[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];
    
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({
        field: key,
        before: beforeVal,
        after: afterVal,
      });
    }
  }

  return changes;
};

export const getFullChangeHistory = async (
  recordType: RecordType,
  recordId: string
): Promise<any[]> => {
  const logs = await getDiffLogsByRecordId(recordType, recordId);
  const history: any[] = [];

  for (const log of logs) {
    const changes = calculateDiff(log.beforeData, log.afterData);
    history.push({
      id: log.id,
      action: log.action,
      operator: log.operator,
      remarks: log.remarks,
      createdAt: log.createdAt,
      changes,
    });
  }

  return history;
};
