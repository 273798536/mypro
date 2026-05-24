const { get, run, all, runInTransaction } = require('../database');
const { getLatestAttachmentsByBatchId } = require('./attachmentService');
const { getValidationSummary, getAllFailedRecords } = require('./validationService');
const { getStatusHistory } = require('./stateService');
const logger = require('../utils/logger');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');

function ensureExportDir() {
  if (!fs.existsSync(config.export.dir)) {
    fs.mkdirSync(config.export.dir, { recursive: true });
  }
}

async function getBatchReportData(batchId) {
  const batch = await get('SELECT * FROM batches WHERE id = ?', [batchId]);
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const attachments = await getLatestAttachmentsByBatchId(batchId);
  const validationSummary = await getValidationSummary(batchId);
  const statusHistory = await getStatusHistory(batchId);
  const failedRecords = await getAllFailedRecords(batchId);

  const unhandledRecords = failedRecords.filter(r => !r.is_resolved);
  const correctedRecords = failedRecords.filter(r => r.is_resolved);
  const needManualConfirmRecords = failedRecords.filter(r => 
    !r.is_resolved && 
    ['DATA_INCONSISTENCY', 'DUPLICATE_RECORD'].includes(r.error_type)
  );

  return {
    batch: {
      id: batch.id,
      batchNo: batch.batch_no,
      projectName: batch.project_name,
      bidNo: batch.bid_no,
      status: batch.status,
      previousStatus: batch.previous_status,
      isFrozen: batch.is_frozen === 1,
      frozenAt: batch.frozen_at,
      frozenBy: batch.frozen_by,
      freezeReason: batch.freeze_reason,
      manualRemark: batch.manual_remark,
      operator: batch.operator,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at
    },
    attachments: attachments.map(a => ({
      id: a.id,
      attachmentType: a.attachment_type,
      fileName: a.file_name,
      fileSize: a.file_size,
      version: a.version,
      isValid: a.is_valid === 1,
      validationError: a.validation_error,
      uploadBy: a.upload_by,
      pageCount: a.page_count,
      pageModified: a.page_modified,
      createdAt: a.created_at
    })),
    validation: {
      ...validationSummary,
      failedRecords: failedRecords.map(r => ({
        id: r.id,
        recordType: r.record_type,
        recordContent: r.record_content,
        errorType: r.error_type,
        errorMessage: r.error_message,
        errorDetails: r.error_details,
        sourceType: r.source_type,
        sourceReference: r.source_reference,
        isResolved: r.is_resolved === 1,
        resolvedBy: r.resolved_by,
        resolvedAt: r.resolved_at,
        resolutionRemark: r.resolution_remark,
        createdAt: r.created_at
      })),
      unhandledRecords: unhandledRecords.map(r => ({ id: r.id, errorMessage: r.error_message, recordType: r.record_type })),
      correctedRecords: correctedRecords.map(r => ({ id: r.id, errorMessage: r.error_message, resolvedBy: r.resolved_by })),
      needManualConfirmRecords: needManualConfirmRecords.map(r => ({ id: r.id, errorMessage: r.error_message, recordType: r.record_type }))
    },
    statusHistory: statusHistory.map(s => ({
      id: s.id,
      fromStatus: s.from_status,
      toStatus: s.to_status,
      action: s.action,
      operator: s.operator,
      reason: s.reason,
      remark: s.remark,
      createdAt: s.created_at
    })),
    freezeComparison: {
      before: batch.previous_status,
      after: batch.status,
      reason: batch.freeze_reason,
      manualRemark: batch.manual_remark
    }
  };
}

async function saveReportSummary(batchId, exportReference) {
  const reportData = await getBatchReportData(batchId);
  
  const stmt = await run(`
    INSERT INTO report_summaries 
    (batch_id, report_date, total_count, unhandled_count, corrected_count, need_manual_confirm_count, 
     frozen_before_status, frozen_after_status, manual_remark, export_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId,
    moment().format('YYYY-MM-DD'),
    reportData.validation.totalCount,
    reportData.validation.unhandledCount,
    reportData.validation.correctedCount,
    reportData.validation.needManualConfirmCount,
    reportData.freezeComparison.before,
    reportData.freezeComparison.after,
    reportData.freezeComparison.manualRemark,
    exportReference
  ]);
  
  return stmt;
}

async function exportBatchReport(batchId, format = 'csv') {
  ensureExportDir();
  const reportData = await getBatchReportData(batchId);
  const exportId = uuidv4();
  const fileName = `batch_report_${reportData.batch.batchNo}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
  const filePath = path.join(config.export.dir, fileName);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'section', title: '章节' },
      { id: 'category', title: '分类' },
      { id: 'recordId', title: '记录ID' },
      { id: 'item', title: '项目' },
      { id: 'value', title: '值' },
      { id: 'source', title: '来源证据' },
      { id: 'remark', title: '备注' }
    ]
  });

  const records = [];
  
  records.push({ section: '一、批次基本信息', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
  records.push({ section: '一、批次基本信息', category: '基础信息', recordId: reportData.batch.id, item: '批次号', value: reportData.batch.batchNo, source: 'batches.batch_no', remark: '' });
  records.push({ section: '一、批次基本信息', category: '基础信息', recordId: reportData.batch.id, item: '项目名称', value: reportData.batch.projectName, source: 'batches.project_name', remark: '' });
  records.push({ section: '一、批次基本信息', category: '基础信息', recordId: reportData.batch.id, item: '投标编号', value: reportData.batch.bidNo || '-', source: 'batches.bid_no', remark: '' });
  records.push({ section: '一、批次基本信息', category: '状态信息', recordId: reportData.batch.id, item: '当前状态', value: reportData.batch.status, source: 'batches.status', remark: '' });
  records.push({ section: '一、批次基本信息', category: '状态信息', recordId: reportData.batch.id, item: '是否冻结', value: reportData.batch.isFrozen ? '是' : '否', source: 'batches.is_frozen', remark: '' });
  records.push({ section: '一、批次基本信息', category: '状态信息', recordId: reportData.batch.id, item: '冻结原因', value: reportData.batch.freezeReason || '-', source: 'batches.freeze_reason', remark: '' });
  records.push({ section: '一、批次基本信息', category: '状态信息', recordId: reportData.batch.id, item: '人工备注', value: reportData.batch.manualRemark || '-', source: 'batches.manual_remark', remark: '' });
  records.push({ section: '一、批次基本信息', category: '操作信息', recordId: reportData.batch.id, item: '创建人', value: reportData.batch.operator, source: 'batches.operator', remark: '' });
  records.push({ section: '一、批次基本信息', category: '操作信息', recordId: reportData.batch.id, item: '创建时间', value: reportData.batch.createdAt, source: 'batches.created_at', remark: '' });

  records.push({ section: '二、异常统计汇总', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
  records.push({ section: '二、异常统计汇总', category: '汇总', recordId: '', item: '异常记录总数', value: reportData.validation.totalCount, source: 'failed_records COUNT', remark: '' });
  records.push({ section: '二、异常统计汇总', category: '汇总', recordId: '', item: '未处理记录', value: reportData.validation.unhandledCount, source: 'failed_records WHERE is_resolved=0', remark: '未解决的异常' });
  records.push({ section: '二、异常统计汇总', category: '汇总', recordId: '', item: '已修正记录', value: reportData.validation.correctedCount, source: 'failed_records WHERE is_resolved=1', remark: '已人工解决的异常' });
  records.push({ section: '二、异常统计汇总', category: '汇总', recordId: '', item: '需人工确认', value: reportData.validation.needManualConfirmCount, source: 'failed_records WHERE error_type IN (...)', remark: '数据不一致或重复记录' });

  if (reportData.validation.failedRecords.length > 0) {
    records.push({ section: '三、异常记录明细', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
    records.push({ section: '三、异常记录明细', category: '记录ID', recordId: '错误类型', item: '记录类型', value: '错误信息', source: '来源', remark: '状态' });
    
    for (const r of reportData.validation.failedRecords) {
      records.push({
        section: '三、异常记录明细',
        category: r.error_type,
        recordId: r.id,
        item: r.recordType,
        value: r.errorMessage,
        source: r.sourceReference || r.sourceType || 'system',
        remark: r.is_resolved ? `已修正(${r.resolvedBy})` : '未处理'
      });
    }
  }

  records.push({ section: '四、附件清单', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
  records.push({ section: '四、附件清单', category: '附件ID', recordId: '附件类型', item: '文件名', value: '版本', source: '上传人', remark: '状态' });
  
  for (const att of reportData.attachments) {
    records.push({
      section: '四、附件清单',
      category: att.id,
      recordId: att.attachmentType,
      item: att.fileName,
      value: `v${att.version}`,
      source: att.uploadBy,
      remark: att.isValid ? '有效' : `无效:${att.validationError || ''}`
    });
  }

  records.push({ section: '五、状态历史轨迹', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
  records.push({ section: '五、状态历史轨迹', category: '历史ID', recordId: '时间', item: '状态变更', value: '动作', source: '操作人', remark: '原因' });
  
  for (const h of reportData.statusHistory) {
    records.push({
      section: '五、状态历史轨迹',
      category: h.id,
      recordId: h.createdAt,
      item: `${h.fromStatus || '-'} → ${h.toStatus}`,
      value: h.action,
      source: h.operator,
      remark: h.reason || h.remark || ''
    });
  }

  records.push({ section: '六、冻结前后状态对比', category: '', recordId: '', item: '', value: '', source: '', remark: '' });
  records.push({ section: '六、冻结前后状态对比', category: '对比项', recordId: '', item: '冻结前状态', value: reportData.freezeComparison.before || '-', source: 'batches.previous_status', remark: '' });
  records.push({ section: '六、冻结前后状态对比', category: '对比项', recordId: '', item: '冻结后状态', value: reportData.freezeComparison.after, source: 'batches.status', remark: '' });
  records.push({ section: '六、冻结前后状态对比', category: '对比项', recordId: '', item: '冻结理由', value: reportData.freezeComparison.reason || '-', source: 'batches.freeze_reason', remark: '' });
  records.push({ section: '六、冻结前后状态对比', category: '对比项', recordId: '', item: '人工备注', value: reportData.freezeComparison.manualRemark || '-', source: 'batches.manual_remark', remark: '' });

  await csvWriter.writeRecords(records);
  
  await saveReportSummary(batchId, exportId);

  logger.info(`Report exported for batch ${batchId}: ${fileName}`);

  return {
    exportId,
    fileName,
    filePath,
    format,
    reportData: {
      batch: reportData.batch,
      validation: {
        totalCount: reportData.validation.totalCount,
        unhandledCount: reportData.validation.unhandledCount,
        correctedCount: reportData.validation.correctedCount,
        needManualConfirmCount: reportData.validation.needManualConfirmCount
      },
      freezeComparison: reportData.freezeComparison,
      recordCount: reportData.validation.failedRecords.length
    }
  };
}

async function getReportSummaries({ startDate, endDate, page = 1, pageSize = 20 }) {
  let whereClauses = [];
  let params = [];

  if (startDate) {
    whereClauses.push('report_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('report_date <= ?');
    params.push(endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await get(`SELECT COUNT(*) as total FROM report_summaries ${whereSql}`, params);
  const total = countResult.total;

  const offset = (page - 1) * pageSize;
  const list = await all(`
    SELECT rs.*, b.batch_no, b.project_name 
    FROM report_summaries rs
    LEFT JOIN batches b ON rs.batch_id = b.id
    ${whereSql}
    ORDER BY rs.report_date DESC, rs.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);

  return {
    list: list.map(item => ({
      id: item.id,
      batchId: item.batch_id,
      batchNo: item.batch_no,
      projectName: item.project_name,
      reportDate: item.report_date,
      totalCount: item.total_count,
      unhandledCount: item.unhandled_count,
      correctedCount: item.corrected_count,
      needManualConfirmCount: item.need_manual_confirm_count,
      frozenBeforeStatus: item.frozen_before_status,
      frozenAfterStatus: item.frozen_after_status,
      manualRemark: item.manual_remark,
      exportReference: item.export_reference,
      createdAt: item.created_at
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

module.exports = {
  getBatchReportData,
  exportBatchReport,
  getReportSummaries,
  saveReportSummary
};
