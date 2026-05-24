import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { all } from '../database';
import { Batch, Material, ChangeHistory, ProcessResult, BatchStatus, User } from '../types';

function mapBatchRow(row: any): Batch {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    trainingName: row.training_name,
    trainingDate: row.training_date,
    status: row.status,
    processResult: row.process_result,
    remark: row.remark,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMaterialRow(row: any): Material & { isSensitive: boolean } {
  return {
    id: row.id,
    batchId: row.batch_id,
    type: row.type,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileHash: row.file_hash,
    fileSize: row.file_size,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    isSensitive: row.is_sensitive === 1,
    processResult: row.process_result,
    processNote: row.process_note
  };
}

function mapChangeHistoryRow(row: any): ChangeHistory {
  return {
    id: row.id,
    batchId: row.batch_id,
    materialId: row.material_id,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    changeReason: row.change_reason
  };
}

export class HrbpService {
  static maskSensitiveData(value: string | undefined, fieldName: string): string {
    if (!value) return '';
    
    if (fieldName.includes('name') || fieldName.includes('姓名')) {
      return value.length > 1 ? value[0] + '*'.repeat(value.length - 1) : '*';
    }
    if (fieldName.includes('phone') || fieldName.includes('电话')) {
      return value.length > 7 ? value.slice(0, 3) + '****' + value.slice(-4) : '****';
    }
    if (fieldName.includes('id') || fieldName.includes('证件')) {
      return value.length > 6 ? value.slice(0, 4) + '********' + value.slice(-4) : '********';
    }
    return value;
  }

  static async getRoleView(role: string, batchId?: string): Promise<{
    overview: any;
    batches: any[];
    sensitiveFields: string[];
  }> {
    const batchQuery = batchId ? `WHERE id = ?` : '';
    const params = batchId ? [batchId] : [];

    const batchRows = await all<any>(
      `SELECT * FROM batches ${batchQuery} ORDER BY created_at DESC`,
      params
    );
    const batches = batchRows.map(r => mapBatchRow(r));

    const materialRows = await all<any>(
      `SELECT * FROM materials ${batchId ? 'WHERE batch_id = ?' : ''}`,
      batchId ? [batchId] : []
    );
    const materials = materialRows.map(r => mapMaterialRow(r));

    const changeRows = await all<any>(
      `SELECT * FROM change_history ${batchId ? 'WHERE batch_id = ?' : ''} ORDER BY changed_at DESC`,
      batchId ? [batchId] : []
    );
    const changeHistory = changeRows.map(r => mapChangeHistoryRow(r));

    const batchMaterialsMap = new Map<string, Material[]>();
    materials.forEach(m => {
      const list = batchMaterialsMap.get(m.batchId) || [];
      list.push(m);
      batchMaterialsMap.set(m.batchId, list);
    });

    const batchChangesMap = new Map<string, ChangeHistory[]>();
    changeHistory.forEach(c => {
      const list = batchChangesMap.get(c.batchId) || [];
      list.push(c);
      batchChangesMap.set(c.batchId, list);
    });

    const enrichedBatches = batches.map(batch => {
      const batchMaterials = batchMaterialsMap.get(batch.id) || [];
      const changes = batchChangesMap.get(batch.id) || [];
      
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        trainingName: batch.trainingName,
        trainingDate: batch.trainingDate,
        status: batch.status,
        statusLabel: this.getStatusLabel(batch.status),
        processResult: batch.processResult,
        processResultLabel: batch.processResult ? this.getResultLabel(batch.processResult) : null,
        materials: role === 'hrbp' || role === 'auditor'
          ? batchMaterials
          : batchMaterials.map(m => ({
              ...m,
              fileName: m.isSensitive ? this.maskSensitiveData(m.fileName, 'name') : m.fileName,
              fileUrl: m.isSensitive ? '[已脱敏]' : m.fileUrl
            })),
        changeCount: changes.length,
        lastChangedAt: changes.length > 0 ? changes[0].changedAt : null,
        lastChangedBy: changes.length > 0 ? changes[0].changedBy : null,
        createdBy: batch.createdBy,
        createdAt: batch.createdAt,
        remark: batch.remark
      };
    });

    const stats = await this.calculateStats(batches, materials);

    return {
      overview: {
        role,
        totalBatches: batches.length,
        ...stats,
        generatedAt: new Date().toISOString()
      },
      batches: enrichedBatches,
      sensitiveFields: ['fileName', 'fileUrl', 'fileHash']
    };
  }

  private static getStatusLabel(status: BatchStatus): string {
    const labels: Record<BatchStatus, string> = {
      [BatchStatus.DRAFT]: '草稿',
      [BatchStatus.SUBMITTED]: '已提交',
      [BatchStatus.REJECTED]: '已驳回',
      [BatchStatus.SECONDARY_CONFIRMED]: '二次确认',
      [BatchStatus.AUDIT_ONLY]: '只读审计'
    };
    return labels[status] || status;
  }

  private static getResultLabel(result: ProcessResult): string {
    const labels: Record<ProcessResult, string> = {
      [ProcessResult.NORMAL]: '正常',
      [ProcessResult.PENDING_REVIEW]: '待复核',
      [ProcessResult.UNPROCESSABLE]: '无法处理'
    };
    return labels[result] || result;
  }

  private static async calculateStats(batches: Batch[], materials: (Material & { isSensitive: boolean })[]): Promise<any> {
    const byStatus = {} as Record<string, number>;
    const byResult = {} as Record<string, number>;

    batches.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (b.processResult) {
        byResult[b.processResult] = (byResult[b.processResult] || 0) + 1;
      }
    });

    const sensitiveCount = materials.filter(m => m.isSensitive).length;

    return {
      byStatus: Object.entries(byStatus).map(([key, value]) => ({
        status: key,
        label: this.getStatusLabel(key as BatchStatus),
        count: value
      })),
      byResult: Object.entries(byResult).map(([key, value]) => ({
        result: key,
        label: this.getResultLabel(key as ProcessResult),
        count: value
      })),
      totalMaterials: materials.length,
      sensitiveMaterials: sensitiveCount
    };
  }

  static async exportBatchReport(batchId: string, includeSensitive: boolean = false): Promise<string> {
    const batchRows = await all<any>(`SELECT * FROM batches WHERE id = ?`, [batchId]);
    if (batchRows.length === 0) {
      throw new Error(`批次不存在: ${batchId}`);
    }
    const batch = mapBatchRow(batchRows[0]);

    const materialRows = await all<any>(
      `SELECT * FROM materials WHERE batch_id = ?`,
      [batchId]
    );
    const materials = materialRows.map(r => mapMaterialRow(r));

    const changeRows = await all<any>(
      `SELECT * FROM change_history WHERE batch_id = ? ORDER BY changed_at ASC`,
      [batchId]
    );
    const changes = changeRows.map(r => mapChangeHistoryRow(r));

    const exportTime = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `batch-report-${batch.batchNumber}-${exportTime}.csv`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'type', title: '类型' },
        { id: 'field', title: '字段' },
        { id: 'value', title: '值' },
        { id: 'operator', title: '操作人' },
        { id: 'time', title: '时间' },
        { id: 'reason', title: '变更原因' }
      ]
    });

    const records: any[] = [];

    records.push({
      type: '批次信息',
      field: '批次号',
      value: batch.batchNumber,
      operator: batch.createdBy,
      time: batch.createdAt,
      reason: '创建'
    });

    records.push({
      type: '批次信息',
      field: '培训名称',
      value: batch.trainingName,
      operator: '',
      time: '',
      reason: ''
    });

    records.push({
      type: '批次信息',
      field: '培训日期',
      value: batch.trainingDate,
      operator: '',
      time: '',
      reason: ''
    });

    records.push({
      type: '批次信息',
      field: '当前状态',
      value: this.getStatusLabel(batch.status as BatchStatus),
      operator: '',
      time: '',
      reason: ''
    });

    records.push({
      type: '批次信息',
      field: '处理结果',
      value: batch.processResult ? this.getResultLabel(batch.processResult as ProcessResult) : '未处理',
      operator: '',
      time: '',
      reason: ''
    });

    records.push({ type: '---', field: '---', value: '---', operator: '---', time: '---', reason: '---' });

    records.push({
      type: '材料清单',
      field: `共 ${materials.length} 份材料`,
      value: '',
      operator: '',
      time: '',
      reason: ''
    });

    materials.forEach((m, idx) => {
      records.push({
        type: `材料 ${idx + 1}`,
        field: this.getMaterialTypeLabel(m.type),
        value: m.isSensitive && !includeSensitive ? this.maskSensitiveData(m.fileName, 'name') : m.fileName,
        operator: m.uploadedBy,
        time: m.uploadedAt,
        reason: m.processResult ? this.getResultLabel(m.processResult as ProcessResult) : ''
      });
    });

    records.push({ type: '---', field: '---', value: '---', operator: '---', time: '---', reason: '---' });

    records.push({
      type: '变更历史',
      field: `共 ${changes.length} 条变更记录`,
      value: '',
      operator: '',
      time: '',
      reason: ''
    });

    changes.forEach((c, idx) => {
      records.push({
        type: `变更 ${idx + 1}`,
        field: c.fieldName,
        value: `${c.oldValue || '(空)'} → ${c.newValue || '(空)'}`,
        operator: c.changedBy,
        time: c.changedAt,
        reason: c.changeReason
      });
    });

    await csvWriter.writeRecords(records);

    return fileName;
  }

  private static getMaterialTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      registration_form: '报名表',
      sign_qr_code: '签到二维码',
      post_class_assignment: '课后作业',
      customer_service_note: '客服备注',
      anomaly_photo: '异常照片'
    };
    return labels[type] || type;
  }

  static async getFailedItemsReport(): Promise<{
    pendingReview: any[];
    unprocessable: any[];
    failedTasks: any[];
  }> {
    const pendingReviewRows = await all<any>(
      `SELECT m.*, b.batch_number, b.training_name 
       FROM materials m 
       JOIN batches b ON m.batch_id = b.id 
       WHERE m.process_result = ?`,
      [ProcessResult.PENDING_REVIEW]
    );

    const unprocessableRows = await all<any>(
      `SELECT m.*, b.batch_number, b.training_name 
       FROM materials m 
       JOIN batches b ON m.batch_id = b.id 
       WHERE m.process_result = ?`,
      [ProcessResult.UNPROCESSABLE]
    );

    const failedTaskRows = await all<any>(
      `SELECT t.*, b.batch_number 
       FROM async_tasks t 
       LEFT JOIN batches b ON t.batch_id = b.id 
       WHERE t.status IN (?, ?, ?)
       ORDER BY t.created_at DESC`,
      ['pending_retry', 'pending_manual', 'permanent_failed']
    );

    return {
      pendingReview: pendingReviewRows.map(m => ({
        id: m.id,
        batchId: m.batch_id,
        type: m.type,
        fileName: m.file_name,
        fileUrl: m.file_url,
        batchNumber: m.batch_number,
        trainingName: m.training_name,
        processResult: m.process_result,
        processNote: m.process_note
      })),
      unprocessable: unprocessableRows.map(m => ({
        id: m.id,
        batchId: m.batch_id,
        type: m.type,
        fileName: m.file_name,
        fileUrl: m.file_url,
        batchNumber: m.batch_number,
        trainingName: m.training_name,
        processResult: m.process_result,
        processNote: m.process_note
      })),
      failedTasks: failedTaskRows.map(t => ({
        taskId: t.id,
        taskType: t.task_type,
        batchNumber: t.batch_number,
        status: t.status,
        retryCount: t.retry_count,
        lastError: t.last_error,
        createdAt: t.created_at
      }))
    };
  }
}
