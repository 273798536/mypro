const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');
const AuditService = require('./auditService');
const { SOURCE_TYPES, IMPORT_STATUS } = require('../constants');

class ImportService {
  static async createImportSource(sourceType, sourceFile, sourceName, importedBy = null) {
    const importSource = {
      id: uuidv4(),
      source_type: sourceType,
      source_file: sourceFile,
      source_name: sourceName,
      total_rows: 0,
      success_rows: 0,
      failed_rows: 0,
      status: IMPORT_STATUS.PROCESSING,
      imported_by: importedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db('import_sources').insert(importSource);
    return importSource;
  }

  static async updateImportSource(id, updates) {
    await db('import_sources')
      .where({ id })
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      });
  }

  static async importSampleLabels(filePath, sourceName, importedBy = null) {
    const importSource = await this.createImportSource(
      SOURCE_TYPES.SAMPLE_LABEL,
      filePath,
      sourceName,
      importedBy
    );

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let lineNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          lineNumber++;
          try {
            const rawData = JSON.stringify(row);
            const item = {
              id: uuidv4(),
              import_source_id: importSource.id,
              source_line_number: lineNumber,
              source_raw_data: rawData,
              batch_no: row.batch_no || row['批次号'],
              product_name: row.product_name || row['产品名称'],
              product_code: row.product_code || row['产品编码'],
              pot_no: row.pot_no || row['锅次'],
              produce_time: row.produce_time || row['生产时间'],
              produce_line: row.produce_line || row['生产线'],
              sampler: row.sampler || row['采样人'],
              sample_time: row.sample_time || row['采样时间'],
              sample_location: row.sample_location || row['采样位置'],
              store_code: row.store_code || row['门店编码'],
              store_name: row.store_name || row['门店名称'],
              quantity: parseFloat(row.quantity || row['数量'] || 0),
              unit: row.unit || row['单位'],
              storage_location: row.storage_location || row['存放位置'],
              retention_period: row.retention_period || row['保留期限'],
              status: 'active',
              created_by: importedBy,
              updated_by: importedBy
            };

            await db('sample_labels').insert(item);
            successCount++;
            results.push({ lineNumber, success: true, data: item });
          } catch (error) {
            failedCount++;
            results.push({ lineNumber, success: false, error: error.message });
          }
        })
        .on('end', async () => {
          await this.updateImportSource(importSource.id, {
            total_rows: lineNumber,
            success_rows: successCount,
            failed_rows: failedCount,
            status: failedCount === 0 ? IMPORT_STATUS.COMPLETED : 
                    successCount > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED
          });

          await AuditService.logCreate(
            'import_sources',
            importSource.id,
            { ...importSource, total_rows: lineNumber, success_rows: successCount, failed_rows: failedCount },
            importedBy,
            importedBy ? 'user' : 'system',
            `导入留样标签数据: ${sourceName}`
          );

          resolve({
            importSource: await db('import_sources').where({ id: importSource.id }).first(),
            results,
            successCount,
            failedCount,
            totalCount: lineNumber
          });
        })
        .on('error', async (error) => {
          await this.updateImportSource(importSource.id, {
            status: IMPORT_STATUS.FAILED
          });
          reject(error);
        });
    });
  }

  static async importTemperatureRecords(filePath, sourceName, importedBy = null) {
    const importSource = await this.createImportSource(
      SOURCE_TYPES.TEMPERATURE_RECORD,
      filePath,
      sourceName,
      importedBy
    );

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let lineNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          lineNumber++;
          try {
            const rawData = JSON.stringify(row);
            const item = {
              id: uuidv4(),
              import_source_id: importSource.id,
              source_line_number: lineNumber,
              source_raw_data: rawData,
              batch_no: row.batch_no || row['批次号'],
              pot_no: row.pot_no || row['锅次'],
              record_type: row.record_type || row['记录类型'],
              temperature: parseFloat(row.temperature || row['温度'] || 0),
              temperature_unit: row.temperature_unit || row['温度单位'] || 'C',
              measure_time: row.measure_time || row['测量时间'],
              measure_point: row.measure_point || row['测量点'],
              measurer: row.measurer || row['测量人'],
              equipment_code: row.equipment_code || row['设备编码'],
              status: 'normal',
              remark: row.remark || row['备注'],
              created_by: importedBy,
              updated_by: importedBy
            };

            await db('temperature_records').insert(item);
            successCount++;
            results.push({ lineNumber, success: true, data: item });
          } catch (error) {
            failedCount++;
            results.push({ lineNumber, success: false, error: error.message });
          }
        })
        .on('end', async () => {
          await this.updateImportSource(importSource.id, {
            total_rows: lineNumber,
            success_rows: successCount,
            failed_rows: failedCount,
            status: failedCount === 0 ? IMPORT_STATUS.COMPLETED : 
                    successCount > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED
          });

          resolve({
            importSource: await db('import_sources').where({ id: importSource.id }).first(),
            results,
            successCount,
            failedCount,
            totalCount: lineNumber
          });
        })
        .on('error', async (error) => {
          await this.updateImportSource(importSource.id, {
            status: IMPORT_STATUS.FAILED
          });
          reject(error);
        });
    });
  }

  static async importStoreComplaints(filePath, sourceName, importedBy = null) {
    const importSource = await this.createImportSource(
      SOURCE_TYPES.STORE_COMPLAINT,
      filePath,
      sourceName,
      importedBy
    );

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let lineNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          lineNumber++;
          try {
            const rawData = JSON.stringify(row);
            const item = {
              id: uuidv4(),
              import_source_id: importSource.id,
              source_line_number: lineNumber,
              source_raw_data: rawData,
              complaint_no: row.complaint_no || row['投诉单号'],
              store_code: row.store_code || row['门店编码'],
              store_name: row.store_name || row['门店名称'],
              batch_no: row.batch_no || row['批次号'],
              pot_no: row.pot_no || row['锅次'],
              product_name: row.product_name || row['产品名称'],
              product_code: row.product_code || row['产品编码'],
              complaint_time: row.complaint_time || row['投诉时间'],
              complaint_type: row.complaint_type || row['投诉类型'],
              complaint_level: row.complaint_level || row['投诉级别'] || 'normal',
              complaint_content: row.complaint_content || row['投诉内容'],
              complainant: row.complainant || row['投诉人'],
              complainant_contact: row.complainant_contact || row['联系电话'],
              handler: row.handler || row['处理人'],
              handle_time: row.handle_time || row['处理时间'],
              handle_result: row.handle_result || row['处理结果'],
              status: row.status || row['状态'] || 'pending',
              remark: row.remark || row['备注'],
              created_by: importedBy,
              updated_by: importedBy
            };

            await db('store_complaints').insert(item);
            successCount++;
            results.push({ lineNumber, success: true, data: item });
          } catch (error) {
            failedCount++;
            results.push({ lineNumber, success: false, error: error.message });
          }
        })
        .on('end', async () => {
          await this.updateImportSource(importSource.id, {
            total_rows: lineNumber,
            success_rows: successCount,
            failed_rows: failedCount,
            status: failedCount === 0 ? IMPORT_STATUS.COMPLETED : 
                    successCount > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED
          });

          resolve({
            importSource: await db('import_sources').where({ id: importSource.id }).first(),
            results,
            successCount,
            failedCount,
            totalCount: lineNumber
          });
        })
        .on('error', async (error) => {
          await this.updateImportSource(importSource.id, {
            status: IMPORT_STATUS.FAILED
          });
          reject(error);
        });
    });
  }

  static async importRefundRecords(filePath, sourceName, importedBy = null) {
    const importSource = await this.createImportSource(
      SOURCE_TYPES.REFUND_RECORD,
      filePath,
      sourceName,
      importedBy
    );

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let lineNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          lineNumber++;
          try {
            const rawData = JSON.stringify(row);
            const item = {
              id: uuidv4(),
              import_source_id: importSource.id,
              source_line_number: lineNumber,
              source_raw_data: rawData,
              refund_no: row.refund_no || row['退款单号'],
              store_code: row.store_code || row['门店编码'],
              store_name: row.store_name || row['门店名称'],
              batch_no: row.batch_no || row['批次号'],
              pot_no: row.pot_no || row['锅次'],
              product_name: row.product_name || row['产品名称'],
              product_code: row.product_code || row['产品编码'],
              refund_amount: parseFloat(row.refund_amount || row['退款金额'] || 0),
              refund_quantity: parseFloat(row.refund_quantity || row['退款数量'] || 0),
              refund_reason: row.refund_reason || row['退款原因'],
              refund_time: row.refund_time || row['退款时间'],
              refund_channel: row.refund_channel || row['退款渠道'],
              related_complaint_no: row.related_complaint_no || row['关联投诉单号'],
              status: row.status || row['状态'] || 'completed',
              remark: row.remark || row['备注'],
              created_by: importedBy,
              updated_by: importedBy
            };

            await db('refund_records').insert(item);
            successCount++;
            results.push({ lineNumber, success: true, data: item });
          } catch (error) {
            failedCount++;
            results.push({ lineNumber, success: false, error: error.message });
          }
        })
        .on('end', async () => {
          await this.updateImportSource(importSource.id, {
            total_rows: lineNumber,
            success_rows: successCount,
            failed_rows: failedCount,
            status: failedCount === 0 ? IMPORT_STATUS.COMPLETED : 
                    successCount > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED
          });

          resolve({
            importSource: await db('import_sources').where({ id: importSource.id }).first(),
            results,
            successCount,
            failedCount,
            totalCount: lineNumber
          });
        })
        .on('error', async (error) => {
          await this.updateImportSource(importSource.id, {
            status: IMPORT_STATUS.FAILED
          });
          reject(error);
        });
    });
  }

  static async importInventoryDifferences(filePath, sourceName, importedBy = null) {
    const importSource = await this.createImportSource(
      SOURCE_TYPES.INVENTORY_DIFFERENCE,
      filePath,
      sourceName,
      importedBy
    );

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let lineNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          lineNumber++;
          try {
            const rawData = JSON.stringify(row);
            const item = {
              id: uuidv4(),
              import_source_id: importSource.id,
              source_line_number: lineNumber,
              source_raw_data: rawData,
              diff_no: row.diff_no || row['差异单号'],
              store_code: row.store_code || row['门店编码'],
              store_name: row.store_name || row['门店名称'],
              batch_no: row.batch_no || row['批次号'],
              pot_no: row.pot_no || row['锅次'],
              product_name: row.product_name || row['产品名称'],
              product_code: row.product_code || row['产品编码'],
              expected_quantity: parseFloat(row.expected_quantity || row['账存数量'] || 0),
              actual_quantity: parseFloat(row.actual_quantity || row['实存数量'] || 0),
              diff_quantity: parseFloat(row.diff_quantity || row['差异数量'] || 0),
              diff_amount: parseFloat(row.diff_amount || row['差异金额'] || 0),
              diff_type: row.diff_type || row['差异类型'],
              check_time: row.check_time || row['盘点时间'],
              checker: row.checker || row['盘点人'],
              status: row.status || row['状态'] || 'pending',
              remark: row.remark || row['备注'],
              created_by: importedBy,
              updated_by: importedBy
            };

            await db('inventory_differences').insert(item);
            successCount++;
            results.push({ lineNumber, success: true, data: item });
          } catch (error) {
            failedCount++;
            results.push({ lineNumber, success: false, error: error.message });
          }
        })
        .on('end', async () => {
          await this.updateImportSource(importSource.id, {
            total_rows: lineNumber,
            success_rows: successCount,
            failed_rows: failedCount,
            status: failedCount === 0 ? IMPORT_STATUS.COMPLETED : 
                    successCount > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED
          });

          resolve({
            importSource: await db('import_sources').where({ id: importSource.id }).first(),
            results,
            successCount,
            failedCount,
            totalCount: lineNumber
          });
        })
        .on('error', async (error) => {
          await this.updateImportSource(importSource.id, {
            status: IMPORT_STATUS.FAILED
          });
          reject(error);
        });
    });
  }

  static async getImportSources(sourceType = null, page = 1, pageSize = 20) {
    let query = db('import_sources').select();
    
    if (sourceType) {
      query = query.where('source_type', sourceType);
    }

    const total = await query.clone().count('id as count').first().then(r => r.count);
    const items = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { items, total, page, pageSize };
  }
}

module.exports = ImportService;
