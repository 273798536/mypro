import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { RefundBatch, RefundRecord, Student } from '../models';
import BalanceSplitService from './BalanceSplitService';
import ValidationService from './ValidationService';
import AuditService from './AuditService';

export interface ImportRecord {
  studentId: string;
  cardNo: string;
  source?: string;
}

export interface RefundProcessResult {
  success: boolean;
  recordNo?: string;
  studentId: string;
  errors: string[];
  warnings: string[];
}

class RefundService {
  static async createBatch(batchName: string, operator: string): Promise<RefundBatch> {
    const batchNo = `BATCH${Date.now()}`;
    
    const batch = await RefundBatch.create({
      batchNo,
      batchName,
      totalCount: 0,
      totalAmount: 0,
      status: 'draft',
      operator,
      source: '手动创建'
    });

    await AuditService.log({
      operationType: 'create',
      module: 'batch',
      batchNo,
      operator,
      afterData: batch.toJSON()
    });

    return batch;
  }

  static async importRecords(
    batchNo: string,
    records: ImportRecord[],
    operator: string
  ): Promise<{ total: number; success: number; failed: number; results: RefundProcessResult[] }> {
    const batch = await RefundBatch.findOne({ where: { batchNo } });
    if (!batch) {
      throw new Error('批次不存在');
    }

    const results: RefundProcessResult[] = [];
    let successCount = 0;
    let totalAmount = 0;

    for (const record of records) {
      const result = await this.processImportRecord(batchNo, record, operator);
      results.push(result);
      
      if (result.success && result.recordNo) {
        successCount++;
        const refundRecord = await RefundRecord.findOne({ 
          where: { recordNo: result.recordNo }
        });
        if (refundRecord) {
          totalAmount += Number(refundRecord.actualRefundAmount) || 0;
        }
      }
    }

    await batch.update({
      totalCount: batch.totalCount + successCount,
      totalAmount: Number(batch.totalAmount) + totalAmount
    });

    await AuditService.log({
      operationType: 'import',
      module: 'batch',
      batchNo,
      operator,
      changeReason: `导入 ${records.length} 条记录，成功 ${successCount} 条`
    });

    return {
      total: records.length,
      success: successCount,
      failed: records.length - successCount,
      results
    };
  }

  private static async processImportRecord(
    batchNo: string,
    importRecord: ImportRecord,
    operator: string
  ): Promise<RefundProcessResult> {
    const { studentId, cardNo } = importRecord;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const validation = await ValidationService.validateStudent(studentId, cardNo);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      const student = await Student.findOne({ where: { studentId } });
      if (!student) {
        errors.push('未找到学生档案信息');
      }

      let splitResult;
      try {
        splitResult = await BalanceSplitService.splitBalance(studentId, cardNo);
        warnings.push(...splitResult.warnings);
      } catch (e) {
        errors.push((e as Error).message);
      }

      if (errors.length > 0) {
        return {
          success: false,
          studentId,
          errors,
          warnings
        };
      }

      const recordNo = `REC${Date.now()}${Math.random().toString(36).substr(2, 4)}`;

      await RefundRecord.create({
        recordNo,
        batchNo,
        studentId,
        name: student?.name,
        cardNo,
        originalBalance: splitResult!.originalBalance,
        selfRechargeRefund: splitResult!.selfRechargeRefund,
        subsidyRefund: splitResult!.subsidyRefund,
        nonRefundableAmount: splitResult!.nonRefundableAmount,
        actualRefundAmount: splitResult!.actualRefundAmount,
        status: 'pending',
        statusReason: warnings.length > 0 ? '存在警告信息' : undefined,
        warnings: warnings.length > 0 ? JSON.stringify(warnings) : undefined,
        operator,
        bankCard: student?.bankCard,
        source: importRecord.source || '导入'
      });

      await AuditService.log({
        operationType: 'create',
        module: 'record',
        batchNo,
        recordNo,
        studentId,
        operator,
        changeReason: '导入创建'
      });

      return {
        success: true,
        recordNo,
        studentId,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        studentId,
        errors: [(error as Error).message],
        warnings
      };
    }
  }

  static async reviewBatch(batchNo: string, operator: string, approved: boolean, remarks?: string): Promise<RefundBatch> {
    const batch = await RefundBatch.findOne({ where: { batchNo } });
    if (!batch) {
      throw new Error('批次不存在');
    }

    const beforeData = batch.toJSON();
    
    const newStatus = approved ? 'approved' : 'rejected';
    await batch.update({
      status: newStatus,
      reviewer: operator,
      reviewDate: new Date(),
      remarks
    });

    await RefundRecord.update(
      { status: approved ? 'approved' : 'rejected', statusReason: remarks },
      { where: { batchNo, status: 'pending' } }
    );

    await AuditService.log({
      operationType: 'review',
      module: 'batch',
      batchNo,
      operator,
      beforeData,
      afterData: batch.toJSON(),
      changeReason: approved ? '复核通过' : '复核拒绝'
    });

    return batch;
  }

  static async reviewRecord(recordNo: string, operator: string, approved: boolean, reason?: string): Promise<RefundRecord> {
    const record = await RefundRecord.findOne({ where: { recordNo } });
    if (!record) {
      throw new Error('退款记录不存在');
    }

    const beforeData = record.toJSON();
    
    await record.update({
      status: approved ? 'approved' : 'rejected',
      statusReason: reason,
      operator,
      reviewDate: new Date()
    });

    await AuditService.log({
      operationType: 'review',
      module: 'record',
      batchNo: record.batchNo,
      recordNo,
      studentId: record.studentId,
      operator,
      beforeData,
      afterData: record.toJSON(),
      changeReason: approved ? '记录复核通过' : `记录复核拒绝: ${reason || ''}`
    });

    return record;
  }

  static async updateRecordAmount(
    recordNo: string,
    operator: string,
    data: {
      selfRechargeRefund?: number;
      subsidyRefund?: number;
      nonRefundableAmount?: number;
    },
    changeReason: string
  ): Promise<RefundRecord> {
    const record = await RefundRecord.findOne({ where: { recordNo } });
    if (!record) {
      throw new Error('退款记录不存在');
    }

    if (record.status !== 'pending') {
      throw new Error('仅待审核状态的记录可修改');
    }

    const beforeData = record.toJSON();

    const actualRefundAmount = 
      (data.selfRechargeRefund ?? record.selfRechargeRefund) + 
      (data.subsidyRefund ?? record.subsidyRefund);

    await record.update({
      ...data,
      actualRefundAmount,
      operator
    });

    await AuditService.log({
      operationType: 'update',
      module: 'record',
      batchNo: record.batchNo,
      recordNo,
      studentId: record.studentId,
      operator,
      beforeData,
      afterData: record.toJSON(),
      changeReason
    });

    return record;
  }

  static async getBatchList(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ rows: RefundBatch[]; count: number }> {
    const { status, page = 1, pageSize = 20 } = params || {};
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    return RefundBatch.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
  }

  static async getBatchDetail(batchNo: string): Promise<{
    batch: RefundBatch;
    records: RefundRecord[];
    statistics: {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
      totalAmount: number;
      approvedAmount: number;
    };
  }> {
    const batch = await RefundBatch.findOne({ where: { batchNo } });
    if (!batch) {
      throw new Error('批次不存在');
    }

    const records = await RefundRecord.findAll({
      where: { batchNo },
      order: [['createdAt', 'DESC']]
    });

    const statistics = {
      total: records.length,
      approved: records.filter(r => r.status === 'approved').length,
      rejected: records.filter(r => r.status === 'rejected').length,
      pending: records.filter(r => r.status === 'pending').length,
      totalAmount: records.reduce((sum, r) => sum + Number(r.actualRefundAmount), 0),
      approvedAmount: records.filter(r => r.status === 'approved').reduce((sum, r) => sum + Number(r.actualRefundAmount), 0)
    };

    return { batch, records, statistics };
  }

  static async exportBatch(batchNo: string): Promise<RefundRecord[]> {
    const records = await RefundRecord.findAll({
      where: { 
        batchNo,
        status: { [Op.in]: ['approved', 'processed'] }
      },
      order: [['createdAt', 'DESC']]
    });

    return records;
  }

  static async markProcessed(batchNo: string, operator: string): Promise<RefundBatch> {
    const batch = await RefundBatch.findOne({ where: { batchNo } });
    if (!batch) {
      throw new Error('批次不存在');
    }

    const beforeData = batch.toJSON();
    
    await batch.update({
      status: 'completed',
      operator
    });

    await RefundRecord.update(
      { status: 'processed' },
      { where: { batchNo, status: 'approved' } }
    );

    await AuditService.log({
      operationType: 'process',
      module: 'batch',
      batchNo,
      operator,
      beforeData,
      afterData: batch.toJSON(),
      changeReason: '批次处理完成，标记为已打款'
    });

    return batch;
  }
}

export default RefundService;
