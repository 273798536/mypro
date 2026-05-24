import { v4 as uuidv4 } from 'uuid';
import { formatISO, isAfter, parseISO } from 'date-fns';
import { runQuery, getOne, getAll } from '../config/database';
import { InspectionRecord, CalibrationCertificate, RepairQuote, RecordType } from '../types';
import { logDiff } from './diffService';

export const createInspectionRecord = async (
  data: Omit<InspectionRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
  operator: string,
  queueId?: string
): Promise<InspectionRecord> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  const record: InspectionRecord = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    photos: data.photos || [],
  };

  await runQuery(
    `INSERT INTO inspection_records (
      id, deviceId, deviceName, department, inspectionDate, inspector, result,
      remarks, photos, createdAt, updatedAt, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.deviceId,
      record.deviceName,
      record.department,
      record.inspectionDate,
      record.inspector,
      record.result,
      record.remarks || null,
      record.photos && record.photos.length > 0 ? JSON.stringify(record.photos) : null,
      record.createdAt,
      record.updatedAt,
      0,
    ]
  );

  if (queueId) {
    await logDiff(queueId, 'inspection', id, 'create', null, record, operator);
  }

  return record;
};

export const getInspectionRecord = async (id: string): Promise<InspectionRecord | null> => {
  const row = await getOne<any>(
    `SELECT * FROM inspection_records WHERE id = ? AND isDeleted = 0`,
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    photos: row.photos ? JSON.parse(row.photos) : [],
    isDeleted: row.isDeleted === 1,
  };
};

export const updateInspectionRecord = async (
  id: string,
  updates: Partial<InspectionRecord>,
  operator: string,
  queueId?: string
): Promise<InspectionRecord | null> => {
  const existing = await getInspectionRecord(id);
  if (!existing) return null;

  const now = formatISO(new Date());
  const updated = { ...existing, ...updates, updatedAt: now };

  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt');
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'photos') return updated.photos ? JSON.stringify(updated.photos) : null;
    if (f === 'isDeleted') return updated.isDeleted ? 1 : 0;
    return (updated as any)[f];
  });

  await runQuery(
    `UPDATE inspection_records SET ${setClauses}, updatedAt = ? WHERE id = ?`,
    [...values, now, id]
  );

  if (queueId) {
    await logDiff(queueId, 'inspection', id, 'update', existing, updated, operator);
  }

  return getInspectionRecord(id);
};

export const createCalibrationCertificate = async (
  data: Omit<CalibrationCertificate, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
  operator: string,
  queueId?: string
): Promise<CalibrationCertificate> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  const record: CalibrationCertificate = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await runQuery(
    `INSERT INTO calibration_certificates (
      id, deviceId, deviceName, certificateNo, calibrationDate, validUntil,
      calibrationOrg, status, certificateFile, createdAt, updatedAt, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.deviceId,
      record.deviceName,
      record.certificateNo,
      record.calibrationDate,
      record.validUntil,
      record.calibrationOrg,
      record.status,
      record.certificateFile || null,
      record.createdAt,
      record.updatedAt,
      0,
    ]
  );

  if (queueId) {
    await logDiff(queueId, 'calibration', id, 'create', null, record, operator);
  }

  return record;
};

export const getCalibrationCertificate = async (id: string): Promise<CalibrationCertificate | null> => {
  const row = await getOne<any>(
    `SELECT * FROM calibration_certificates WHERE id = ? AND isDeleted = 0`,
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    isDeleted: row.isDeleted === 1,
  };
};

export const updateCalibrationCertificate = async (
  id: string,
  updates: Partial<CalibrationCertificate>,
  operator: string,
  queueId?: string
): Promise<CalibrationCertificate | null> => {
  const existing = await getCalibrationCertificate(id);
  if (!existing) return null;

  const now = formatISO(new Date());
  const updated = { ...existing, ...updates, updatedAt: now };

  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt');
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'isDeleted') return updated.isDeleted ? 1 : 0;
    return (updated as any)[f];
  });

  await runQuery(
    `UPDATE calibration_certificates SET ${setClauses}, updatedAt = ? WHERE id = ?`,
    [...values, now, id]
  );

  if (queueId) {
    await logDiff(queueId, 'calibration', id, 'update', existing, updated, operator);
  }

  return getCalibrationCertificate(id);
};

export const checkCalibrationStatus = async (deviceId: string): Promise<void> => {
  const certificates = await getAll<any>(
    `SELECT * FROM calibration_certificates WHERE deviceId = ? AND isDeleted = 0`,
    [deviceId]
  );

  const now = new Date();
  for (const cert of certificates) {
    try {
      const validUntil = parseISO(cert.validUntil);
      if (isAfter(now, validUntil) && cert.status === 'valid') {
        await updateCalibrationCertificate(cert.id, { status: 'expired' }, 'system');
      }
    } catch (e) {
    }
  }
};

export const createRepairQuote = async (
  data: Omit<RepairQuote, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
  operator: string,
  queueId?: string
): Promise<RepairQuote> => {
  const id = uuidv4();
  const now = formatISO(new Date());

  const record: RepairQuote = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    photos: data.photos || [],
  };

  await runQuery(
    `INSERT INTO repair_quotes (
      id, deviceId, deviceName, quoteNo, repairDate, description, amount, quantity,
      status, serviceRemarks, manualOpinion, photos, createdAt, updatedAt, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.deviceId,
      record.deviceName,
      record.quoteNo,
      record.repairDate,
      record.description,
      record.amount,
      record.quantity,
      record.status,
      record.serviceRemarks || null,
      record.manualOpinion || null,
      record.photos && record.photos.length > 0 ? JSON.stringify(record.photos) : null,
      record.createdAt,
      record.updatedAt,
      0,
    ]
  );

  if (queueId) {
    await logDiff(queueId, 'repair', id, 'create', null, record, operator);
  }

  return record;
};

export const getRepairQuote = async (id: string): Promise<RepairQuote | null> => {
  const row = await getOne<any>(
    `SELECT * FROM repair_quotes WHERE id = ? AND isDeleted = 0`,
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    photos: row.photos ? JSON.parse(row.photos) : [],
    isDeleted: row.isDeleted === 1,
  };
};

export const updateRepairQuote = async (
  id: string,
  updates: Partial<RepairQuote>,
  operator: string,
  queueId?: string
): Promise<RepairQuote | null> => {
  const existing = await getRepairQuote(id);
  if (!existing) return null;

  const now = formatISO(new Date());
  const updated = { ...existing, ...updates, updatedAt: now };

  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt');
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'photos') return updated.photos ? JSON.stringify(updated.photos) : null;
    if (f === 'isDeleted') return updated.isDeleted ? 1 : 0;
    return (updated as any)[f];
  });

  await runQuery(
    `UPDATE repair_quotes SET ${setClauses}, updatedAt = ? WHERE id = ?`,
    [...values, now, id]
  );

  if (queueId) {
    await logDiff(queueId, 'repair', id, 'update', existing, updated, operator);
  }

  return getRepairQuote(id);
};

export const getDeviceLinkedRecords = async (deviceId: string) => {
  const inspections = await getAll<any>(
    `SELECT id, inspectionDate, result FROM inspection_records 
     WHERE deviceId = ? AND isDeleted = 0 ORDER BY inspectionDate DESC`,
    [deviceId]
  );

  const calibrations = await getAll<any>(
    `SELECT id, certificateNo, calibrationDate, validUntil, status FROM calibration_certificates 
     WHERE deviceId = ? AND isDeleted = 0 ORDER BY calibrationDate DESC`,
    [deviceId]
  );

  const repairs = await getAll<any>(
    `SELECT id, quoteNo, repairDate, amount, status FROM repair_quotes 
     WHERE deviceId = ? AND isDeleted = 0 ORDER BY repairDate DESC`,
    [deviceId]
  );

  return {
    inspections,
    calibrations,
    repairs,
  };
};

export const getRecordByIdAndType = async (recordType: RecordType, recordId: string) => {
  switch (recordType) {
    case 'inspection':
      return getInspectionRecord(recordId);
    case 'calibration':
      return getCalibrationCertificate(recordId);
    case 'repair':
      return getRepairQuote(recordId);
    default:
      return null;
  }
};
