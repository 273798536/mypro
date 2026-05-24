const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { QUEUE_STATUS } = require('../constants');

class ExportService {
  static ensureExportDir() {
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    return exportDir;
  }

  static async exportQueueToCsv(params = {}) {
    const { status, batchNo, potNo, storeCode, sourceType, startTime, endTime } = params;
    
    let query = db('compensation_queue').select();

    if (status) {
      query = query.where('status', status);
    }
    if (batchNo) {
      query = query.where('batch_no', batchNo);
    }
    if (potNo) {
      query = query.where('pot_no', potNo);
    }
    if (storeCode) {
      query = query.where('store_code', storeCode);
    }
    if (sourceType) {
      query = query.where('source_type', sourceType);
    }
    if (startTime) {
      query = query.where('created_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('created_at', '<=', endTime);
    }

    const items = await query.orderBy('created_at', 'desc');

    const exportDir = this.ensureExportDir();
    const filename = `compensation_queue_${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'source_type', title: '来源类型' },
        { id: 'source_id', title: '来源ID' },
        { id: 'batch_no', title: '批次号' },
        { id: 'pot_no', title: '锅次' },
        { id: 'store_code', title: '门店编码' },
        { id: 'store_name', title: '门店名称' },
        { id: 'product_name', title: '产品名称' },
        { id: 'action_type', title: '动作类型' },
        { id: 'priority', title: '优先级' },
        { id: 'status', title: '状态' },
        { id: 'retry_count', title: '重试次数' },
        { id: 'max_retry_count', title: '最大重试次数' },
        { id: 'last_error', title: '最后错误' },
        { id: 'error_code', title: '错误代码' },
        { id: 'result', title: '处理结果' },
        { id: 'handled_by', title: '处理人' },
        { id: 'handled_at', title: '处理时间' },
        { id: 'completed_at', title: '完成时间' },
        { id: 'created_at', title: '创建时间' },
        { id: 'updated_at', title: '更新时间' }
      ]
    });

    await csvWriter.writeRecords(items);

    return {
      filepath,
      filename,
      recordCount: items.length
    };
  }

  static async exportDeadLetterToCsv(startTime = null, endTime = null) {
    let query = db('compensation_queue')
      .where('status', QUEUE_STATUS.PERMANENT_FAILED);

    if (startTime) {
      query = query.where('updated_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('updated_at', '<=', endTime);
    }

    const items = await query.orderBy('updated_at', 'desc');

    const exportDir = this.ensureExportDir();
    const filename = `dead_letter_${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'source_type', title: '来源类型' },
        { id: 'source_id', title: '来源ID' },
        { id: 'batch_no', title: '批次号' },
        { id: 'pot_no', title: '锅次' },
        { id: 'store_code', title: '门店编码' },
        { id: 'store_name', title: '门店名称' },
        { id: 'product_name', title: '产品名称' },
        { id: 'action_type', title: '动作类型' },
        { id: 'priority', title: '优先级' },
        { id: 'retry_count', title: '重试次数' },
        { id: 'last_error', title: '错误信息' },
        { id: 'error_code', title: '错误代码' },
        { id: 'last_retry_time', title: '最后重试时间' },
        { id: 'updated_at', title: '更新时间' }
      ]
    });

    await csvWriter.writeRecords(items);

    return {
      filepath,
      filename,
      recordCount: items.length
    };
  }

  static async exportBatchInquiryToCsv(batchNo, potNo = null) {
    let sampleLabelsQuery = db('sample_labels').where('batch_no', batchNo);
    let temperatureQuery = db('temperature_records').where('batch_no', batchNo);
    let complaintsQuery = db('store_complaints').where('batch_no', batchNo);
    let refundsQuery = db('refund_records').where('batch_no', batchNo);

    if (potNo) {
      sampleLabelsQuery = sampleLabelsQuery.andWhere('pot_no', potNo);
      temperatureQuery = temperatureQuery.andWhere('pot_no', potNo);
      complaintsQuery = complaintsQuery.andWhere('pot_no', potNo);
      refundsQuery = refundsQuery.andWhere('pot_no', potNo);
    }

    const [sampleLabels, temperatureRecords, complaints, refunds] = await Promise.all([
      sampleLabelsQuery,
      temperatureQuery,
      complaintsQuery,
      refundsQuery
    ]);

    const exportDir = this.ensureExportDir();
    const timestamp = Date.now();

    await Promise.all([
      this.writeCsv(
        path.join(exportDir, `batch_${batchNo}_samples_${timestamp}.csv`),
        [
          { id: 'id', title: 'ID' },
          { id: 'batch_no', title: '批次号' },
          { id: 'pot_no', title: '锅次' },
          { id: 'product_name', title: '产品名称' },
          { id: 'store_code', title: '门店编码' },
          { id: 'store_name', title: '门店名称' },
          { id: 'produce_time', title: '生产时间' },
          { id: 'quantity', title: '数量' },
          { id: 'status', title: '状态' },
          { id: 'source_line_number', title: '原始行号' }
        ],
        sampleLabels
      ),
      this.writeCsv(
        path.join(exportDir, `batch_${batchNo}_temperature_${timestamp}.csv`),
        [
          { id: 'id', title: 'ID' },
          { id: 'batch_no', title: '批次号' },
          { id: 'pot_no', title: '锅次' },
          { id: 'record_type', title: '记录类型' },
          { id: 'temperature', title: '温度' },
          { id: 'measure_time', title: '测量时间' },
          { id: 'measure_point', title: '测量点' },
          { id: 'status', title: '状态' },
          { id: 'source_line_number', title: '原始行号' }
        ],
        temperatureRecords
      ),
      this.writeCsv(
        path.join(exportDir, `batch_${batchNo}_complaints_${timestamp}.csv`),
        [
          { id: 'id', title: 'ID' },
          { id: 'complaint_no', title: '投诉单号' },
          { id: 'batch_no', title: '批次号' },
          { id: 'pot_no', title: '锅次' },
          { id: 'store_code', title: '门店编码' },
          { id: 'store_name', title: '门店名称' },
          { id: 'product_name', title: '产品名称' },
          { id: 'complaint_type', title: '投诉类型' },
          { id: 'complaint_content', title: '投诉内容' },
          { id: 'complaint_time', title: '投诉时间' },
          { id: 'status', title: '状态' },
          { id: 'source_line_number', title: '原始行号' }
        ],
        complaints
      ),
      this.writeCsv(
        path.join(exportDir, `batch_${batchNo}_refunds_${timestamp}.csv`),
        [
          { id: 'id', title: 'ID' },
          { id: 'refund_no', title: '退款单号' },
          { id: 'batch_no', title: '批次号' },
          { id: 'pot_no', title: '锅次' },
          { id: 'store_code', title: '门店编码' },
          { id: 'store_name', title: '门店名称' },
          { id: 'product_name', title: '产品名称' },
          { id: 'refund_amount', title: '退款金额' },
          { id: 'refund_reason', title: '退款原因' },
          { id: 'refund_time', title: '退款时间' },
          { id: 'related_complaint_no', title: '关联投诉单号' },
          { id: 'source_line_number', title: '原始行号' }
        ],
        refunds
      )
    ]);

    return {
      exportDir,
      batchNo,
      potNo,
      files: {
        sampleLabels: `batch_${batchNo}_samples_${timestamp}.csv`,
        temperatureRecords: `batch_${batchNo}_temperature_${timestamp}.csv`,
        complaints: `batch_${batchNo}_complaints_${timestamp}.csv`,
        refunds: `batch_${batchNo}_refunds_${timestamp}.csv`
      },
      counts: {
        sampleLabels: sampleLabels.length,
        temperatureRecords: temperatureRecords.length,
        complaints: complaints.length,
        refunds: refunds.length
      }
    };
  }

  static async writeCsv(filepath, headers, records) {
    const csvWriter = createCsvWriter({ path: filepath, header: headers });
    await csvWriter.writeRecords(records);
    return filepath;
  }

  static async exportStatisticsToCsv() {
    const stats = await db('compensation_queue')
      .select('status')
      .count('id as count')
      .groupBy('status');

    const priorityStats = await db('compensation_queue')
      .select('priority')
      .count('id as count')
      .groupBy('priority');

    const exportDir = this.ensureExportDir();
    const filename = `statistics_${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);

    const records = [
      ...stats.map(s => ({ category: 'status', key: s.status, count: s.count })),
      ...priorityStats.map(s => ({ category: 'priority', key: s.priority, count: s.count }))
    ];

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'category', title: '分类' },
        { id: 'key', title: '键值' },
        { id: 'count', title: '数量' }
      ]
    });

    await csvWriter.writeRecords(records);

    return {
      filepath,
      filename,
      recordCount: records.length
    };
  }
}

module.exports = ExportService;
