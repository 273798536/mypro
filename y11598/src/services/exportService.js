const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const config = require('../config');
const { getChangeOrders, getChangeOrderById, getChangeOrderByNo } = require('../models/changeOrder');
const { getAuditOpinionsByOrderNo } = require('../models/auditOpinion');
const { getAgentQuotesByKbId } = require('../models/agentQuote');
const { getSupplierStatements } = require('../models/supplierStatement');
const { getDirtyRecords } = require('../models/dirtyRecord');
const { getAuditTrails } = require('../models/auditTrail');
const { getApprovalEmailsByOrderNo } = require('../models/approvalEmail');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

function ensureExportDir() {
  if (!fs.existsSync(config.export.dir)) {
    fs.mkdirSync(config.export.dir, { recursive: true });
  }
}

function generateFileName(prefix, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
}

async function exportChangeOrdersToCsv(filters = {}) {
  ensureExportDir();
  const startTime = Date.now();

  try {
    const records = getChangeOrders(filters);
    const fileName = generateFileName('change_orders', 'csv');
    const filePath = path.join(config.export.dir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'order_no', title: '变更单号' },
        { id: 'title', title: '标题' },
        { id: 'kb_article_id', title: '知识库ID' },
        { id: 'kb_article_title', title: '知识库标题' },
        { id: 'status', title: '状态' },
        { id: 'submitter', title: '提交人' },
        { id: 'submit_time', title: '提交时间' },
        { id: 'approver', title: '审批人' },
        { id: 'approve_time', title: '审批时间' },
        { id: 'version', title: '版本' },
        { id: 'created_at', title: '创建时间' },
      ],
    });

    await csvWriter.writeRecords(records);

    const durationMs = Date.now() - startTime;
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'change_orders_csv',
      operator: 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `导变更单 ${records.length} 条`,
      source_file: fileName,
      record_count: records.length,
      duration_ms: durationMs,
    });

    return { filePath, fileName, count: records.length };
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'change_orders_csv',
      operator: 'system',
      status: ACTION_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }
}

async function exportSupplierStatementsToCsv(filters = {}) {
  ensureExportDir();
  const startTime = Date.now();

  try {
    const records = getSupplierStatements(filters);
    const fileName = generateFileName('supplier_statements', 'csv');
    const filePath = path.join(config.export.dir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'statement_no', title: '对账单号' },
        { id: 'supplier_id', title: '供应商ID' },
        { id: 'supplier_name', title: '供应商名称' },
        { id: 'kb_article_id', title: '知识库ID' },
        { id: 'kb_article_title', title: '知识库标题' },
        { id: 'quantity', title: '数量' },
        { id: 'amount', title: '金额' },
        { id: 'currency', title: '币种' },
        { id: 'statement_date', title: '对账日期' },
        { id: 'period_start', title: '周期开始' },
        { id: 'period_end', title: '周期结束' },
        { id: 'status', title: '状态' },
      ],
    });

    await csvWriter.writeRecords(records);

    const durationMs = Date.now() - startTime;
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'supplier_statements_csv',
      operator: 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `导供应商对账单 ${records.length} 条`,
      source_file: fileName,
      record_count: records.length,
      duration_ms: durationMs,
    });

    return { filePath, fileName, count: records.length };
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'supplier_statements_csv',
      operator: 'system',
      status: ACTION_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }
}

async function exportDirtyRecordsToCsv(filters = {}) {
  ensureExportDir();
  const startTime = Date.now();

  try {
    const records = getDirtyRecords(filters);
    const fileName = generateFileName('dirty_records', 'csv');
    const filePath = path.join(config.export.dir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'source_table', title: '来源表' },
        { id: 'source_id', title: '来源ID' },
        { id: 'dirty_type', title: '脏数据类型' },
        { id: 'field_name', title: '字段名' },
        { id: 'expected_value', title: '期望值' },
        { id: 'actual_value', title: '实际值' },
        { id: 'description', title: '描述' },
        { id: 'severity', title: '严重程度' },
        { id: 'status', title: '处理状态' },
        { id: 'handler', title: '处理人' },
        { id: 'handle_opinion', title: '处理意见' },
        { id: 'handle_time', title: '处理时间' },
        { id: 'created_at', title: '创建时间' },
      ],
    });

    await csvWriter.writeRecords(records);

    const durationMs = Date.now() - startTime;
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'dirty_records_csv',
      operator: 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `导脏记录 ${records.length} 条`,
      source_file: fileName,
      record_count: records.length,
      duration_ms: durationMs,
    });

    return { filePath, fileName, count: records.length };
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'dirty_records_csv',
      operator: 'system',
      status: ACTION_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }
}

function exportAuditTrailToJson(filters = {}) {
  ensureExportDir();
  const startTime = Date.now();

  try {
    const records = getAuditTrails(filters);
    const fileName = generateFileName('audit_trails', 'json');
    const filePath = path.join(config.export.dir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');

    const durationMs = Date.now() - startTime;
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'audit_trails_json',
      operator: 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `导审计轨迹 ${records.length} 条`,
      source_file: fileName,
      record_count: records.length,
      duration_ms: durationMs,
    });

    return { filePath, fileName, count: records.length };
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.EXPORT,
      action_subtype: 'audit_trails_json',
      operator: 'system',
      status: ACTION_STATUSES.FAILED,
      error_message: error.message,
    });
    throw error;
  }
}

function getFullOrderDetail(orderNo) {
  const order = getChangeOrderByNo(orderNo);
  if (!order) return null;

  const opinions = getAuditOpinionsByOrderNo(orderNo);
  const quotes = order.kb_article_id ? getAgentQuotesByKbId(order.kb_article_id) : [];
  const approvalEmails = getApprovalEmailsByOrderNo(orderNo);

  return {
    change_order: order,
    audit_opinions: opinions,
    approval_emails: approvalEmails,
    agent_quotes: quotes,
    quote_count: quotes.length,
  };
}

module.exports = {
  exportChangeOrdersToCsv,
  exportSupplierStatementsToCsv,
  exportDirtyRecordsToCsv,
  exportAuditTrailToJson,
  getFullOrderDetail,
};
