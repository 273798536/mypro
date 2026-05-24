const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { run, get, all, beginTransaction, commitTransaction, rollbackTransaction, logOperation, DATA_DIR } = require('./database');
const { generateId, generateBatchId, safeParseInt, validateBatchNo, validateSkuCode, validateQty } = require('./utils');
const { getOrCreateRecord, updateRecord } = require('./recordService');

const SOURCE_TYPES = {
  APPLICATION: 'application',
  INSPECTION: 'inspection',
  LOGISTICS: 'logistics',
  SMS: 'sms',
  EXCEPTION: 'exception'
};

function saveImportFile(sourceType, filePath) {
  const fileName = path.basename(filePath);
  const destDir = path.join(DATA_DIR, 'imports', sourceType);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destPath = path.join(destDir, `${Date.now()}_${fileName}`);
  fs.copyFileSync(filePath, destPath);
  return destPath;
}

async function createImportBatch(sourceType, sourceFile, importedBy = 'system', note = '') {
  const batchId = generateBatchId('IMP');
  await run(
    'INSERT INTO import_batches (id, source_type, source_file, imported_by, note) VALUES (?, ?, ?, ?, ?)',
    [batchId, sourceType, sourceFile, importedBy, note]
  );
  return batchId;
}

async function recordImportFailure(batchId, sourceType, originalLineNo, rawData, errorReason) {
  await run(
    'INSERT INTO import_failures (batch_id, source_type, original_line_no, raw_data, error_reason) VALUES (?, ?, ?, ?, ?)',
    [batchId, sourceType, originalLineNo, JSON.stringify(rawData), errorReason]
  );
}

async function updateBatchStats(batchId, successCount, failCount) {
  await run(
    'UPDATE import_batches SET success_count = ?, fail_count = ?, record_count = ? WHERE id = ?',
    [successCount, failCount, successCount + failCount, batchId]
  );
}

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    return parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  }
  throw new Error(`不支持的文件格式: ${ext}`);
}

function normalizeField(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

async function importApplications(filePath, options = {}) {
  const rows = await parseFile(filePath);
  const batchId = await createImportBatch(SOURCE_TYPES.APPLICATION, path.basename(filePath), options.operator, options.note);
  const savedPath = saveImportFile(SOURCE_TYPES.APPLICATION, filePath);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const originalLineNo = i + 2;
    
    const batchNo = normalizeField(row['批次号'] || row['batch_no'] || row['BatchNo']);
    const skuCode = normalizeField(row['SKU编码'] || row['sku_code'] || row['SkuCode']);
    const skuName = normalizeField(row['商品名称'] || row['sku_name']);
    const applyQty = safeParseInt(row['申请数量'] || row['apply_qty'], 0);
    const applyDate = normalizeField(row['申请日期'] || row['apply_date']) || new Date().toISOString().split('T')[0];
    const supplierCode = normalizeField(row['供应商编码'] || row['supplier_code']);
    const supplierName = normalizeField(row['供应商名称'] || row['supplier_name']);
    const warehouseCode = normalizeField(row['仓库编码'] || row['warehouse_code']);
    const reason = normalizeField(row['退供原因'] || row['reason']);
    
    const batchValid = validateBatchNo(batchNo);
    const skuValid = validateSkuCode(skuCode);
    const qtyValid = validateQty(applyQty, '申请数量');
    
    if (!batchValid.valid || !skuValid.valid || !qtyValid.valid) {
      const errors = [batchValid.reason, skuValid.reason, qtyValid.reason].filter(Boolean).join('; ');
      await recordImportFailure(batchId, SOURCE_TYPES.APPLICATION, originalLineNo, row, errors);
      failCount++;
      continue;
    }
    
    const recordId = `${batchNo}-${skuCode}`;
    await run(
      `INSERT OR REPLACE INTO return_applications 
       (id, batch_no, sku_code, sku_name, apply_qty, apply_date, supplier_code, supplier_name, 
        warehouse_code, reason, original_line_no, source_file, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, batchNo, skuCode, skuName, qtyValid.value, applyDate,
        supplierCode, supplierName, warehouseCode, reason, originalLineNo, savedPath, batchId
      ]
    );
    
    await getOrCreateRecord(batchNo, skuCode);
    await updateRecord(recordId, {
      sku_name: skuName,
      supplier_code: supplierCode,
      supplier_name: supplierName,
      warehouse_code: warehouseCode,
      apply_qty: qtyValid.value
    }, 'import', `导入退供申请: ${path.basename(filePath)}`);
    
    successCount++;
  }
  
  await updateBatchStats(batchId, successCount, failCount);
  await logOperation('INFO', '导入退供申请', `文件: ${filePath}, 成功: ${successCount}, 失败: ${failCount}`, options.operator);
  
  return { batchId, successCount, failCount, savedPath };
}

async function importInspections(filePath, options = {}) {
  const rows = await parseFile(filePath);
  const batchId = await createImportBatch(SOURCE_TYPES.INSPECTION, path.basename(filePath), options.operator, options.note);
  const savedPath = saveImportFile(SOURCE_TYPES.INSPECTION, filePath);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const originalLineNo = i + 2;
    
    const batchNo = normalizeField(row['批次号'] || row['batch_no']);
    const skuCode = normalizeField(row['SKU编码'] || row['sku_code']);
    const photoName = normalizeField(row['照片名称'] || row['photo_name']) || `photo_${i}`;
    const photoUrl = normalizeField(row['照片链接'] || row['photo_url']);
    const inspectionResult = normalizeField(row['质检结果'] || row['inspection_result']);
    const inspectionQty = safeParseInt(row['质检数量'] || row['inspection_qty'], 0);
    const inspector = normalizeField(row['质检员'] || row['inspector']);
    const inspectionDate = normalizeField(row['质检日期'] || row['inspection_date']) || new Date().toISOString().split('T')[0];
    
    const batchValid = validateBatchNo(batchNo);
    const skuValid = validateSkuCode(skuCode);
    
    if (!batchValid.valid || !skuValid.valid) {
      const errors = [batchValid.reason, skuValid.reason].filter(Boolean).join('; ');
      await recordImportFailure(batchId, SOURCE_TYPES.INSPECTION, originalLineNo, row, errors);
      failCount++;
      continue;
    }
    
    const recordId = generateId();
    await run(
      `INSERT OR REPLACE INTO inspection_photos 
       (id, batch_no, sku_code, photo_url, photo_name, inspection_result, inspection_qty, 
        inspector, inspection_date, original_line_no, source_file, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, batchNo, skuCode, photoUrl, photoName, inspectionResult, inspectionQty,
        inspector, inspectionDate, originalLineNo, savedPath, batchId
      ]
    );
    
    await getOrCreateRecord(batchNo, skuCode);
    const recordIdForUpdate = `${batchNo}-${skuCode}`;
    
    const existing = await get('SELECT inspection_qty FROM records WHERE id = ?', [recordIdForUpdate]);
    const newQty = (existing?.inspection_qty || 0) + inspectionQty;
    
    await updateRecord(recordIdForUpdate, {
      inspection_qty: newQty,
      inspection_result: inspectionResult || existing?.inspection_result
    }, 'import', `导入质检照片: ${path.basename(filePath)}`);
    
    successCount++;
  }
  
  await updateBatchStats(batchId, successCount, failCount);
  await logOperation('INFO', '导入质检照片', `文件: ${filePath}, 成功: ${successCount}, 失败: ${failCount}`, options.operator);
  
  return { batchId, successCount, failCount, savedPath };
}

async function importLogistics(filePath, options = {}) {
  const rows = await parseFile(filePath);
  const batchId = await createImportBatch(SOURCE_TYPES.LOGISTICS, path.basename(filePath), options.operator, options.note);
  const savedPath = saveImportFile(SOURCE_TYPES.LOGISTICS, filePath);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const originalLineNo = i + 2;
    
    const batchNo = normalizeField(row['批次号'] || row['batch_no']);
    const skuCode = normalizeField(row['SKU编码'] || row['sku_code']);
    const trackingNo = normalizeField(row['运单号'] || row['tracking_no'] || row['物流单号']);
    const shippedQty = safeParseInt(row['发货数量'] || row['shipped_qty'], 0);
    const receivedQty = safeParseInt(row['实收数量'] || row['received_qty'], 0);
    const shippingDate = normalizeField(row['发货日期'] || row['shipping_date']);
    const receivingDate = normalizeField(row['收货日期'] || row['receiving_date']);
    const carrier = normalizeField(row['承运商'] || row['carrier']);
    const driver = normalizeField(row['司机'] || row['driver']);
    
    const batchValid = validateBatchNo(batchNo);
    const skuValid = validateSkuCode(skuCode);
    
    if (!batchValid.valid || !skuValid.valid) {
      const errors = [batchValid.reason, skuValid.reason].filter(Boolean).join('; ');
      await recordImportFailure(batchId, SOURCE_TYPES.LOGISTICS, originalLineNo, row, errors);
      failCount++;
      continue;
    }
    
    const recordId = generateId();
    await run(
      `INSERT OR REPLACE INTO logistics_receipts 
       (id, batch_no, sku_code, tracking_no, shipped_qty, received_qty, shipping_date, 
        receiving_date, carrier, driver, original_line_no, source_file, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, batchNo, skuCode, trackingNo, shippedQty, receivedQty,
        shippingDate, receivingDate, carrier, driver, originalLineNo, savedPath, batchId
      ]
    );
    
    await getOrCreateRecord(batchNo, skuCode);
    const recordIdForUpdate = `${batchNo}-${skuCode}`;
    
    const existing = await get('SELECT shipped_qty, received_qty FROM records WHERE id = ?', [recordIdForUpdate]);
    const newShipped = (existing?.shipped_qty || 0) + shippedQty;
    const newReceived = (existing?.received_qty || 0) + receivedQty;
    
    await updateRecord(recordIdForUpdate, {
      shipped_qty: newShipped,
      received_qty: newReceived
    }, 'import', `导入物流回单: ${path.basename(filePath)}`);
    
    successCount++;
  }
  
  await updateBatchStats(batchId, successCount, failCount);
  await logOperation('INFO', '导入物流回单', `文件: ${filePath}, 成功: ${successCount}, 失败: ${failCount}`, options.operator);
  
  return { batchId, successCount, failCount, savedPath };
}

async function importSms(filePath, options = {}) {
  const rows = await parseFile(filePath);
  const batchId = await createImportBatch(SOURCE_TYPES.SMS, path.basename(filePath), options.operator, options.note);
  const savedPath = saveImportFile(SOURCE_TYPES.SMS, filePath);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const originalLineNo = i + 2;
    
    const batchNo = normalizeField(row['批次号'] || row['batch_no']);
    const skuCode = normalizeField(row['SKU编码'] || row['sku_code']);
    const smsContent = normalizeField(row['短信内容'] || row['sms_content'] || row['content']);
    const sender = normalizeField(row['发送方'] || row['sender']);
    const receiver = normalizeField(row['接收方'] || row['receiver']);
    const sendTime = normalizeField(row['发送时间'] || row['send_time']);
    const confirmedQty = safeParseInt(row['确认数量'] || row['confirmed_qty'], 0);
    const photoRef = normalizeField(row['照片引用'] || row['photo_ref']);
    
    const batchValid = validateBatchNo(batchNo);
    
    if (!batchValid.valid) {
      await recordImportFailure(batchId, SOURCE_TYPES.SMS, originalLineNo, row, batchValid.reason);
      failCount++;
      continue;
    }
    
    const recordId = generateId();
    await run(
      `INSERT INTO sms_snapshots 
       (id, batch_no, sku_code, sms_content, sender, receiver, send_time, confirmed_qty, 
        photo_ref, original_line_no, source_file, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, batchNo, skuCode || null, smsContent, sender, receiver, sendTime, confirmedQty,
        photoRef, originalLineNo, savedPath, batchId
      ]
    );
    
    if (skuCode) {
      await getOrCreateRecord(batchNo, skuCode);
      const recordIdForUpdate = `${batchNo}-${skuCode}`;
      
      const existing = await get('SELECT sms_confirmed_qty FROM records WHERE id = ?', [recordIdForUpdate]);
      const newConfirmed = (existing?.sms_confirmed_qty || 0) + confirmedQty;
      
      await updateRecord(recordIdForUpdate, {
        sms_confirmed_qty: newConfirmed
      }, 'import', `导入短信截图: ${path.basename(filePath)}`);
    }
    
    successCount++;
  }
  
  await updateBatchStats(batchId, successCount, failCount);
  await logOperation('INFO', '导入短信截图', `文件: ${filePath}, 成功: ${successCount}, 失败: ${failCount}`, options.operator);
  
  return { batchId, successCount, failCount, savedPath };
}

async function importExceptions(filePath, options = {}) {
  const rows = await parseFile(filePath);
  const batchId = await createImportBatch(SOURCE_TYPES.EXCEPTION, path.basename(filePath), options.operator, options.note);
  const savedPath = saveImportFile(SOURCE_TYPES.EXCEPTION, filePath);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const originalLineNo = i + 2;
    
    const batchNo = normalizeField(row['批次号'] || row['batch_no']);
    const skuCode = normalizeField(row['SKU编码'] || row['sku_code']);
    const photoName = normalizeField(row['照片名称'] || row['photo_name']) || `exception_${i}`;
    const photoUrl = normalizeField(row['照片链接'] || row['photo_url']);
    const exceptionType = normalizeField(row['异常类型'] || row['exception_type']);
    const exceptionDesc = normalizeField(row['异常描述'] || row['exception_desc']);
    const exceptionQty = safeParseInt(row['异常数量'] || row['exception_qty'], 0);
    const reporter = normalizeField(row['上报人'] || row['reporter']);
    const reportDate = normalizeField(row['上报日期'] || row['report_date']) || new Date().toISOString().split('T')[0];
    
    const batchValid = validateBatchNo(batchNo);
    const skuValid = validateSkuCode(skuCode);
    
    if (!batchValid.valid || !skuValid.valid) {
      const errors = [batchValid.reason, skuValid.reason].filter(Boolean).join('; ');
      await recordImportFailure(batchId, SOURCE_TYPES.EXCEPTION, originalLineNo, row, errors);
      failCount++;
      continue;
    }
    
    const recordId = generateId();
    await run(
      `INSERT INTO exception_photos 
       (id, batch_no, sku_code, photo_url, photo_name, exception_type, exception_desc, 
        exception_qty, reporter, report_date, original_line_no, source_file, import_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, batchNo, skuCode, photoUrl, photoName, exceptionType, exceptionDesc,
        exceptionQty, reporter, reportDate, originalLineNo, savedPath, batchId
      ]
    );
    
    await getOrCreateRecord(batchNo, skuCode);
    const recordIdForUpdate = `${batchNo}-${skuCode}`;
    
    const existing = await get('SELECT exception_qty FROM records WHERE id = ?', [recordIdForUpdate]);
    const newQty = (existing?.exception_qty || 0) + exceptionQty;
    
    await updateRecord(recordIdForUpdate, {
      exception_qty: newQty
    }, 'import', `导入异常照片: ${path.basename(filePath)}`);
    
    successCount++;
  }
  
  await updateBatchStats(batchId, successCount, failCount);
  await logOperation('INFO', '导入异常照片', `文件: ${filePath}, 成功: ${successCount}, 失败: ${failCount}`, options.operator);
  
  return { batchId, successCount, failCount, savedPath };
}

module.exports = {
  SOURCE_TYPES,
  importApplications,
  importInspections,
  importLogistics,
  importSms,
  importExceptions,
  parseFile
};
