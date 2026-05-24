const { getDb, runInTransaction } = require('../database');
const { getLatestAttachmentsByBatchId } = require('./attachmentService');
const { getValidationSummary } = require('./validationService');
const { getStatusHistory } = require('./stateService');
const logger = require('../utils/logger');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');

function getBatchReportData(batchId) {
  const db = getDb();
  
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const attachments = getLatestAttachmentsByBatchId(batchId);
  const validationSummary = getValidationSummary(batchId);
  const statusHistory = getStatusHistory(batchId);

  const needManualConfirmCount = calculateManualConfirmCount(batchId);

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
      totalCount: validationSummary.total_count || 0,
      unhandledCount: validationSummary.unhandled_count || 0,
      correctedCount: validationSummary.corrected_count || 0,
      needManualConfirmCount,
      byErrorType: validationSummary.byErrorType || []
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

function calculateManualConfirmCount(batchId) {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM failed_records 
    WHERE batch_id = ? 
      AND is_resolved = 0
      AND error_type IN ('DATA_INCONSISTENCY', 'DUPLICATE_RECORD')
  `).get(batchId);
  
  return result.count || 0;
}

function saveReportSummary(batchId, exportReference) {
  const db = getDb();
  const reportData = getBatchReportData(batchId);
  
  const stmt = db.prepare(`
    INSERT INTO report_summaries 
    (batch_id, report_date, total_count, unhandled_count, corrected_count, need_manual_confirm_count, 
     frozen_before_status, frozen_after_status, manual_remark, export_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const reportDate = moment().format('YYYY-MM-DD');
  
  return stmt.run(
    batchId,
    reportDate,
    reportData.validation.totalCount,
    reportData.validation.unhandledCount,
    reportData.validation.correctedCount,
    reportData.validation.needManualConfirmCount,
    reportData.freezeComparison.before,
    reportData.freezeComparison.after,
    reportData.freezeComparison.manualRemark,
    exportReference
  );
}

async function exportBatchReport(batchId, format = 'csv') {
  const reportData = getBatchReportData(batchId);
  const exportId = uuidv4();
  const fileName = `batch_report_${reportData.batch.batchNo}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
  const filePath = path.join(config.export.dir, fileName);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'category', title: '分类' },
      { id: 'item', title: '项目' },
      { id: 'value', title: '值' },
      { id: 'remark', title: '备注' }
    ]
  });

  const records = [];
  
  records.push({ category: '批次基本信息', item: '批次号', value: reportData.batch.batchNo, remark: '' });
  records.push({ category: '批次基本信息', item: '项目名称', value: reportData.batch.projectName, remark: '' });
  records.push({ category: '批次基本信息', item: '投标编号', value: reportData.batch.bidNo || '-', remark: '' });
  records.push({ category: '批次基本信息', item: '当前状态', value: reportData.batch.status, remark: '' });
  records.push({ category: '批次基本信息', item: '是否冻结', value: reportData.batch.isFrozen ? '是' : '否', remark: '' });
  records.push({ category: '批次基本信息', item: '冻结原因', value: reportData.batch.freezeReason || '-', remark: '' });
  records.push({ category: '批次基本信息', item: '人工备注', value: reportData.batch.manualRemark || '-', remark: '' });
  records.push({ category: '批次基本信息', item: '创建人', value: reportData.batch.operator, remark: '' });
  records.push({ category: '批次基本信息', item: '创建时间', value: reportData.batch.createdAt, remark: '' });

  records.push({ category: '', item: '', value: '', remark: '' });
  records.push({ category: '异常统计', item: '异常记录总数', value: reportData.validation.totalCount, remark: '' });
  records.push({ category: '异常统计', item: '未处理记录', value: reportData.validation.unhandledCount, remark: '' });
  records.push({ category: '异常统计', item: '已修正记录', value: reportData.validation.correctedCount, remark: '' });
  records.push({ category: '异常统计', item: '需人工确认', value: reportData.validation.needManualConfirmCount, remark: '' });

  records.push({ category: '', item: '', value: '', remark: '' });
  records.push({ category: '附件清单', item: '附件类型', value: '文件名', remark: '版本/状态' });
  
  reportData.attachments.forEach(att => {
    records.push({
      category: '附件清单',
      item: att.attachmentType,
      value: att.fileName,
      remark: `v${att.version} / ${att.isValid ? '有效' : '无效'}`
    });
  });

  records.push({ category: '', item: '', value: '', remark: '' });
  records.push({ category: '状态历史', item: '时间', value: '状态变更', remark: '操作人/原因' });
  
  reportData.statusHistory.forEach(h => {
    records.push({
      category: '状态历史',
      item: h.createdAt,
      value: `${h.fromStatus || '-'} → ${h.toStatus}`,
      remark: `${h.operator} / ${h.reason || h.action}`
    });
  });

  await csvWriter.writeRecords(records);
  
  saveReportSummary(batchId, exportId);

  logger.info(`Report exported for batch ${batchId}: ${fileName}`);

  return {
    exportId,
    fileName,
    filePath,
    format,
    reportData: {
      batch: reportData.batch,
      validation: reportData.validation,
      freezeComparison: reportData.freezeComparison
    }
  };
}

function getReportSummaries({ startDate, endDate, page = 1, pageSize = 20 }) {
  const db = getDb();
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

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM report_summaries ${whereSql}`);
  const { total } = countStmt.get(...params);

  const offset = (page - 1) * pageSize;
  const listStmt = db.prepare(`
    SELECT rs.*, b.batch_no, b.project_name 
    FROM report_summaries rs
    LEFT JOIN batches b ON rs.batch_id = b.id
    ${whereSql}
    ORDER BY rs.report_date DESC, rs.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, pageSize, offset);

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
