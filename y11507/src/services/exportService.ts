import { Parser } from 'json2csv';
import { getAll } from '../config/database';
import { UnifiedRecord, RecordType, QueueItem } from '../types';
import { getRecordByIdAndType } from './recordService';
import fs from 'fs';
import path from 'path';

const ensureExportDir = () => {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
};

export const getUnifiedRecords = async (filters?: {
  status?: string;
  dirtyType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<UnifiedRecord[]> => {
  let sql = `
    SELECT 
      q.id as queueId,
      q.recordType,
      q.recordId,
      q.status,
      q.dirtyType,
      q.dirtyDetails,
      q.rawData,
      q.createdAt,
      q.updatedAt,
      q.externalReceiptId
    FROM queue_items q
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.status) {
    sql += ' AND q.status = ?';
    params.push(filters.status);
  }
  if (filters?.dirtyType) {
    sql += ' AND q.dirtyType = ?';
    params.push(filters.dirtyType);
  }
  if (filters?.startDate) {
    sql += ' AND DATE(q.createdAt) >= DATE(?)';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    sql += ' AND DATE(q.createdAt) <= DATE(?)';
    params.push(filters.endDate);
  }

  sql += ' ORDER BY q.createdAt DESC';

  const queueItems = await getAll<any>(sql, params);
  const unifiedRecords: UnifiedRecord[] = [];

  for (const item of queueItems) {
    const record = await getRecordByIdAndType(item.recordType, item.recordId);
    const rawData = JSON.parse(item.rawData || '{}');

    const recordAny = record as any;
    unifiedRecords.push({
      id: item.recordId,
      queueId: item.queueId,
      recordType: item.recordType,
      deviceId: record?.deviceId || rawData.deviceId || '',
      deviceName: record?.deviceName || rawData.deviceName || '',
      department: rawData.department || recordAny?.department || '',
      date: 
        recordAny?.inspectionDate || 
        recordAny?.calibrationDate || 
        recordAny?.repairDate || 
        rawData.inspectionDate ||
        rawData.calibrationDate ||
        rawData.repairDate ||
        '',
      status: item.status,
      source: item.externalReceiptId ? 'external' : 'manual',
      details: item.dirtyDetails || '',
      photos: recordAny?.photos || [],
      linkedIds: [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  return unifiedRecords;
};

export const exportToCSV = async (
  filters?: Parameters<typeof getUnifiedRecords>[0]
): Promise<string> => {
  const records = await getUnifiedRecords(filters);
  const exportDir = ensureExportDir();
  const filename = `export_${Date.now()}.csv`;
  const filepath = path.join(exportDir, filename);

  const fields = [
    'queueId',
    'recordType',
    'recordId',
    'deviceId',
    'deviceName',
    'department',
    'date',
    'status',
    'source',
    'details',
    'createdAt',
    'updatedAt',
  ];

  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(records);

  fs.writeFileSync(filepath, csv, 'utf-8');
  return filepath;
};

export const exportToJSON = async (
  filters?: Parameters<typeof getUnifiedRecords>[0]
): Promise<string> => {
  const records = await getUnifiedRecords(filters);
  const exportDir = ensureExportDir();
  const filename = `export_${Date.now()}.json`;
  const filepath = path.join(exportDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(records, null, 2), 'utf-8');
  return filepath;
};

export const getStatisticsForExport = async () => {
  const statusStats = await getAll<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM queue_items GROUP BY status`
  );

  const dirtyTypeStats = await getAll<{ dirtyType: string; count: number }>(
    `SELECT dirtyType, COUNT(*) as count FROM queue_items 
     WHERE dirtyType != 'none' GROUP BY dirtyType`
  );

  const typeStats = await getAll<{ recordType: string; count: number }>(
    `SELECT recordType, COUNT(*) as count FROM queue_items GROUP BY recordType`
  );

  return {
    byStatus: statusStats.map(s => ({ status: s.status, count: s.count })),
    byDirtyType: dirtyTypeStats.map(d => ({ dirtyType: d.dirtyType, count: d.count })),
    byRecordType: typeStats.map(t => ({ recordType: t.recordType, count: t.count })),
  };
};

export const getRetryAnalysis = async () => {
  const retryItems = await getAll<any>(
    `SELECT 
      id,
      recordType,
      dirtyType,
      retryCount,
      maxRetries,
      status,
      createdAt
     FROM queue_items 
     WHERE retryCount > 0 OR status IN ('retrying', 'dead_letter', 'manual_intervention')
     ORDER BY retryCount DESC`
  );

  return retryItems;
};
