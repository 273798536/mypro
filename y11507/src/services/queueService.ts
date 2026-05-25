import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery } from '../config/database';
import { QueueItem, QueueStatus, RecordType, DirtyType, InspectionRecord, CalibrationCertificate, RepairQuote } from '../types';
import { detectDirtyRecord, DirtyRecordContext } from './dirtyDetector';
import { addMinutes, formatISO, isAfter, parseISO } from 'date-fns';
import { logDiff } from './diffService';
import { createInspectionRecord, createCalibrationCertificate, createRepairQuote, getInspectionRecord, getCalibrationCertificate, getRepairQuote, updateInspectionRecord, updateCalibrationCertificate, updateRepairQuote, checkCalibrationStatus } from './recordService';

const MAX_RETRIES = parseInt(process.env.MAX_RETRY_COUNT || '3');
const RETRY_INTERVAL_MINUTES = 1;

export const submitToQueue = async (
  recordType: RecordType,
  rawData: any,
  externalReceiptId?: string,
  operator: string = 'system'
): Promise<QueueItem> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  const context: DirtyRecordContext = {
    currentDate: now,
    existingRecords: await getExistingRecords(recordType, rawData.deviceId),
  };

  const dirtyCheck = detectDirtyRecord(rawData, recordType, context);
  
  let recordId = '';
  let initialStatus: QueueStatus = 'pending';
  let errorMessage: string | undefined;

  if (!dirtyCheck.isDirty) {
    try {
      switch (recordType) {
        case 'inspection':
          const inspection = await createInspectionRecord(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              department: rawData.department || '',
              inspectionDate: rawData.inspectionDate,
              inspector: rawData.inspector || '',
              result: rawData.result || 'pending',
              remarks: rawData.remarks,
            },
            operator
          );
          recordId = inspection.id;
          break;
        case 'calibration':
          const calibration = await createCalibrationCertificate(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              certificateNo: rawData.certificateNo,
              calibrationDate: rawData.calibrationDate,
              validUntil: rawData.validUntil,
              calibrationOrg: rawData.calibrationOrg,
              status: rawData.status || 'valid',
              certificateFile: rawData.certificateFile,
            },
            operator
          );
          recordId = calibration.id;
          break;
        case 'repair':
          const repair = await createRepairQuote(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              quoteNo: rawData.quoteNo,
              repairDate: rawData.repairDate,
              description: rawData.description,
              amount: rawData.amount,
              quantity: rawData.quantity,
              status: rawData.status || 'pending',
              serviceRemarks: rawData.serviceRemarks,
              manualOpinion: rawData.manualOpinion,
            },
            operator
          );
          recordId = repair.id;
          break;
      }
    } catch (error) {
      initialStatus = 'manual_intervention';
      errorMessage = error instanceof Error ? error.message : '业务表写入失败，需要人工处理';
    }
  } else {
    initialStatus = 'manual_intervention';
    errorMessage = dirtyCheck.details;
  }

  if (dirtyCheck.isDirty) {
    initialStatus = 'manual_intervention';
    errorMessage = errorMessage || dirtyCheck.details;
  }

  const queueItem: QueueItem = {
    id,
    recordType,
    recordId: recordId || 'pending',
    externalReceiptId,
    status: initialStatus,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    dirtyType: dirtyCheck.type,
    dirtyDetails: dirtyCheck.details || errorMessage || '',
    rawData: JSON.stringify(rawData),
    errorMessage: errorMessage || (dirtyCheck.isDirty ? dirtyCheck.details : undefined),
    createdAt: now,
    updatedAt: now,
  };

  await runQuery(
    `INSERT INTO queue_items (
      id, recordType, recordId, externalReceiptId, status, retryCount, maxRetries,
      dirtyType, dirtyDetails, rawData, errorMessage, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      queueItem.errorMessage || null,
      queueItem.createdAt,
      queueItem.updatedAt,
    ]
  );

  await logDiff(
    id,
    recordType,
    recordId || 'pending',
    'submit',
    null,
    { rawData, queueStatus: initialStatus, dirtyType: dirtyCheck.type },
    operator,
    `提交回执: ${initialStatus === 'pending' ? '待处理' : '需要人工干预'}`
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
  errorMessage?: string,
  operator: string = 'system'
): Promise<void> => {
  const beforeItem = await getQueueItem(id);
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

  if (beforeItem) {
    await logDiff(
      id,
      beforeItem.recordType,
      beforeItem.recordId,
      'status_change',
      { status: beforeItem.status, retryCount: beforeItem.retryCount },
      { status, retryCount: beforeItem.retryCount, errorMessage },
      operator,
      `状态变更: ${beforeItem.status} → ${status}`
    );
  }
};

export const retryQueueItem = async (id: string, operator: string = 'system'): Promise<QueueItem | null> => {
  const item = await getQueueItem(id);
  if (!item) return null;

  const retryableStatuses = ['pending', 'retrying'];
  if (!retryableStatuses.includes(item.status)) {
    await logDiff(
      id,
      item.recordType,
      item.recordId,
      'retry_rejected',
      { status: item.status },
      { error: `当前状态 ${item.status} 不允许自动重试，仅 pending/retrying 可重试。manual_intervention 状态请使用人工修正接口(fixAndCompensate)处理` },
      operator,
      `重试被拒绝: ${item.status} 状态需要人工处理，不能自动重试`
    );
    return item;
  }

  if (item.dirtyType && item.dirtyType !== 'none') {
    await logDiff(
      id,
      item.recordType,
      item.recordId,
      'retry_rejected',
      { status: item.status, dirtyType: item.dirtyType },
      { error: `存在脏数据类型: ${item.dirtyType}，需要人工修正后才能补偿入账` },
      operator,
      `重试被拒绝: 存在 ${item.dirtyType} 脏数据，请先人工修正`
    );
    return item;
  }

  const beforeState = { status: item.status, retryCount: item.retryCount };
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

  await logDiff(
    id,
    item.recordType,
    item.recordId,
    'retry',
    beforeState,
    { status: newStatus, retryCount: newRetryCount, nextRetryAt },
    operator,
    `重试第 ${newRetryCount}/${item.maxRetries} 次${newStatus === 'dead_letter' ? ' - 已达到最大重试次数，进入死信' : ''}`
  );

  if (newStatus === 'retrying') {
    const rawData = JSON.parse(item.rawData);
    const result = await attemptRecordCreation(item, rawData);
    
    if (result.success) {
      await compensateAndClose(id, operator);
    } else if (!result.canRetry) {
      await runQuery(
        `UPDATE queue_items SET status = 'manual_intervention', errorMessage = ?, updatedAt = ? WHERE id = ?`,
        [result.error, now, id]
      );
      await logDiff(
        id,
        item.recordType,
        item.recordId,
        'retry_failed',
        { status: 'retrying' },
        { status: 'manual_intervention', error: result.error },
        operator,
        `重试失败，转入人工处理: ${result.error}`
      );
    }
  }

  return getQueueItem(id);
};

const attemptRecordCreation = async (item: QueueItem, rawData: any): Promise<{ success: boolean; canRetry: boolean; error?: string }> => {
  const now = formatISO(new Date());
  
  if (item.dirtyType && item.dirtyType !== 'none') {
    return {
      success: false,
      canRetry: false,
      error: `存在脏数据类型: ${item.dirtyType}，需要人工修正后才能创建业务记录`
    };
  }

  try {
    let recordId = item.recordId;

    if (recordId === 'pending') {
      const rawValidation = validateRawDataCompleteness(item.recordType, rawData);
      if (!rawValidation.valid) {
        return {
          success: false,
          canRetry: false,
          error: `原始数据不完整，缺少字段: ${rawValidation.missingFields.join(', ')}，需要人工修正`
        };
      }

      switch (item.recordType) {
        case 'inspection':
          const inspection = await createInspectionRecord(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              department: rawData.department || '',
              inspectionDate: rawData.inspectionDate,
              inspector: rawData.inspector || '',
              result: rawData.result || 'pending',
              remarks: rawData.remarks,
            },
            'retry'
          );
          recordId = inspection.id;
          break;
        case 'calibration':
          const calibration = await createCalibrationCertificate(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              certificateNo: rawData.certificateNo,
              calibrationDate: rawData.calibrationDate,
              validUntil: rawData.validUntil,
              calibrationOrg: rawData.calibrationOrg,
              status: rawData.status || 'valid',
              certificateFile: rawData.certificateFile,
            },
            'retry'
          );
          recordId = calibration.id;
          break;
        case 'repair':
          const repair = await createRepairQuote(
            {
              deviceId: rawData.deviceId,
              deviceName: rawData.deviceName,
              quoteNo: rawData.quoteNo,
              repairDate: rawData.repairDate,
              description: rawData.description,
              amount: rawData.amount,
              quantity: rawData.quantity,
              status: rawData.status || 'pending',
              serviceRemarks: rawData.serviceRemarks,
              manualOpinion: rawData.manualOpinion,
            },
            'retry'
          );
          recordId = repair.id;
          break;
      }

      if (recordId !== item.recordId) {
        await runQuery(
          `UPDATE queue_items SET recordId = ?, updatedAt = ? WHERE id = ?`,
          [recordId, now, item.id]
        );
      }
    }

    const validation = await validateRecordCompleteness(item.recordType, recordId);
    if (!validation.valid) {
      return { 
        success: false, 
        canRetry: false, 
        error: `记录不完整: ${validation.missingFields.join(', ')}，需要人工修正` 
      };
    }

    return { success: true, canRetry: true };
  } catch (error) {
    return { 
      success: false, 
      canRetry: false, 
      error: error instanceof Error ? error.message : '重试失败' 
    };
  }
};

const validateRawDataCompleteness = (recordType: RecordType, rawData: any): { valid: boolean; missingFields: string[] } => {
  const requiredFields: Record<RecordType, string[]> = {
    inspection: ['deviceId', 'deviceName', 'department', 'inspectionDate', 'inspector', 'result'],
    calibration: ['deviceId', 'deviceName', 'certificateNo', 'calibrationDate', 'validUntil', 'calibrationOrg', 'status'],
    repair: ['deviceId', 'deviceName', 'quoteNo', 'repairDate', 'description', 'amount', 'quantity', 'status'],
  };

  const missingFields = requiredFields[recordType].filter(field => {
    const value = rawData[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

const validateRecordCompleteness = async (recordType: RecordType, recordId: string): Promise<{ valid: boolean; missingFields: string[] }> => {
  const requiredFields: Record<RecordType, string[]> = {
    inspection: ['deviceId', 'deviceName', 'department', 'inspectionDate', 'inspector', 'result'],
    calibration: ['deviceId', 'deviceName', 'certificateNo', 'calibrationDate', 'validUntil', 'calibrationOrg', 'status'],
    repair: ['deviceId', 'deviceName', 'quoteNo', 'repairDate', 'description', 'amount', 'quantity', 'status'],
  };

  const tableMap: Record<RecordType, string> = {
    inspection: 'inspection_records',
    calibration: 'calibration_certificates',
    repair: 'repair_quotes',
  };

  const record = await getOne<any>(
    `SELECT * FROM ${tableMap[recordType]} WHERE id = ? AND isDeleted = 0`,
    [recordId]
  );

  if (!record) {
    return { valid: false, missingFields: ['记录不存在'] };
  }

  const missingFields = requiredFields[recordType].filter(field => {
    const value = record[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

export const assignToManual = async (
  id: string,
  assignee: string,
  remarks?: string
): Promise<void> => {
  const item = await getQueueItem(id);
  if (!item) return;

  const beforeState = { status: item.status, assignee: item.assignee };
  const now = formatISO(new Date());
  
  await runQuery(
    `UPDATE queue_items SET 
      status = 'manual_intervention', assignee = ?, updatedAt = ?
     WHERE id = ?`,
    [assignee, now, id]
  );

  await logDiff(
    id,
    item.recordType,
    item.recordId,
    'assign',
    beforeState,
    { status: 'manual_intervention', assignee, remarks },
    assignee,
    remarks || '分配人工处理'
  );
};

export const compensateAndClose = async (id: string, operator: string = 'system'): Promise<{ success: boolean; error?: string }> => {
  const item = await getQueueItem(id);
  if (!item) return { success: false, error: '队列项不存在' };

  const compensableStatuses = ['pending', 'processing', 'retrying', 'manual_intervention'];
  if (!compensableStatuses.includes(item.status)) {
    await logDiff(
      id,
      item.recordType,
      item.recordId,
      'compensate_rejected',
      { status: item.status },
      { error: `当前状态 ${item.status} 不允许补偿，仅 pending/processing/retrying/manual_intervention 可补偿` },
      operator,
      `补偿被拒绝: 当前状态为 ${item.status}`
    );
    return { success: false, error: `当前状态 ${item.status} 不允许补偿` };
  }

  if (item.recordId && item.recordId !== 'pending') {
    const validation = await validateRecordCompleteness(item.recordType, item.recordId);
    if (!validation.valid) {
      await logDiff(
        id,
        item.recordType,
        item.recordId,
        'compensate_rejected',
        { status: item.status, recordId: item.recordId },
        { error: `记录不完整，缺少字段: ${validation.missingFields.join(', ')}` },
        operator,
        `补偿被拒绝: 记录不完整，缺少 ${validation.missingFields.join(', ')}`
      );
      return { success: false, error: `记录不完整，缺少字段: ${validation.missingFields.join(', ')}` };
    }
  }

  const beforeState = { status: item.status, processedAt: item.processedAt };
  const now = formatISO(new Date());
  
  await runQuery(
    `UPDATE queue_items SET 
      status = 'compensated', processedAt = ?, updatedAt = ?
     WHERE id = ?`,
    [now, now, id]
  );

  await logDiff(
    id,
    item.recordType,
    item.recordId,
    'compensate',
    beforeState,
    { status: 'compensated', processedAt: now },
    operator,
    '补偿入账，记录已同步'
  );

  return { success: true };
};

export const closeQueueItem = async (id: string, operator: string = 'system'): Promise<void> => {
  const item = await getQueueItem(id);
  if (!item) return;

  const beforeState = { status: item.status, processedAt: item.processedAt };
  const now = formatISO(new Date());
  
  await runQuery(
    `UPDATE queue_items SET 
      status = 'closed', processedAt = ?, updatedAt = ?
     WHERE id = ?`,
    [now, now, id]
  );

  await logDiff(
    id,
    item.recordType,
    item.recordId,
    'close',
    beforeState,
    { status: 'closed', processedAt: now },
    operator,
    '关闭队列项'
  );
};

export const fixAndCompensate = async (
  id: string,
  recordData: any,
  operator: string
): Promise<{ queueItem: QueueItem | null; record: any }> => {
  const item = await getQueueItem(id);
  if (!item) return { queueItem: null, record: null };

  const rawData = JSON.parse(item.rawData);
  const mergedData = { ...rawData, ...recordData };
  
  let updatedRecord: any = null;

  try {
    switch (item.recordType) {
      case 'inspection':
        if (item.recordId && item.recordId !== 'pending') {
          updatedRecord = await updateInspectionRecord(item.recordId, recordData, operator, id);
        } else {
          updatedRecord = await createInspectionRecord(mergedData, operator, id);
          await runQuery(`UPDATE queue_items SET recordId = ? WHERE id = ?`, [updatedRecord.id, id]);
        }
        break;
      case 'calibration':
        if (item.recordId && item.recordId !== 'pending') {
          updatedRecord = await updateCalibrationCertificate(item.recordId, recordData, operator, id);
        } else {
          updatedRecord = await createCalibrationCertificate(mergedData, operator, id);
          await runQuery(`UPDATE queue_items SET recordId = ? WHERE id = ?`, [updatedRecord.id, id]);
        }
        break;
      case 'repair':
        if (item.recordId && item.recordId !== 'pending') {
          updatedRecord = await updateRepairQuote(item.recordId, recordData, operator, id);
        } else {
          updatedRecord = await createRepairQuote(mergedData, operator, id);
          await runQuery(`UPDATE queue_items SET recordId = ? WHERE id = ?`, [updatedRecord.id, id]);
        }
        break;
    }

    const validation = await validateRecordCompleteness(item.recordType, updatedRecord.id);
    if (!validation.valid) {
      await logDiff(
        id,
        item.recordType,
        updatedRecord.id,
        'fix_incomplete',
        rawData,
        { ...recordData, missingFields: validation.missingFields },
        operator,
        `修正后记录仍不完整，缺少: ${validation.missingFields.join(', ')}`
      );
      throw new Error(`记录仍不完整，缺少字段: ${validation.missingFields.join(', ')}`);
    }

    await compensateAndClose(id, operator);
  } catch (error) {
    await logDiff(
      id,
      item.recordType,
      item.recordId,
      'fix_failed',
      rawData,
      recordData,
      operator,
      `修正失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
    throw error;
  }

  return { queueItem: await getQueueItem(id), record: updatedRecord };
};

export const processPendingItems = async (operator: string = 'system'): Promise<{ processed: number; failed: number; compensated: number }> => {
  const pendingItems = await getQueueItemsByStatus('pending');
  let processed = 0;
  let failed = 0;
  let compensated = 0;

  for (const item of pendingItems) {
    try {
      await updateQueueStatus(item.id, 'processing', undefined, operator);
      
      const rawData = JSON.parse(item.rawData);
      const result = await attemptRecordCreation(item, rawData);
      
      if (result.success) {
        await compensateAndClose(item.id, operator);
        processed++;
        compensated++;
      } else if (result.canRetry) {
        await retryQueueItem(item.id, operator);
        failed++;
      } else {
        await updateQueueStatus(item.id, 'manual_intervention', result.error, operator);
        failed++;
      }
    } catch (error) {
      await updateQueueStatus(item.id, 'manual_intervention', error instanceof Error ? error.message : '未知错误', operator);
      failed++;
    }
  }

  return { processed, failed, compensated };
};

export const checkAndUpdateCalibrationStatus = async (): Promise<{ updated: number }> => {
  const calibrations = await getAll<any>(
    `SELECT * FROM calibration_certificates WHERE status = 'valid' AND isDeleted = 0`
  );

  const now = new Date();
  let updated = 0;

  for (const cert of calibrations) {
    try {
      const validUntil = parseISO(cert.validUntil);
      if (isAfter(now, validUntil)) {
        await updateCalibrationCertificate(
          cert.id,
          { status: 'expired' },
          'system',
          undefined
        );
        updated++;
      }
    } catch (e) {
    }
  }

  return { updated };
};

export const disableDeviceRecords = async (
  deviceId: string,
  operator: string
): Promise<{ calibrations: number; inspections: number; repairs: number }> => {
  const now = formatISO(new Date());
  let calibrations = 0;
  let inspections = 0;
  let repairs = 0;

  const certs = await getAll<any>(
    `SELECT * FROM calibration_certificates WHERE deviceId = ? AND status = 'valid' AND isDeleted = 0`,
    [deviceId]
  );

  for (const cert of certs) {
    await updateCalibrationCertificate(cert.id, { status: 'disabled' }, operator, undefined);
    calibrations++;
  }

  const queueItems = await getAll<any>(
    `SELECT * FROM queue_items WHERE recordId IN (
      SELECT id FROM calibration_certificates WHERE deviceId = ?
    ) OR recordId IN (
      SELECT id FROM inspection_records WHERE deviceId = ?
    ) OR recordId IN (
      SELECT id FROM repair_quotes WHERE deviceId = ?
    )`,
    [deviceId, deviceId, deviceId]
  );

  for (const item of queueItems) {
    if (item.status === 'pending' || item.status === 'retrying') {
      await logDiff(
        item.id,
        item.recordType,
        item.recordId,
        'disable_device',
        { deviceId, status: item.status },
        { deviceId, status: 'manual_intervention', reason: '设备停用' },
        operator,
        `设备 ${deviceId} 已停用，相关记录需要处理`
      );
    }
  }

  return { calibrations, inspections, repairs };
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

  const retryStats = await getOne<{ avg: number; max: number }>(
    `SELECT AVG(retryCount) as avg, MAX(retryCount) as max FROM queue_items WHERE retryCount > 0`
  );

  return {
    byStatus: statusCounts.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
    byDirtyType: dirtyTypeCounts.reduce((acc, item) => ({ ...acc, [item.dirtyType]: item.count }), {}),
    todayCount: todayCount?.count || 0,
    retryStats: {
      averageRetries: retryStats?.avg || 0,
      maxRetries: retryStats?.max || 0,
    },
  };
};
