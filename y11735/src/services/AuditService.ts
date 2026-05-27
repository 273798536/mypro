import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '../models';

export interface AuditLogData {
  operationType: string;
  module: string;
  batchNo?: string;
  recordNo?: string;
  studentId?: string;
  operator: string;
  beforeData?: unknown;
  afterData?: unknown;
  changeReason?: string;
  ipAddress?: string;
}

class AuditService {
  static async log(data: AuditLogData): Promise<void> {
    await AuditLog.create({
      logId: uuidv4(),
      operationType: data.operationType,
      module: data.module,
      batchNo: data.batchNo,
      recordNo: data.recordNo,
      studentId: data.studentId,
      operator: data.operator,
      beforeData: data.beforeData ? JSON.stringify(data.beforeData) : undefined,
      afterData: data.afterData ? JSON.stringify(data.afterData) : undefined,
      changeReason: data.changeReason,
      ipAddress: data.ipAddress
    });
  }

  static async getLogsByBatch(batchNo: string): Promise<AuditLog[]> {
    return AuditLog.findAll({
      where: { batchNo },
      order: [['createdAt', 'DESC']]
    });
  }

  static async getLogsByRecord(recordNo: string): Promise<AuditLog[]> {
    return AuditLog.findAll({
      where: { recordNo },
      order: [['createdAt', 'DESC']]
    });
  }

  static async getLogsByStudent(studentId: string): Promise<AuditLog[]> {
    return AuditLog.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']]
    });
  }
}

export default AuditService;
