import fs from 'fs';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import dayjs from 'dayjs';
import {
  DataSourceType,
  ImportStrategy,
  TaskStatus,
  MaterialItem,
  LogisticsReceipt,
  OnSiteBorrow,
  InventoryDiff,
  SourceData,
} from '../models/types';
import { MaterialDAO, BatchDAO, HistoryDAO, AuditLogDAO, FailedRecordDAO, AsyncTaskDAO } from '../db/dao';
import { diffService } from './diffService';

export interface ImportResult {
  batchId: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdCount: number;
  updatedCount: number;
  ignoredCount: number;
  overwrittenCount: number;
  diffs: any[];
}

export class ImportService {
  private materialDAO: MaterialDAO;
  private batchDAO: BatchDAO;
  private historyDAO: HistoryDAO;
  private auditLogDAO: AuditLogDAO;
  private failedRecordDAO: FailedRecordDAO;
  private asyncTaskDAO: AsyncTaskDAO;

  constructor(workDir?: string) {
    this.materialDAO = new MaterialDAO(workDir);
    this.batchDAO = new BatchDAO(workDir);
    this.historyDAO = new HistoryDAO(workDir);
    this.auditLogDAO = new AuditLogDAO(workDir);
    this.failedRecordDAO = new FailedRecordDAO(workDir);
    this.asyncTaskDAO = new AsyncTaskDAO(workDir);
  }

  calculateFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  parseCSV(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  validateRecord(sourceType: DataSourceType, record: any, lineNo: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (sourceType) {
      case 'material_list':
        if (!record.material_code) errors.push('缺少物料编码');
        if (!record.material_name) errors.push('缺少物料名称');
        if (!record.quantity || isNaN(Number(record.quantity))) errors.push('数量无效');
        if (!record.unit) errors.push('缺少单位');
        break;
      case 'logistics_receipt':
        if (!record.waybill_no) errors.push('缺少运单号');
        if (!record.material_code) errors.push('缺少物料编码');
        if (!record.material_name) errors.push('缺少物料名称');
        if (!record.quantity || isNaN(Number(record.quantity))) errors.push('数量无效');
        break;
      case 'on_site_borrow':
        if (!record.borrow_no) errors.push('缺少借用单号');
        if (!record.material_code) errors.push('缺少物料编码');
        if (!record.material_name) errors.push('缺少物料名称');
        if (!record.quantity || isNaN(Number(record.quantity))) errors.push('数量无效');
        if (!record.borrower) errors.push('缺少借用人');
        break;
      case 'inventory_diff':
        if (!record.material_code) errors.push('缺少物料编码');
        if (!record.material_name) errors.push('缺少物料名称');
        if (!record.expected_quantity || isNaN(Number(record.expected_quantity))) errors.push('账面数量无效');
        if (!record.actual_quantity || isNaN(Number(record.actual_quantity))) errors.push('实际数量无效');
        if (!record.diff_type) errors.push('缺少差异类型');
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  convertToSourceData(sourceType: DataSourceType, record: any, batchId: string, lineNo: number): SourceData {
    const now = dayjs().toISOString();
    const baseData = {
      source_type: sourceType,
      source_batch_id: batchId,
      original_line_no: lineNo,
      material_code: String(record.material_code || '').trim(),
      material_name: String(record.material_name || '').trim(),
      quantity: Number(record.quantity) || 0,
      unit: String(record.unit || '').trim(),
      remark: record.remark?.trim(),
      import_time: now,
    };

    switch (sourceType) {
      case 'material_list':
        return {
          ...baseData,
          specification: record.specification?.trim(),
          warehouse: record.warehouse?.trim(),
          location: record.location?.trim(),
          batch_no: record.batch_no?.trim(),
          responsible_person: record.responsible_person?.trim(),
          department: record.department?.trim(),
        } as MaterialItem;

      case 'logistics_receipt':
        return {
          ...baseData,
          waybill_no: String(record.waybill_no || '').trim(),
          sender: record.sender?.trim(),
          receiver: record.receiver?.trim(),
          receive_time: record.receive_time?.trim(),
          receive_address: record.receive_address?.trim(),
          sign_status: record.sign_status as any,
        } as LogisticsReceipt;

      case 'on_site_borrow':
        return {
          ...baseData,
          borrow_no: String(record.borrow_no || '').trim(),
          borrower: String(record.borrower || '').trim(),
          borrower_department: record.borrower_department?.trim(),
          borrow_time: record.borrow_time?.trim(),
          expected_return_time: record.expected_return_time?.trim(),
          actual_return_time: record.actual_return_time?.trim(),
          return_status: (record.return_status || 'unconfirmed') as any,
          keeper: record.keeper?.trim(),
        } as OnSiteBorrow;

      case 'inventory_diff':
        const expected = Number(record.expected_quantity) || 0;
        const actual = Number(record.actual_quantity) || 0;
        return {
          ...baseData,
          expected_quantity: expected,
          actual_quantity: actual,
          diff_quantity: actual - expected,
          diff_type: record.diff_type as any,
          check_time: record.check_time?.trim(),
          checker: record.checker?.trim(),
          reason: record.reason?.trim(),
        } as InventoryDiff;
    }
  }

  async importData(
    sourceType: DataSourceType,
    filePath: string,
    strategy: ImportStrategy,
    operator: string,
    remark?: string
  ): Promise<ImportResult> {
    const fileHash = this.calculateFileHash(filePath);
    const fileName = filePath.split('/').pop() || 'unknown';
    const now = dayjs().toISOString();

    const records = this.parseCSV(filePath);
    const totalCount = records.length;

    const existingBatch = await this.batchDAO.findByFileHash(fileHash);

    if (existingBatch && strategy === 'ignore') {
      return {
        batchId: existingBatch.id,
        totalCount: existingBatch.total_count,
        successCount: existingBatch.total_count,
        failedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        ignoredCount: existingBatch.total_count,
        overwrittenCount: 0,
        diffs: [],
      };
    }

    const batchId = await this.batchDAO.createBatch({
      source_type: sourceType,
      file_name: fileName,
      file_hash: fileHash,
      strategy: strategy,
      total_count: totalCount,
      success_count: 0,
      failed_count: 0,
      status: 'processing',
      operator: operator,
      import_time: now,
      remark: remark,
    });

    let successCount = 0;
    let failedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;
    let overwrittenCount = 0;
    const diffs: any[] = [];

    const existingData = await this.materialDAO.findAll(sourceType);
    const existingMap = new Map(existingData.map((d) => [d.material_code, d]));

    if (strategy === 'overwrite') {
      overwrittenCount = existingData.length;
      for (const item of existingData) {
        await this.historyDAO.saveHistory(
          item.material_code,
          sourceType,
          item,
          'delete',
          operator,
          batchId
        );
      }
      await this.materialDAO.deleteByBatchId(sourceType, batchId);
      existingMap.clear();
    }

    for (let i = 0; i < records.length; i++) {
      const lineNo = i + 2;
      const record = records[i];

      try {
        const validation = this.validateRecord(sourceType, record, lineNo);
        if (!validation.valid) {
          await this.failedRecordDAO.create({
            batch_id: batchId,
            source_type: sourceType,
            original_line_no: lineNo,
            material_code: record.material_code || '',
            error_type: 'validation_error',
            error_message: validation.errors.join('; '),
            raw_data: JSON.stringify(record),
            status: 'pending',
            created_at: now,
          });
          failedCount++;
          continue;
        }

        const data = this.convertToSourceData(sourceType, record, batchId, lineNo);
        const existing = existingMap.get(data.material_code);

        if (existing && strategy === 'ignore') {
          ignoredCount++;
          successCount++;
          continue;
        }

        if (existing) {
          const changes = diffService.compareObjects(existing, data);
          if (changes.length > 0) {
            diffs.push({
              material_code: data.material_code,
              original_line_no: lineNo,
              changes,
            });

            await this.historyDAO.saveHistory(
              data.material_code,
              sourceType,
              existing,
              'update',
              operator,
              batchId
            );

            for (const change of changes) {
              await this.auditLogDAO.createLog({
                batch_id: batchId,
                source_type: sourceType,
                action: 'update',
                material_code: data.material_code,
                field_name: change.field,
                old_value: String(change.old_value ?? ''),
                new_value: String(change.new_value ?? ''),
                operator: operator,
                operate_time: now,
                original_line_no: lineNo,
              });
            }
            updatedCount++;
          } else {
            ignoredCount++;
          }
        } else {
          await this.historyDAO.saveHistory(
            data.material_code,
            sourceType,
            data,
            'create',
            operator,
            batchId
          );

          await this.auditLogDAO.createLog({
            batch_id: batchId,
            source_type: sourceType,
            action: 'create',
            material_code: data.material_code,
            operator: operator,
            operate_time: now,
            original_line_no: lineNo,
          });
          createdCount++;
        }

        await this.insertData(sourceType, data);
        successCount++;
      } catch (error: any) {
        await this.failedRecordDAO.create({
          batch_id: batchId,
          source_type: sourceType,
          original_line_no: lineNo,
          material_code: record.material_code || '',
          error_type: 'import_error',
          error_message: error.message || '未知错误',
          raw_data: JSON.stringify(record),
          status: 'pending',
          created_at: now,
        });
        failedCount++;
      }
    }

    await this.batchDAO.updateBatchStats(batchId, totalCount, successCount, failedCount, 'success');
    await this.batchDAO.updateBatchDetailStats(batchId, {
      created: createdCount,
      updated: updatedCount,
      ignored: ignoredCount,
      overwritten: overwrittenCount,
    });

    return {
      batchId,
      totalCount,
      successCount,
      failedCount,
      createdCount,
      updatedCount,
      ignoredCount,
      overwrittenCount,
      diffs,
    };
  }

  private async insertData(sourceType: DataSourceType, data: SourceData): Promise<string> {
    switch (sourceType) {
      case 'material_list':
        return this.materialDAO.insertMaterialItem(data as MaterialItem);
      case 'logistics_receipt':
        return this.materialDAO.insertLogisticsReceipt(data as LogisticsReceipt);
      case 'on_site_borrow':
        return this.materialDAO.insertOnSiteBorrow(data as OnSiteBorrow);
      case 'inventory_diff':
        return this.materialDAO.insertInventoryDiff(data as InventoryDiff);
    }
  }

  async createAsyncTask(
    type: string,
    operator: string,
    batchId?: string,
    maxRetries: number = 3
  ): Promise<string> {
    return this.asyncTaskDAO.create({
      type,
      batch_id: batchId,
      status: 'pending',
      retry_count: 0,
      max_retries: maxRetries,
      created_at: dayjs().toISOString(),
      operator,
    });
  }

  async replayFailedRecord(recordId: string, operator: string): Promise<{ success: boolean; message: string }> {
    const record = await this.failedRecordDAO.findById(recordId);
    if (!record) {
      return { success: false, message: '失败记录不存在' };
    }

    if (record.status === 'fixed') {
      return { success: false, message: '该记录已标记为已修复' };
    }

    try {
      const rawData = JSON.parse(record.raw_data);
      const now = dayjs().toISOString();
      const sourceType = record.source_type as DataSourceType;
      const lineNo = record.original_line_no;

      const validation = this.validateRecord(sourceType, rawData, lineNo);
      if (!validation.valid) {
        return {
          success: false,
          message: '验证失败: ' + validation.errors.join('; '),
        };
      }

      const batchId = record.batch_id;
      const data = this.convertToSourceData(sourceType, rawData, batchId, lineNo);
      const existing = await this.materialDAO.findByMaterialCode(sourceType, data.material_code);

      if (existing.length > 0) {
        const changes = diffService.compareObjects(existing[0], data);
        if (changes.length > 0) {
          await this.historyDAO.saveHistory(
            data.material_code,
            sourceType,
            existing[0],
            'update',
            operator,
            batchId
          );

          for (const change of changes) {
            await this.auditLogDAO.createLog({
              batch_id: batchId,
              source_type: sourceType,
              action: 'update',
              material_code: data.material_code,
              field_name: change.field,
              old_value: String(change.old_value ?? ''),
              new_value: String(change.new_value ?? ''),
              operator: operator,
              operate_time: now,
              original_line_no: lineNo,
            });
          }
        }
      } else {
        await this.historyDAO.saveHistory(
          data.material_code,
          sourceType,
          data,
          'create',
          operator,
          batchId
        );

        await this.auditLogDAO.createLog({
          batch_id: batchId,
          source_type: sourceType,
          action: 'create',
          material_code: data.material_code,
          operator: operator,
          operate_time: now,
          original_line_no: lineNo,
        });
      }

      await this.insertData(sourceType, data);
      await this.failedRecordDAO.updateStatus(recordId, 'fixed', operator);

      return { success: true, message: '重放成功' };
    } catch (error: any) {
      return { success: false, message: '重放失败: ' + error.message };
    }
  }

  async replayBatchFailedRecords(batchId: string, operator: string): Promise<{ total: number; success: number; failed: number }> {
    const records = await this.failedRecordDAO.findByBatchId(batchId);
    const pendingRecords = records.filter((r) => r.status === 'pending');

    let success = 0;
    let failed = 0;

    for (const record of pendingRecords) {
      const result = await this.replayFailedRecord(record.id!, operator);
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { total: pendingRecords.length, success, failed };
  }

  async processRetryableTasks(operator: string): Promise<{ processed: number; success: number; failed: number }> {
    const retryable = await this.asyncTaskDAO.findRetryable();
    let success = 0;
    let failed = 0;

    for (const task of retryable) {
      await this.asyncTaskDAO.updateStatus(task.id, 'processing');

      try {
        const newRetryCount = task.retry_count + 1;

        if (task.batch_id) {
          const batch = await this.batchDAO.findById(task.batch_id);
          if (batch) {
            const replayResult = await this.replayBatchFailedRecords(task.batch_id, operator);

            if (replayResult.failed === 0 && replayResult.success > 0) {
              await this.asyncTaskDAO.updateStatus(task.id, 'success');
              success++;
            } else if (newRetryCount >= task.max_retries) {
              await this.asyncTaskDAO.updateStatus(task.id, 'permanent_failed', '已达到最大重试次数，部分记录仍无法导入', newRetryCount);
              failed++;
            } else {
              const nextRetry = dayjs().add(newRetryCount * 5, 'minute').toISOString();
              await this.asyncTaskDAO.updateStatus(
                task.id,
                'retry_waiting',
                `仍有 ${replayResult.failed} 条记录失败`,
                newRetryCount,
                nextRetry
              );
              failed++;
            }
            continue;
          }
        }

        if (newRetryCount >= task.max_retries) {
          await this.asyncTaskDAO.updateStatus(task.id, 'permanent_failed', '已达到最大重试次数', newRetryCount);
          failed++;
        } else {
          const nextRetry = dayjs().add(newRetryCount * 5, 'minute').toISOString();
          await this.asyncTaskDAO.updateStatus(
            task.id,
            'retry_waiting',
            undefined,
            newRetryCount,
            nextRetry
          );
          success++;
        }
      } catch (error: any) {
        const newRetryCount = task.retry_count + 1;
        if (newRetryCount >= task.max_retries) {
          await this.asyncTaskDAO.updateStatus(task.id, 'permanent_failed', error.message, newRetryCount);
        } else {
          await this.asyncTaskDAO.updateStatus(task.id, 'retry_waiting', error.message, newRetryCount);
        }
        failed++;
      }
    }

    return {
      processed: retryable.length,
      success,
      failed,
    };
  }

  async markTaskAsManual(taskId: string, operator: string): Promise<void> {
    await this.asyncTaskDAO.updateStatus(taskId, 'manual_waiting');
  }

  async markTaskAsPermanentFailed(taskId: string, operator: string, reason: string): Promise<void> {
    await this.asyncTaskDAO.updateStatus(taskId, 'permanent_failed', reason);
  }

  async getTaskStatus(taskId: string): Promise<any | null> {
    return this.asyncTaskDAO.findById(taskId);
  }
}

export const importService = new ImportService();
