const { Parser } = require('json2csv');
const ReturnBatch = require('../models/ReturnBatch');
const ReturnApplication = require('../models/ReturnApplication');
const DataConsistencyService = require('./DataConsistencyService');

class ExportService {
  static async exportBatchesToCSV(filters = {}) {
    const summary = await DataConsistencyService.safeGetBatchSummary(filters);
    const batches = summary.valid_batches;

    const exportData = batches.map(batch => ({
      批次号: batch.batch_no,
      产品编码: batch.product_code,
      产品名称: batch.product_name,
      数量: batch.quantity,
      单价: batch.unit_price,
      金额: batch.amount,
      状态: batch.status,
      上一状态: batch.previous_status || '',
      冻结原因: batch.freeze_reason || '',
      人工理由: batch.manual_reason || '',
      质检状态: batch.quality_status || '',
      创建时间: this._formatTimestamp(batch.created_at),
      更新时间: this._formatTimestamp(batch.updated_at)
    }));

    const fields = [
      '批次号', '产品编码', '产品名称', '数量', '单价', '金额',
      '状态', '上一状态', '冻结原因', '人工理由', '质检状态',
      '创建时间', '更新时间'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(exportData);

    return {
      csv,
      record_count: exportData.length,
      invalid_count: summary.invalid_count,
      total_quantity: summary.total_quantity,
      total_amount: summary.total_amount,
      source_data_signature: require('../utils/common').generateSignature(batches)
    };
  }

  static async exportInternalViewToCSV(filters = {}) {
    const batches = await ReturnBatch.getInternalView(filters);
    
    const exportData = batches.map(batch => ({
      批次号: batch.batch_no,
      退供单号: batch.application_no,
      供应商: batch.supplier_name,
      产品编码: batch.product_code,
      产品名称: batch.product_name,
      数量: batch.quantity,
      金额: batch.amount,
      当前状态: batch.status,
      冻结前状态: batch.previous_status || '',
      冻结原因: batch.freeze_reason || '',
      人工理由: batch.manual_reason || '',
      异常保留: batch.exception_reserved ? '是' : '否',
      创建时间: this._formatTimestamp(batch.created_at),
      更新时间: this._formatTimestamp(batch.updated_at)
    }));

    const fields = [
      '批次号', '退供单号', '供应商', '产品编码', '产品名称',
      '数量', '金额', '当前状态', '冻结前状态', '冻结原因',
      '人工理由', '异常保留', '创建时间', '更新时间'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(exportData);

    const totals = {
      批次总数: batches.length,
      总数量: batches.reduce((sum, b) => sum + b.quantity, 0),
      总金额: batches.reduce((sum, b) => sum + b.amount, 0)
    };

    return {
      csv,
      record_count: exportData.length,
      totals,
      source_data_signature: require('../utils/common').generateSignature(batches)
    };
  }

  static async exportSummaryToCSV(filters = {}) {
    const batchSummary = await ReturnBatch.getSummary(filters);
    const appSummary = await ReturnApplication.getSummary(filters);

    const exportData = [
      { '统计类型': '批次统计' },
      ...batchSummary.map(s => ({
        '统计类型': '批次',
        '状态': s.status,
        '数量': s.count,
        '总数量': s.total_quantity,
        '总金额': s.total_amount
      })),
      { '统计类型': '' },
      { '统计类型': '申请统计' },
      ...appSummary.map(s => ({
        '统计类型': '申请',
        '状态': s.status,
        '数量': s.count,
        '总数量': s.total_quantity,
        '总金额': s.total_amount
      }))
    ];

    const fields = ['统计类型', '状态', '数量', '总数量', '总金额'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(exportData);

    return {
      csv,
      source_data_signature: require('../utils/common').generateSignature({ batchSummary, appSummary })
    };
  }

  static _formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}

module.exports = ExportService;
