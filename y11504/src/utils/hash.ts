import crypto from 'crypto';
import { Ledger } from '../entities/Ledger';

export const generateDataHash = (data: Record<string, any>): string => {
  const sortedData = sortObjectKeys(data);
  const jsonString = JSON.stringify(sortedData);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};

export const serializeLedgerForHash = (ledger: Ledger): Record<string, any> => {
  return {
    id: ledger.id,
    ledgerNo: ledger.ledgerNo,
    status: ledger.status,
    dataQuality: ledger.dataQuality,
    repairOrderId: ledger.repairOrderId,
    engineerId: ledger.engineerId,
    engineerName: ledger.engineerName,
    submitTime: ledger.submitTime,
    confirmTime: ledger.confirmTime,
    auditTime: ledger.auditTime,
    rejectReason: ledger.rejectReason,
    rejectBy: ledger.rejectBy,
    confirmBy: ledger.confirmBy,
    auditBy: ledger.auditBy,
    changeReason: ledger.changeReason,
    version: ledger.version,
    partScans: ledger.partScans?.map((p) => ({
      partCode: p.partCode,
      partName: p.partName,
      partType: p.partType,
      quantity: p.quantity,
      batchNo: p.batchNo,
    })) || [],
    receiptPhotos: ledger.receiptPhotos?.map((p) => ({
      photoUrl: p.photoUrl,
      photoHash: p.photoHash,
    })) || [],
    externalReceipts: ledger.externalReceipts?.map((r) => ({
      receiptNo: r.receiptNo,
      source: r.source,
      sourceSystem: r.sourceSystem,
    })) || [],
  };
};

export const generateLedgerHash = (ledger: Ledger): string => {
  return generateDataHash(serializeLedgerForHash(ledger));
};

export const generateLedgerNo = (prefix: string = 'LDG'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const sortObjectKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObjectKeys(obj[key]);
        return result;
      }, {});
  }
  return obj;
};

export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('md5').update(buffer).digest('hex');
};
