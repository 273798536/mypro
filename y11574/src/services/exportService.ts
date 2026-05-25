import { Parser } from 'json2csv';
import crypto from 'crypto';
import { LiabilityRecord, User, UserRole } from '../types';
import { liabilityRecordModel } from '../models/liabilityRecord';
import { exportLogModel } from '../models/exportLog';
import { historyRecordModel } from '../models/historyRecord';
import { canViewField } from '../config/roles';

const SENSITIVE_FIELDS = [
  'customerPhone',
  'customerName',
  'agentId'
];

function generateChecksum(records: LiabilityRecord[]): string {
  const sortedRecords = [...records].sort((a, b) => a.id.localeCompare(b.id));
  const normalizedData = sortedRecords.map(r => ({
    id: r.id,
    compensationAmount: r.compensationAmount,
    status: r.status,
    occurrenceDate: r.occurrenceDate,
    ticketId: r.ticketId
  }));
  return crypto
    .createHash('md5')
    .update(JSON.stringify(normalizedData) + records.length + normalizedData.reduce((s, r) => s + r.compensationAmount, 0))
    .digest('hex');
}

function maskValue(value: string | undefined, type: 'phone' | 'name' | 'id'): string {
  if (!value) return '';
  
  switch (type) {
    case 'phone':
      return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'name':
      if (value.length <= 1) return value;
      return value[0] + '*'.repeat(value.length - 1);
    case 'id':
      if (value.length <= 4) return '****';
      return '****' + value.slice(-4);
    default:
      return '*'.repeat(value.length);
  }
}

function getFieldMaskType(field: string): 'phone' | 'name' | 'id' | null {
  switch (field) {
    case 'customerPhone':
      return 'phone';
    case 'customerName':
      return 'name';
    case 'agentId':
      return 'id';
    default:
      return null;
  }
}

export const exportService = {
  async exportToCSV(
    filters: Parameters<typeof liabilityRecordModel.list>[0],
    user: User,
    isMasked: boolean = true
  ): Promise<{ csv: string; exportLogId: string }> {
    const records = await liabilityRecordModel.list(filters);
    
    const visibleRecords = records.map(record => {
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(record)) {
        if (canViewField(user.role, key)) {
          if (isMasked && SENSITIVE_FIELDS.includes(key)) {
            const maskType = getFieldMaskType(key);
            if (maskType) {
              result[key] = maskValue(value as string, maskType);
            } else {
              result[key] = value;
            }
          } else {
            result[key] = value;
          }
        }
      }
      
      return result;
    });

    const fields = Object.keys(visibleRecords[0] || {});
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(visibleRecords);

    const totalAmount = records.reduce((sum, r) => sum + r.compensationAmount, 0);
    const checksum = generateChecksum(records);

    const maskedFields = isMasked ? SENSITIVE_FIELDS.filter(f => canViewField(user.role, f)) : [];

    const exportLog = await exportLogModel.create({
      exportedBy: user.id,
      exportedByName: user.name,
      exportType: 'csv',
      recordCount: records.length,
      totalAmount,
      isMasked,
      maskedFields,
      filters: filters as Record<string, unknown>,
      checksum
    });

    await historyRecordModel.create({
      recordId: 'export-' + exportLog.id,
      operation: `导出CSV-${isMasked ? '脱敏' : '完整'}`,
      operationType: 'export',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      changedFields: ['export'],
      sensitiveFieldsHandled: maskedFields,
      newValues: {
        exportId: exportLog.id,
        recordCount: records.length,
        totalAmount,
        isMasked
      }
    });

    return { csv, exportLogId: exportLog.id };
  },

  async getExportHistory(user: User, limit: number = 20) {
    if (user.role === UserRole.SUPERVISOR) {
      return await exportLogModel.list(limit);
    }
    return await exportLogModel.getRecentByUser(user.id, limit);
  },

  async verifyExportConsistency(exportId: string): Promise<{
    consistent: boolean;
    expectedChecksum: string;
    actualChecksum?: string;
    details: {
      recordCount: number;
      totalAmount: number;
    };
  }> {
    const exportLog = await exportLogModel.findById(exportId);
    if (!exportLog) {
      throw new Error('Export log not found');
    }

    const filters = exportLog.filters as Parameters<typeof liabilityRecordModel.list>[0];
    const records = await liabilityRecordModel.list(filters);
    
    const totalAmount = records.reduce((sum, r) => sum + r.compensationAmount, 0);
    const currentChecksum = generateChecksum(records);

    return {
      consistent: exportLog.checksum === currentChecksum && 
                  exportLog.recordCount === records.length &&
                  Math.abs(exportLog.totalAmount - totalAmount) < 0.01,
      expectedChecksum: exportLog.checksum,
      actualChecksum: currentChecksum,
      details: {
        recordCount: records.length,
        totalAmount
      }
    };
  }
};
