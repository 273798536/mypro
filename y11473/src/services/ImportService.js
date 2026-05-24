const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const unzipper = require('unzipper');
const { sequelize, ImportRecord, ReturnApplication, QualityPhoto, LogisticsReceipt, PriceAdjustment } = require('../models');
const DuplicateService = require('./DuplicateService');
const AsyncTaskService = require('./AsyncTaskService');
const logger = require('../config/logger');

class ImportService {
  static calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  static async parseExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheets = {};
    for (const sheetName of workbook.SheetNames) {
      sheets[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }
    return sheets;
  }

  static async extractZip(zipPath, extractDir) {
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .promise();
    const files = [];
    function walk(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) walk(fullPath);
        else files.push(fullPath);
      }
    }
    walk(extractDir);
    return files;
  }

  static async createImportRecord(filePath, sourceType, rawRowNumber, rawData, parsedData, batchNo, supplierCode) {
    const fileHash = this.calculateFileHash(filePath);
    return await ImportRecord.create({
      source_file: path.basename(filePath),
      source_file_hash: fileHash,
      source_type: sourceType,
      raw_row_number: rawRowNumber,
      raw_data: JSON.stringify(rawData),
      parsed_data: JSON.stringify(parsedData),
      parse_status: 'success',
      batch_no: batchNo,
      supplier_code: supplierCode
    });
  }

  static async importReturnApply(filePath, data, rowNumber) {
    const parsedData = {
      apply_no: data.申请单号 || data.apply_no,
      batch_no: data.批次号 || data.batch_no,
      supplier_code: data.供应商编码 || data.supplier_code,
      supplier_name: data.供应商名称 || data.supplier_name,
      sku_code: data.商品编码 || data.sku_code,
      sku_name: data.商品名称 || data.sku_name,
      apply_quantity: parseInt(data.申请数量 || data.apply_quantity || 0),
      apply_amount: parseFloat(data.申请金额 || data.apply_amount || 0),
      apply_date: data.申请日期 || data.apply_date ? new Date(data.申请日期 || data.apply_date) : null,
      supplier_confirm_quantity: parseInt(data.供应商确认数量 || data.supplier_confirm_quantity || 0),
      process_reason: data.处理原因 || data.process_reason
    };

    const importRecord = await this.createImportRecord(
      filePath, 'return_apply', rowNumber, data, parsedData,
      parsedData.batch_no, parsedData.supplier_code
    );

    const { isDuplicate, duplicateId, hash } = await DuplicateService.checkReturnApplyDuplicate(parsedData);

    const returnApply = await ReturnApplication.create({
      ...parsedData,
      import_record_id: importRecord.id,
      data_hash: hash,
      is_duplicate: isDuplicate,
      duplicate_of_id: duplicateId,
      remaining_quantity: parsedData.apply_quantity - (parsedData.supplier_confirm_quantity || 0),
      status: parsedData.supplier_confirm_quantity === 0 ? 'pending' 
        : parsedData.supplier_confirm_quantity >= parsedData.apply_quantity ? 'fully_confirmed' 
        : 'part_confirmed'
    });

    return { returnApply, importRecord, isDuplicate, duplicateId };
  }

  static async importQualityPhoto(filePath, data, rowNumber) {
    const parsedData = {
      photo_no: data.照片编号 || data.photo_no,
      batch_no: data.批次号 || data.batch_no,
      supplier_code: data.供应商编码 || data.supplier_code,
      sku_code: data.商品编码 || data.sku_code,
      photo_url: data.照片URL || data.photo_url,
      photo_file_path: data.文件路径 || data.photo_file_path,
      photo_hash: data.照片哈希 || data.photo_hash || crypto.randomUUID(),
      inspection_result: data.质检结果 || data.inspection_result || 'pending',
      inspector: data.质检员 || data.inspector,
      inspection_date: data.质检日期 || data.inspection_date ? new Date(data.质检日期 || data.inspection_date) : null,
      remark: data.备注 || data.remark
    };

    const importRecord = await this.createImportRecord(
      filePath, 'quality_photo', rowNumber, data, parsedData,
      parsedData.batch_no, parsedData.supplier_code
    );

    const { isDuplicate, duplicateId, hash } = await DuplicateService.checkQualityPhotoDuplicate(parsedData);

    const photo = await QualityPhoto.create({
      ...parsedData,
      import_record_id: importRecord.id,
      data_hash: hash,
      is_duplicate: isDuplicate,
      duplicate_of_id: duplicateId
    });

    return { photo, importRecord, isDuplicate, duplicateId };
  }

  static async importLogisticsReceipt(filePath, data, rowNumber) {
    const parsedData = {
      receipt_no: data.回单号 || data.receipt_no,
      batch_no: data.批次号 || data.batch_no,
      supplier_code: data.供应商编码 || data.supplier_code,
      waybill_no: data.运单号 || data.waybill_no,
      logistics_company: data.物流公司 || data.logistics_company,
      delivery_quantity: parseInt(data.发货数量 || data.delivery_quantity || 0),
      sign_quantity: parseInt(data.签收数量 || data.sign_quantity || 0),
      delivery_date: data.发货日期 || data.delivery_date ? new Date(data.发货日期 || data.delivery_date) : null,
      sign_date: data.签收日期 || data.sign_date ? new Date(data.签收日期 || data.sign_date) : null,
      sign_status: data.签收状态 || data.sign_status || 'pending',
      signatory: data.签收人 || data.signatory,
      receipt_image_url: data.回单图片 || data.receipt_image_url,
      remark: data.备注 || data.remark
    };

    const importRecord = await this.createImportRecord(
      filePath, 'logistics_receipt', rowNumber, data, parsedData,
      parsedData.batch_no, parsedData.supplier_code
    );

    const { isDuplicate, duplicateId, hash } = await DuplicateService.checkLogisticsReceiptDuplicate(parsedData);

    const receipt = await LogisticsReceipt.create({
      ...parsedData,
      import_record_id: importRecord.id,
      data_hash: hash,
      is_duplicate: isDuplicate,
      duplicate_of_id: duplicateId
    });

    return { receipt, importRecord, isDuplicate, duplicateId };
  }

  static async importPriceAdjustment(filePath, data, rowNumber) {
    const parsedData = {
      adjust_no: data.改价单号 || data.adjust_no,
      batch_no: data.批次号 || data.batch_no,
      supplier_code: data.供应商编码 || data.supplier_code,
      sku_code: data.商品编码 || data.sku_code,
      original_price: parseFloat(data.原价 || data.original_price || 0),
      adjusted_price: parseFloat(data.调整后价格 || data.adjusted_price || 0),
      adjust_quantity: parseInt(data.调整数量 || data.adjust_quantity || 0),
      adjust_amount: parseFloat(data.调整金额 || data.adjust_amount || 0),
      adjust_date: data.改价日期 || data.adjust_date ? new Date(data.改价日期 || data.adjust_date) : null,
      adjust_reason: data.改价原因 || data.adjust_reason,
      operator: data.操作人 || data.operator,
      status: data.状态 || data.status || 'pending'
    };

    const importRecord = await this.createImportRecord(
      filePath, 'price_adjustment', rowNumber, data, parsedData,
      parsedData.batch_no, parsedData.supplier_code
    );

    const { isDuplicate, duplicateId, hash } = await DuplicateService.checkPriceAdjustmentDuplicate(parsedData);

    const adjustment = await PriceAdjustment.create({
      ...parsedData,
      import_record_id: importRecord.id,
      data_hash: hash,
      is_duplicate: isDuplicate,
      duplicate_of_id: duplicateId
    });

    return { adjustment, importRecord, isDuplicate, duplicateId };
  }

  static async importFile(filePath, sourceType, options = {}) {
    const ext = path.extname(filePath).toLowerCase();
    let results = { total: 0, success: 0, duplicates: 0, failed: 0, details: [] };

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        const sheets = await this.parseExcel(filePath);
        for (const [sheetName, rows] of Object.entries(sheets)) {
          for (let i = 0; i < rows.length; i++) {
            results.total++;
            try {
              let result;
              switch (sourceType) {
                case 'return_apply':
                  result = await this.importReturnApply(filePath, rows[i], i + 1);
                  break;
                case 'quality_photo':
                  result = await this.importQualityPhoto(filePath, rows[i], i + 1);
                  break;
                case 'logistics_receipt':
                  result = await this.importLogisticsReceipt(filePath, rows[i], i + 1);
                  break;
                case 'price_adjustment':
                  result = await this.importPriceAdjustment(filePath, rows[i], i + 1);
                  break;
              }
              if (result) {
                results.success++;
                if (result.isDuplicate) results.duplicates++;
                results.details.push({ row: i + 1, success: true, isDuplicate: result.isDuplicate });
              }
            } catch (e) {
              results.failed++;
              results.details.push({ row: i + 1, success: false, error: e.message });
              logger.error(`导入第${i + 1}行失败:`, e);
            }
          }
        }
      } else if (ext === '.zip') {
        const extractDir = path.join(path.dirname(filePath), 'extracted_' + Date.now());
        fs.mkdirSync(extractDir, { recursive: true });
        const files = await this.extractZip(filePath, extractDir);
        results = await this.importHistoryArchive(files, extractDir);
      }

      logger.info(`文件导入完成: ${path.basename(filePath)}, ${JSON.stringify(results)}`);
      return results;
    } catch (error) {
      logger.error('文件导入失败:', error);
      throw error;
    }
  }

  static async importHistoryArchive(files, extractDir) {
    const results = { total: 0, success: 0, duplicates: 0, failed: 0, files: [] };
    const typeMap = {
      '退供申请': 'return_apply', 'return': 'return_apply',
      '质检': 'quality_photo', 'quality': 'quality_photo',
      '物流': 'logistics_receipt', 'logistics': 'logistics_receipt',
      '改价': 'price_adjustment', 'price': 'price_adjustment'
    };

    for (const file of files) {
      const fileName = path.basename(file).toLowerCase();
      let sourceType = null;
      for (const [key, value] of Object.entries(typeMap)) {
        if (fileName.includes(key)) {
          sourceType = value;
          break;
        }
      }
      if (sourceType && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls'))) {
        const fileResult = await this.importFile(file, sourceType);
        results.total += fileResult.total;
        results.success += fileResult.success;
        results.duplicates += fileResult.duplicates;
        results.failed += fileResult.failed;
        results.files.push({ file: fileName, result: fileResult });
      }
    }
    return results;
  }

  static async processImportTask(taskId) {
    const task = await AsyncTaskService.startTask(taskId);
    try {
      const inputParams = JSON.parse(task.input_params);
      const results = await this.importFile(
        inputParams.filePath,
        inputParams.sourceType,
        inputParams.options || {}
      );
      await AsyncTaskService.completeTask(taskId, results);
      return results;
    } catch (error) {
      await AsyncTaskService.failTask(taskId, error, { retryable: false });
      throw error;
    }
  }
}

module.exports = ImportService;
