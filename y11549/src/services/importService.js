const crypto = require('crypto');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const db = require('../config/database');
const logger = require('../config/logger');
const auditService = require('./auditService');

const generateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const createImportSource = async (fileName, fileHash, recordType, uploadedBy) => {
  const sql = `
    INSERT INTO import_sources (
      source_file_name, source_file_hash, record_type, uploaded_by, status)
    VALUES (?, ?, ?, ?, 'processing')
  `;
  
  try {
    const result = await runQuery(sql, [fileName, fileHash, recordType, uploadedBy]);
    return result.lastID;
  } catch (err) {
    const findSql = `
      SELECT id FROM import_sources WHERE source_file_hash = ? AND record_type = ?
    `;
    const existing = await getQuery(findSql, [fileHash, recordType]);
    if (existing) {
      await runQuery(
        `UPDATE import_sources SET uploaded_at = CURRENT_TIMESTAMP, uploaded_by = ? WHERE id = ?`,
        [uploadedBy, existing.id]
      );
      return existing.id;
    }
    throw err;
  }
};

const updateImportSourceStats = (sourceId, total, success, failed, status, errorMsg = null) => {
  return runQuery(`
    UPDATE import_sources
    SET total_rows = ?, success_count = ?, failed_count = ?, status = ?, error_message = ?
    WHERE id = ?
  `, [total, success, failed, status, errorMsg, sourceId]);
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

const importMaterialList = async (filePath, sourceId, operator) => {
  const records = await parseCSV(filePath);
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2;
    try {
      if (!record['物料编码'] || !record['物料名称']) {
        throw new Error('缺少必填字段: 物料编码或物料名称');
      }

      try {
        await runQuery(`
          INSERT INTO material_lists (
            source_id, source_row_number, raw_data,
            material_code, material_name, category, specifications,
            quantity, unit, estimated_value, owner_department
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sourceId,
          rowNumber,
          JSON.stringify(record),
          record['物料编码'],
          record['物料名称'],
          record['类别'] || null,
          record['规格'] || null,
          parseInt(record['数量']) || 0,
          record['单位'] || null,
          parseFloat(record['预估价值']) || null,
          record['所属部门'] || null
        ]);
      } catch (insertErr) {
        if (insertErr.message.includes('UNIQUE')) {
          await runQuery(`
            UPDATE material_lists SET
              source_id = ?,
              source_row_number = ?,
              raw_data = ?,
              material_name = ?,
              category = ?,
              specifications = ?,
              quantity = ?,
              unit = ?,
              estimated_value = ?,
              owner_department = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE material_code = ?
          `, [
            sourceId,
            rowNumber,
            JSON.stringify(record),
            record['物料名称'],
            record['类别'] || null,
            record['规格'] || null,
            parseInt(record['数量']) || 0,
            record['单位'] || null,
            parseFloat(record['预估价值']) || null,
            record['所属部门'] || null,
            record['物料编码']
          ]);
        } else {
          throw insertErr;
        }
      }
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`行 ${rowNumber}: ${error.message}`);
      logger.error(`物料清单导入失败 - 行 ${rowNumber}`, { error: error.message, record });
    }
  }

  return { successCount, failedCount, errors };
};

const importLogisticsReceipt = async (filePath, sourceId, operator) => {
  const records = await parseCSV(filePath);
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2;
    try {
      if (!record['签收单号']) {
        throw new Error('缺少必填字段: 签收单号');
      }

      try {
        await runQuery(`
          INSERT INTO logistics_receipts (
            source_id, source_row_number, raw_data,
            receipt_no, tracking_number, material_code, material_name,
            sender_name, sender_phone, receiver_name, receiver_phone,
            receive_address, receive_date, received_quantity, receiver_signature
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sourceId,
          rowNumber,
          JSON.stringify(record),
          record['签收单号'],
          record['物流单号'] || null,
          record['物料编码'] || null,
          record['物料名称'] || null,
          record['发货人'] || null,
          record['发货人电话'] || null,
          record['签收人'] || null,
          record['签收人电话'] || null,
          record['签收地址'] || null,
          record['签收日期'] || null,
          parseInt(record['签收数量']) || 0,
          record['签收签字'] || null
        ]);
      } catch (insertErr) {
        if (insertErr.message.includes('UNIQUE')) {
          await runQuery(`
            UPDATE logistics_receipts SET
              source_id = ?,
              source_row_number = ?,
              raw_data = ?,
              tracking_number = ?,
              material_code = ?,
              material_name = ?,
              sender_name = ?,
              sender_phone = ?,
              receiver_name = ?,
              receiver_phone = ?,
              receive_address = ?,
              receive_date = ?,
              received_quantity = ?,
              receiver_signature = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE receipt_no = ?
          `, [
            sourceId,
            rowNumber,
            JSON.stringify(record),
            record['物流单号'] || null,
            record['物料编码'] || null,
            record['物料名称'] || null,
            record['发货人'] || null,
            record['发货人电话'] || null,
            record['签收人'] || null,
            record['签收人电话'] || null,
            record['签收地址'] || null,
            record['签收日期'] || null,
            parseInt(record['签收数量']) || 0,
            record['签收签字'] || null,
            record['签收单号']
          ]);
        } else {
          throw insertErr;
        }
      }
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`行 ${rowNumber}: ${error.message}`);
      logger.error(`物流签收导入失败 - 行 ${rowNumber}`, { error: error.message, record });
    }
  }

  return { successCount, failedCount, errors };
};

const importBorrowRecord = async (filePath, sourceId, operator) => {
  const records = await parseCSV(filePath);
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2;
    try {
      if (!record['借用单号']) {
        throw new Error('缺少必填字段: 借用单号');
      }

      try {
        await runQuery(`
          INSERT INTO borrow_records (
            source_id, source_row_number, raw_data,
            borrow_no, material_code, material_name,
            borrower_name, borrower_phone, borrower_department,
            borrow_date, expected_return_date, actual_return_date,
            borrow_quantity, return_quantity, location, shift_info, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sourceId,
          rowNumber,
          JSON.stringify(record),
          record['借用单号'],
          record['物料编码'] || null,
          record['物料名称'] || null,
          record['借用人'] || null,
          record['借用人电话'] || null,
          record['借用部门'] || null,
          record['借用时间'] || null,
          record['预计归还时间'] || null,
          record['实际归还时间'] || null,
          parseInt(record['借用数量']) || 0,
          parseInt(record['归还数量']) || 0,
          record['地点'] || null,
          record['班次信息'] || null,
          record['状态'] || 'borrowed'
        ]);
      } catch (insertErr) {
        if (insertErr.message.includes('UNIQUE')) {
          await runQuery(`
            UPDATE borrow_records SET
              source_id = ?,
              source_row_number = ?,
              raw_data = ?,
              material_code = ?,
              material_name = ?,
              borrower_name = ?,
              borrower_phone = ?,
              borrower_department = ?,
              borrow_date = ?,
              expected_return_date = ?,
              actual_return_date = ?,
              borrow_quantity = ?,
              return_quantity = ?,
              location = ?,
              shift_info = ?,
              status = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE borrow_no = ?
          `, [
            sourceId,
            rowNumber,
            JSON.stringify(record),
            record['物料编码'] || null,
            record['物料名称'] || null,
            record['借用人'] || null,
            record['借用人电话'] || null,
            record['借用部门'] || null,
            record['借用时间'] || null,
            record['预计归还时间'] || null,
            record['实际归还时间'] || null,
            parseInt(record['借用数量']) || 0,
            parseInt(record['归还数量']) || 0,
            record['地点'] || null,
            record['班次信息'] || null,
            record['状态'] || 'borrowed',
            record['借用单号']
          ]);
        } else {
          throw insertErr;
        }
      }
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`行 ${rowNumber}: ${error.message}`);
      logger.error(`借用记录导入失败 - 行 ${rowNumber}`, { error: error.message, record });
    }
  }

  return { successCount, failedCount, errors };
};

const importPriceAdjustment = async (filePath, sourceId, operator) => {
  const records = await parseCSV(filePath);
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2;
    try {
      if (!record['物料编码']) {
        throw new Error('缺少必填字段: 物料编码');
      }

      try {
        await runQuery(`
          INSERT INTO price_adjustments (
            source_id, source_row_number, raw_data,
            material_code, original_price, adjusted_price,
            adjustment_reason, adjusted_by, adjustment_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sourceId,
          rowNumber,
          JSON.stringify(record),
          record['物料编码'],
          parseFloat(record['原价']) || 0,
          parseFloat(record['调整后价格']) || 0,
          record['调整原因'] || null,
          record['调整人'] || null,
          record['调整日期'] || null
        ]);
      } catch (insertErr) {
        if (insertErr.message.includes('UNIQUE') || insertErr.message.includes('unique')) {
          await runQuery(`
            UPDATE price_adjustments SET
              source_id = ?,
              source_row_number = ?,
              raw_data = ?,
              original_price = ?,
              adjusted_price = ?,
              adjustment_reason = ?,
              adjusted_by = ?,
              adjustment_date = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE material_code = ?
          `, [
            sourceId,
            rowNumber,
            JSON.stringify(record),
            parseFloat(record['原价']) || 0,
            parseFloat(record['调整后价格']) || 0,
            record['调整原因'] || null,
            record['调整人'] || null,
            record['调整日期'] || null,
            record['物料编码']
          ]);
        } else {
          throw insertErr;
        }
      }
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`行 ${rowNumber}: ${error.message}`);
      logger.error(`价格调整导入失败 - 行 ${rowNumber}`, { error: error.message, record });
    }
  }

  return { successCount, failedCount, errors };
};

const importShiftRecord = async (filePath, sourceId, operator) => {
  const records = await parseCSV(filePath);
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2;
    try {
      if (!record['班次日期']) {
        throw new Error('缺少必填字段: 班次日期');
      }

      await runQuery(`
        INSERT INTO shift_records (
          source_id, source_row_number, raw_data,
          shift_date, shift_type, team_leader, team_member, handover_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sourceId,
        rowNumber,
        JSON.stringify(record),
        record['班次日期'],
        record['班次类型'] || null,
        record['班长'] || null,
        record['班组成员'] || null,
        record['交接备注'] || null
      ]);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`行 ${rowNumber}: ${error.message}`);
      logger.error(`班次记录导入失败 - 行 ${rowNumber}`, { error: error.message, record });
    }
  }

  return { successCount, failedCount, errors };
};

const importHandlers = {
  material_list: importMaterialList,
  logistics_receipt: importLogisticsReceipt,
  borrow_record: importBorrowRecord,
  shift_record: importShiftRecord,
  price_adjustment: importPriceAdjustment
};

const importFile = async (filePath, fileName, recordType, uploadedBy) => {
  const fileHash = generateFileHash(filePath);
  const sourceId = await createImportSource(fileName, fileHash, recordType, uploadedBy);

  const handler = importHandlers[recordType];
  if (!handler) {
    await updateImportSourceStats(sourceId, 0, 0, 0, 'failed', `不支持的记录类型: ${recordType}`);
    throw new Error(`不支持的记录类型: ${recordType}`);
  }

  try {
    const result = await handler(filePath, sourceId, uploadedBy);
    
    const status = result.failedCount === 0 ? 'completed' : 
                   result.successCount > 0 ? 'partial' : 'failed';
    
    await updateImportSourceStats(
      sourceId,
      result.successCount + result.failedCount,
      result.successCount,
      result.failedCount,
      status,
      result.errors.join('; ')
    );

    await auditService.logAction('import_source', sourceId, 'import', {
      operator: uploadedBy,
      changeReason: `导入文件: ${fileName}, 成功: ${result.successCount}, 失败: ${result.failedCount}`
    });

    return {
      sourceId,
      fileHash,
      total: result.successCount + result.failedCount,
      successCount: result.successCount,
      failedCount: result.failedCount,
      status,
      errors: result.errors
    };
  } catch (error) {
    await updateImportSourceStats(sourceId, 0, 0, 0, 'failed', error.message);
    throw error;
  }
};

module.exports = {
  generateFileHash,
  createImportSource,
  updateImportSourceStats,
  importFile,
  parseCSV,
  parseExcel,
  runQuery,
  getQuery,
  allQuery
};
