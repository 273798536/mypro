import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery } from '../config/database';
import { QueueItem, QueueStatus, RecordType, DirtyType } from '../types';
import { detectDirtyRecord, DirtyRecordContext } from './dirtyDetector';
import { addMinutes, formatISO } from 'date-fns';

const MAX_RETRIES = parseInt(process.env.MAX_RETRY_COUNT || '3');
const RETRY_INTERVAL_MINUTES = 1;

export const createQueueItem = async (
  recordType: RecordType,
  recordId: string,
  rawData: any,
  externalReceiptId?: string
): Promise<QueueItem> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  const context: DirtyRecordContext = {
    currentDate: now,
    existingRecords: await getExistingRecords(recordType, rawData.deviceId),
  };

  const dirtyCheck = detectDirtyRecord(rawData, recordType, context);
  const initialStatus: QueueStatus = dirtyCheck.isDirty ? 'manual_intervention' : 'pending';

  const queueItem: QueueItem = {
    id,
    recordType,
    recordId,
    externalReceiptId,
    status: initialStatus,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    dirtyType: dirtyCheck.type,
    dirtyDetails: dirtyCheck.details,
    rawData: JSON.stringify(rawData),
    createdAt: now,
    updatedAt: now,
  };

  await runQuery(
    `INSERT INTO queue_items (
      id, recordType, recordId, externalReceiptId, status, retryCount, maxRetries,
      dirtyType, dirtyDetails, rawData, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      queueItem.id,
      queueItem.recordType,
      queueItem.recordId,
      queueItem.externalReceiptId || null,
      queueItem.status,
      queueItem.retryCount,
      queueItem.maxRetries,
      queueItem.dirtyType,
      queueItem.dirtyDetails,
      queueItem.rawData,
      queueItem.createdAt,
      queueItem.updatedAt,
    ]
  );

  return queueItem;
};

const getExistingRecords = async (recordType: RecordType, deviceId: string): Promise<any[]> => {
  const tableMap: Record<RecordType, string> = {
    inspection: 'inspection_records',
    calibration: 'calibration_certificates',
    repair: 'repair_quotes',
  };

  const table = tableMap[recordType];
  return getAll(
    `SELECT * FROM ${table} WHERE deviceId = ? AND isDeleted = 0`,
    [deviceId]
  );
};

export const getQueueItem = async (id: string): Promise<QueueItem | null> => {
  return getOne<QueueItem>(
    `SELECT * FROM queue_items WHERE id = ?`,
    [id]
  );
};

export const getQueueItemsByStatus = async (status: QueueStatus): Promise<QueueItem[]> => {
  return getAll<QueueItem>(
    `SELECT * FROM queue_items WHERE status = ? ORDER BY createdAt ASC`,
    [status]
  );
};

export const getQueueItemsByDirtyType = async (dirtyType: DirtyType): Promise<QueueItem[]> => {
  return getAll<QueueItem>(
    `SELECT * FROM queue_items WHERE dirtyType = ? ORDER BY createdAt ASC`,
    [dirtyType]
  );
};

export const getAllQueueItems = async (): Promise<QueueItem[]> => {
  return getAll<QueueItem>(`SELECT * FROM queue_items ORDER BY createdAt DESC`);
};

export const updateQueueStatus = async (
  id: string,
  status: QueueStatus,
  errorMessage?: string
): Promise<void> => {
  const now = formatISO(new Date());
  const updates: string[] = ['status = ?', 'updatedAt = ?'];
  const params: any[] = [status, now, id];

  if (errorMessage !== undefined) {
    updates.unshift('errorMessage = ?');
    params.unshift(errorMessage);
  }

  await runQuery(
    `UPDATE queue_items SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
};

export const retryQueueItem = async (id: string): Promise<QueueItem | null> => {
  const item = await getQueueItem(id);
  if (!item) return null;

  const newRetryCount = item.retryCount + 1;
  const now = formatISO(new Date());

  let newStatus: QueueStatus = 'retrying';
  if (newRetryCount >= item.maxRetries) {
    newStatus = 'dead_letter';
  }

  const nextRetryAt = newStatus === 'retrying'
    ? formatISO(addMinutes(new Date(), RETRY_INTERVAL_MINUTES))
    : undefined;

  await runQuery(
    `UPDATE queue_items SET 
      status = ?, retryCount = ?, nextRetryAt = ?, updatedAt = ?
     WHERE id = ?`,
    [newStatus, newRetryCount, nextRetryAt || null, now, id]
  );

  return getQueueItem(id);
};

export const assignToManual = async (
  id: string,
  assignee: string,
  remarks?: string
): Promise<void> => {
  const now = formatISO(new Date());
  await runQuery(
    `UPDATE queue_items SET 
      status = 'manual_intervention', assignee = ?, updatedAt = ?
     WHERE id = ?`,
    [assignee, now, id]
  );
};

export const compensateAndClose = async (id: string): Promise<void> => {
  const now = formatISO(new Date());
  await runQuery(
    `UPDATE queue_items SET 
      status = 'compensated', processedAt = ?, updatedAt = ?
     WHERE id = ?`,
    [now, now, id]
  );
};

export const closeQueueItem = async (id: string): Promise<void> => {
  const now = formatISO(new Date());
  await runQuery(
    `UPDATE queue_items SET 
      status = 'closed', processedAt = ?, updatedAt = ?
     WHERE id = ?`,
    [now, now, id]
  );
};

export const processPendingItems = async (): Promise<{ processed: number; failed: number }> => {
  const pendingItems = await getQueueItemsByStatus('pending');
  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      await updateQueueStatus(item.id, 'processing');
      
      const success = await processRecord(item);
      
      if (success) {
        await compensateAndClose(item.id);
        processed++;
      } else {
        await retryQueueItem(item.id);
        failed++;
      }
    } catch (error) {
      await updateQueueStatus(item.id, 'retrying', error instanceof Error ? error.message : '未知错误');
      failed++;
    }
  }

  return { processed, failed };
};

const processRecord = async (item: QueueItem): Promise<boolean> => {
  const rawData = JSON.parse(item.rawData);
  
  switch (item.recordType) {
    case 'inspection':
      return await processInspection(rawData, item.recordId);
    case 'calibration':
      return await processCalibration(rawData, item.recordId);
    case 'repair':
      return await processRepair(rawData, item.recordId);
    default:
      return false;
  }
};

const processInspection = async (data: any, recordId: string): Promise<boolean> => {
  return true;
};

const processCalibration = async (data: any, recordId: string): Promise<boolean> => {
  return true;
};

const processRepair = async (data: any, recordId: string): Promise<boolean> => {
  return true;
};

export const getDeadLetterItems = async (): Promise<QueueItem[]> => {
  return getAll<QueueItem>(
    `SELECT * FROM queue_items WHERE status = 'dead_letter' ORDER BY createdAt DESC`
  );
};

export const getManualInterventionItems = async (): Promise<QueueItem[]> => {
  return getAll<QueueItem>(
    `SELECT * FROM queue_items WHERE status = 'manual_intervention' ORDER BY createdAt DESC`
  );
};

export const getQueueStatistics = async () => {
  const statusCounts = await getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM queue_items GROUP BY status`
  );

  const dirtyTypeCounts = await getAll<{ dirtyType: string; count: number }>(
    `SELECT dirtyType, COUNT(*) as count FROM queue_items WHERE dirtyType != 'none' GROUP BY dirtyType`
  );

  const todayCount = await getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM queue_items 
     WHERE DATE(createdAt) = DATE('now')`
  );

  return {
    byStatus: statusCounts.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
    byDirtyType: dirtyTypeCounts.reduce((acc, item) => ({ ...acc, [item.dirtyType]: item.count }), {}),
    todayCount: todayCount?.count || 0,
  };
};
