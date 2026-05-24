const { db, generateNo } = require('../models/db');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const auditTrailService = require('./auditTrailService');

class ExportService {
  async exportInvoices(options = {}) {
    const { startDate, endDate, expenseCategory, isDuplicate } = options;
    
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (startDate) { sql += ' AND invoice_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND invoice_date <= ?'; params.push(endDate); }
    if (expenseCategory) { sql += ' AND expense_category = ?'; params.push(expenseCategory); }
    if (isDuplicate !== undefined) { sql += ' AND is_duplicate = ?'; params.push(isDuplicate ? 1 : 0); }

    sql += ' ORDER BY invoice_date DESC';
    const invoices = await db.all(sql, params);

    const exportNo = generateNo('EXP');
    const filename = `invoices_${exportNo}.csv`;
    const filepath = path.join(__dirname, '../../exports', filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'invoice_no', title: '发票编号' },
        { id: 'invoice_date', title: '发票日期' },
        { id: 'expense_category', title: '费用类别' },
        { id: 'seller_name', title: '销售方' },
        { id: 'total_amount', title: '金额' },
        { id: 'applicant_name', title: '申请人' },
        { id: 'travel_application_no', title: '关联差旅申请' },
        { id: 'is_duplicate', title: '是否重复' },
        { id: 'duplicate_group_id', title: '重复组ID' },
        { id: 'hotel_name', title: '酒店名称' },
        { id: 'check_in_date', title: '入住日期' },
        { id: 'check_out_date', title: '退房日期' },
        { id: 'flight_no', title: '航班号' },
        { id: 'departure', title: '出发地' },
        { id: 'arrival', title: '目的地' }
      ]
    });

    await csvWriter.writeRecords(invoices);

    await auditTrailService.logOperation({
      operationType: 'EXPORT',
      operationModule: 'EXPORT',
      operationDesc: `导出发票数据: ${filename}`,
      sourceNo: exportNo,
      afterData: { record_count: invoices.length, filename }
    });

    return {
      export_no: exportNo,
      filename,
      filepath,
      record_count: invoices.length
    };
  }

  async exportDirtyRecords(options = {}) {
    const { dirtyType, isCorrected, sourceTable } = options;
    
    let sql = 'SELECT * FROM dirty_records WHERE 1=1';
    const params = [];

    if (dirtyType) { sql += ' AND dirty_type = ?'; params.push(dirtyType); }
    if (isCorrected !== undefined) { sql += ' AND is_corrected = ?'; params.push(isCorrected ? 1 : 0); }
    if (sourceTable) { sql += ' AND source_table = ?'; params.push(sourceTable); }

    sql += ' ORDER BY created_at DESC';
    const records = await db.all(sql, params);

    const exportNo = generateNo('EXP');
    const filename = `dirty_records_${exportNo}.csv`;
    const filepath = path.join(__dirname, '../../exports', filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: '记录ID' },
        { id: 'source_table', title: '来源表' },
        { id: 'source_no', title: '来源编号' },
        { id: 'dirty_type', title: '脏记录类型' },
        { id: 'dirty_description', title: '问题描述' },
        { id: 'field_name', title: '字段名' },
        { id: 'expected_value', title: '期望值' },
        { id: 'actual_value', title: '实际值' },
        { id: 'correction_suggestion', title: '修正建议' },
        { id: 'is_corrected', title: '是否已修正' },
        { id: 'correction_note', title: '修正备注' },
        { id: 'corrected_by', title: '修正人' },
        { id: 'created_at', title: '创建时间' }
      ]
    });

    await csvWriter.writeRecords(records);

    await auditTrailService.logOperation({
      operationType: 'EXPORT',
      operationModule: 'EXPORT',
      operationDesc: `导出脏记录数据: ${filename}`,
      sourceNo: exportNo,
      afterData: { record_count: records.length, filename }
    });

    return {
      export_no: exportNo,
      filename,
      filepath,
      record_count: records.length
    };
  }

  async exportDuplicateGroups(options = {}) {
    const groups = await db.all('SELECT * FROM duplicate_groups ORDER BY created_at DESC');
    
    for (const group of groups) {
      group.invoices = await db.all(
        'SELECT invoice_no, applicant_name, total_amount, expense_category FROM invoices WHERE duplicate_group_id = ?',
        [group.group_id]
      );
      group.invoice_list = group.invoices.map(i => i.invoice_no).join('; ');
      group.applicant_list = group.involved_applicants;
    }

    const exportNo = generateNo('EXP');
    const filename = `duplicate_groups_${exportNo}.csv`;
    const filepath = path.join(__dirname, '../../exports', filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'group_id', title: '重复组ID' },
        { id: 'group_type', title: '类型' },
        { id: 'group_desc', title: '描述' },
        { id: 'invoice_count', title: '发票数量' },
        { id: 'total_amount', title: '涉及金额' },
        { id: 'involved_applicants', title: '涉及人员' },
        { id: 'invoice_list', title: '发票列表' },
        { id: 'is_resolved', title: '是否已解决' },
        { id: 'resolution_note', title: '解决说明' },
        { id: 'created_at', title: '创建时间' }
      ]
    });

    await csvWriter.writeRecords(groups);

    await auditTrailService.logOperation({
      operationType: 'EXPORT',
      operationModule: 'EXPORT',
      operationDesc: `导出重复报销组: ${filename}`,
      sourceNo: exportNo,
      afterData: { record_count: groups.length, filename }
    });

    return {
      export_no: exportNo,
      filename,
      filepath,
      record_count: groups.length
    };
  }

  async exportAuditReport(auditNo) {
    const audit = await db.findByNo('audit_results', 'audit_no', auditNo);
    if (!audit) {
      throw new Error('稽核记录不存在');
    }

    const summary = audit.result_summary ? JSON.parse(audit.result_summary) : {};

    const exportNo = generateNo('EXP');
    const filename = `audit_report_${auditNo}.csv`;
    const filepath = path.join(__dirname, '../../exports', filename);

    const reportData = [
      { section: '稽核概览', item: '稽核编号', value: audit.audit_no },
      { section: '稽核概览', item: '稽核日期', value: audit.audit_date },
      { section: '稽核概览', item: '稽核类型', value: audit.audit_type },
      { section: '稽核概览', item: '创建人', value: audit.created_by },
      { section: '', item: '', value: '' },
      { section: '数据统计', item: '发票总数', value: audit.total_invoices },
      { section: '数据统计', item: '付款流水总数', value: audit.total_payments },
      { section: '数据统计', item: '退款流水总数', value: audit.total_refunds },
      { section: '数据统计', item: '发票总金额', value: audit.total_amount },
      { section: '', item: '', value: '' },
      { section: '异常统计', item: '重复报销组数量', value: audit.duplicate_invoice_count },
      { section: '异常统计', item: '重复报销涉及金额', value: audit.duplicate_amount },
      { section: '异常统计', item: '脏记录数量', value: audit.dirty_record_count },
      { section: '异常统计', item: '对账差异金额', value: audit.reconciliation_diff_amount }
    ];

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'section', title: '章节' },
        { id: 'item', title: '项目' },
        { id: 'value', title: '值' }
      ]
    });

    await csvWriter.writeRecords(reportData);

    await auditTrailService.logOperation({
      operationType: 'EXPORT',
      operationModule: 'EXPORT',
      operationDesc: `导出稽核报告: ${filename}`,
      sourceNo: auditNo,
      afterData: { filename }
    });

    return {
      export_no: exportNo,
      filename,
      filepath,
      audit_no: auditNo
    };
  }

  listExports() {
    const exportDir = path.join(__dirname, '../../exports');
    const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.csv'));
    return files.map(f => ({
      filename: f,
      created_at: fs.statSync(path.join(exportDir, f)).mtime
    })).sort((a, b) => b.created_at - a.created_at);
  }

  getExportFilePath(filename) {
    return path.join(__dirname, '../../exports', filename);
  }
}

module.exports = new ExportService();
