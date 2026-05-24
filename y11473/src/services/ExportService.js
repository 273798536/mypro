const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const { ReturnApplication, QualityPhoto, LogisticsReceipt, PriceAdjustment, ExceptionRecord, ImportRecord } = require('../models');
const TraceService = require('./TraceService');
const logger = require('../config/logger');

class ExportService {
  static async exportToCSV(data, fields, filePath) {
    try {
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      fs.writeFileSync(filePath, csv, 'utf8');
      return filePath;
    } catch (error) {
      logger.error('导出CSV失败:', error);
      throw error;
    }
  }

  static async exportReturnApplications(filters = {}, exportDir) {
    const where = { is_duplicate: false };
    if (filters.batchNo) where.batch_no = filters.batchNo;
    if (filters.supplierCode) where.supplier_code = filters.supplierCode;
    if (filters.status) where.status = filters.status;

    const data = await ReturnApplication.findAll({
      where,
      include: ['importRecord'],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const fields = [
      'apply_no', 'batch_no', 'supplier_code', 'supplier_name',
      'sku_code', 'sku_name', 'apply_quantity', 'supplier_confirm_quantity',
      'remaining_quantity', 'apply_amount', 'status', 'process_reason',
      'importRecord.source_file', 'importRecord.raw_row_number', 'created_at'
    ];

    const filePath = path.join(exportDir, `return_applications_${Date.now()}.csv`);
    await this.exportToCSV(data.map(d => ({
      ...d,
      'importRecord.source_file': d.importRecord?.source_file,
      'importRecord.raw_row_number': d.importRecord?.raw_row_number
    })), fields, filePath);

    await TraceService.recordExport('退供申请', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportQualityPhotos(filters = {}, exportDir) {
    const where = { is_duplicate: false };
    if (filters.batchNo) where.batch_no = filters.batchNo;
    if (filters.supplierCode) where.supplier_code = filters.supplierCode;

    const data = await QualityPhoto.findAll({
      where,
      include: ['importRecord'],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const fields = [
      'photo_no', 'batch_no', 'supplier_code', 'sku_code',
      'photo_url', 'inspection_result', 'inspector', 'inspection_date',
      'importRecord.source_file', 'importRecord.raw_row_number'
    ];

    const filePath = path.join(exportDir, `quality_photos_${Date.now()}.csv`);
    await this.exportToCSV(data.map(d => ({
      ...d,
      'importRecord.source_file': d.importRecord?.source_file,
      'importRecord.raw_row_number': d.importRecord?.raw_row_number
    })), fields, filePath);

    await TraceService.recordExport('质检照片', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportLogisticsReceipts(filters = {}, exportDir) {
    const where = { is_duplicate: false };
    if (filters.batchNo) where.batch_no = filters.batchNo;
    if (filters.supplierCode) where.supplier_code = filters.supplierCode;

    const data = await LogisticsReceipt.findAll({
      where,
      include: ['importRecord'],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const fields = [
      'receipt_no', 'batch_no', 'supplier_code', 'waybill_no',
      'logistics_company', 'delivery_quantity', 'sign_quantity',
      'sign_status', 'signatory', 'importRecord.source_file', 'importRecord.raw_row_number'
    ];

    const filePath = path.join(exportDir, `logistics_receipts_${Date.now()}.csv`);
    await this.exportToCSV(data.map(d => ({
      ...d,
      'importRecord.source_file': d.importRecord?.source_file,
      'importRecord.raw_row_number': d.importRecord?.raw_row_number
    })), fields, filePath);

    await TraceService.recordExport('物流回单', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportPriceAdjustments(filters = {}, exportDir) {
    const where = { is_duplicate: false };
    if (filters.batchNo) where.batch_no = filters.batchNo;
    if (filters.supplierCode) where.supplier_code = filters.supplierCode;

    const data = await PriceAdjustment.findAll({
      where,
      include: ['importRecord'],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const fields = [
      'adjust_no', 'batch_no', 'supplier_code', 'sku_code',
      'original_price', 'adjusted_price', 'adjust_quantity', 'adjust_amount',
      'adjust_reason', 'operator', 'status', 'importRecord.source_file', 'importRecord.raw_row_number'
    ];

    const filePath = path.join(exportDir, `price_adjustments_${Date.now()}.csv`);
    await this.exportToCSV(data.map(d => ({
      ...d,
      'importRecord.source_file': d.importRecord?.source_file,
      'importRecord.raw_row_number': d.importRecord?.raw_row_number
    })), fields, filePath);

    await TraceService.recordExport('手工改价表', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportExceptions(filters = {}, exportDir) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.exceptionType) where.exception_type = filters.exceptionType;
    if (filters.batchNo) where.batch_no = filters.batchNo;

    const data = await ExceptionRecord.findAll({
      where,
      order: [['created_at', 'DESC']],
      raw: true
    });

    const fields = [
      'exception_type', 'exception_code', 'exception_message',
      'record_type', 'batch_no', 'supplier_code', 'status',
      'expected_value', 'actual_value', 'resolution', 'resolved_by', 'created_at'
    ];

    const filePath = path.join(exportDir, `exceptions_${Date.now()}.csv`);
    await this.exportToCSV(data, fields, filePath);

    await TraceService.recordExport('异常记录', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportImportRecords(filters = {}, exportDir) {
    const where = {};
    if (filters.sourceType) where.source_type = filters.sourceType;
    if (filters.batchNo) where.batch_no = filters.batchNo;

    const data = await ImportRecord.findAll({
      where,
      order: [['created_at', 'DESC']],
      raw: true
    });

    const fields = [
      'source_file', 'source_type', 'raw_row_number', 'batch_no',
      'supplier_code', 'parse_status', 'is_duplicate', 'created_at'
    ];

    const filePath = path.join(exportDir, `import_records_${Date.now()}.csv`);
    await this.exportToCSV(data, fields, filePath);

    await TraceService.recordExport('导入记录', data.length, filePath);
    return { filePath, count: data.length };
  }

  static async exportAll(filters = {}, exportDir) {
    fs.mkdirSync(exportDir, { recursive: true });
    const results = {};

    results.returnApplications = await this.exportReturnApplications(filters, exportDir);
    results.qualityPhotos = await this.exportQualityPhotos(filters, exportDir);
    results.logisticsReceipts = await this.exportLogisticsReceipts(filters, exportDir);
    results.priceAdjustments = await this.exportPriceAdjustments(filters, exportDir);
    results.exceptions = await this.exportExceptions(filters, exportDir);
    results.importRecords = await this.exportImportRecords(filters, exportDir);

    const zipPath = path.join(exportDir, `full_export_${Date.now()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    Object.values(results).forEach(r => {
      if (r && r.filePath) {
        archive.file(r.filePath, { name: path.basename(r.filePath) });
      }
    });
    await archive.finalize();

    return { zipPath, results };
  }

  static async exportReconciliationReport(batchNo, exportDir) {
    const ReconciliationService = require('./ReconciliationService');
    const report = await ReconciliationService.getReconciliationReport(batchNo);
    
    const filePath = path.join(exportDir, `reconciliation_report_${batchNo || 'all'}_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    
    await TraceService.recordExport('对账报告', 1, filePath);
    return { filePath, report };
  }
}

module.exports = ExportService;
