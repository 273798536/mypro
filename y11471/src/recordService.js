const { run, get, all, beginTransaction, commitTransaction, rollbackTransaction } = require('./database');
const { generateId, safeParseInt, calculateDataQuality, deepClone } = require('./utils');

function getRecordId(batchNo, skuCode) {
  return `${batchNo}-${skuCode}`;
}

async function getOrCreateRecord(batchNo, skuCode) {
  const recordId = getRecordId(batchNo, skuCode);
  
  let record = await get('SELECT * FROM records WHERE id = ?', [recordId]);
  
  if (!record) {
    await run(
      'INSERT INTO records (id, batch_no, sku_code) VALUES (?, ?, ?)',
      [recordId, batchNo, skuCode]
    );
    record = await get('SELECT * FROM records WHERE id = ?', [recordId]);
  }
  
  return record;
}

async function updateRecord(recordId, updates, changedBy = 'system', changeNote = '') {
  const oldRecord = await get('SELECT * FROM records WHERE id = ?', [recordId]);
  
  if (!oldRecord) {
    throw new Error(`记录不存在: ${recordId}`);
  }
  
  const allowedFields = [
    'sku_name', 'supplier_code', 'supplier_name', 'warehouse_code',
    'apply_qty', 'inspection_qty', 'inspection_result',
    'shipped_qty', 'received_qty', 'exception_qty', 'sms_confirmed_qty',
    'supplier_accepted_qty', 'supplier_rejected_qty', 'supplier_pending_qty',
    'final_qty', 'status', 'judgment', 'judgment_note', 'judged_by', 'judged_at'
  ];
  
  const updateFields = [];
  const updateValues = [];
  const changes = [];
  
  allowedFields.forEach(field => {
    if (updates.hasOwnProperty(field)) {
      const oldValue = oldRecord[field];
      const newValue = updates[field];
      
      if (String(oldValue) !== String(newValue)) {
        updateFields.push(`${field} = ?`);
        updateValues.push(newValue);
        changes.push({
          field,
          oldValue: String(oldValue),
          newValue: String(newValue)
        });
      }
    }
  });
  
  if (changes.length === 0) {
    return { updated: false, changes: [] };
  }
  
  for (const change of changes) {
    await run(
      `INSERT INTO change_history 
      (record_id, batch_no, sku_code, field_name, old_value, new_value, change_type, changed_by, change_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        oldRecord.batch_no,
        oldRecord.sku_code,
        change.field,
        change.oldValue,
        change.newValue,
        'update',
        changedBy,
        changeNote
      ]
    );
  }
  
  const quality = calculateDataQuality({ ...oldRecord, ...updates });
  updateFields.push('data_quality_score = ?');
  updateValues.push(quality.score);
  updateFields.push('has_warning = ?');
  updateValues.push(quality.hasWarning ? 1 : 0);
  updateFields.push('warning_messages = ?');
  updateValues.push(quality.warningMessages);
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  
  updateValues.push(recordId);
  
  await run(
    `UPDATE records SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );
  
  return { updated: true, changes };
}

async function getRecord(recordId) {
  return await get('SELECT * FROM records WHERE id = ?', [recordId]);
}

async function getRecordByBatchAndSku(batchNo, skuCode) {
  const recordId = getRecordId(batchNo, skuCode);
  return await getRecord(recordId);
}

async function listRecords(filters = {}) {
  let sql = 'SELECT * FROM records WHERE 1=1';
  const params = [];
  
  if (filters.batchNo) {
    sql += ' AND batch_no = ?';
    params.push(filters.batchNo);
  }
  
  if (filters.skuCode) {
    sql += ' AND sku_code LIKE ?';
    params.push(`%${filters.skuCode}%`);
  }
  
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  
  if (filters.judgment) {
    sql += ' AND judgment = ?';
    params.push(filters.judgment);
  }
  
  if (filters.hasWarning) {
    sql += ' AND has_warning = 1';
  }
  
  sql += ' ORDER BY batch_no, sku_code';
  
  return await all(sql, params);
}

async function getRecordSources(recordId) {
  const record = await getRecord(recordId);
  if (!record) return null;
  
  return {
    record,
    applications: await all(
      'SELECT * FROM return_applications WHERE batch_no = ? AND sku_code = ?',
      [record.batch_no, record.sku_code]
    ),
    inspections: await all(
      'SELECT * FROM inspection_photos WHERE batch_no = ? AND sku_code = ?',
      [record.batch_no, record.sku_code]
    ),
    logistics: await all(
      'SELECT * FROM logistics_receipts WHERE batch_no = ? AND sku_code = ?',
      [record.batch_no, record.sku_code]
    ),
    sms: await all(
      'SELECT * FROM sms_snapshots WHERE batch_no = ? AND (sku_code = ? OR sku_code IS NULL)',
      [record.batch_no, record.sku_code]
    ),
    exceptions: await all(
      'SELECT * FROM exception_photos WHERE batch_no = ? AND sku_code = ?',
      [record.batch_no, record.sku_code]
    ),
    history: await all(
      'SELECT * FROM change_history WHERE record_id = ? ORDER BY created_at DESC',
      [recordId]
    ),
    judgments: await all(
      'SELECT * FROM judgments WHERE record_id = ? ORDER BY created_at DESC',
      [recordId]
    )
  };
}

async function getChangeHistory(filters = {}) {
  let sql = 'SELECT * FROM change_history WHERE 1=1';
  const params = [];
  
  if (filters.recordId) {
    sql += ' AND record_id = ?';
    params.push(filters.recordId);
  }
  
  if (filters.batchNo) {
    sql += ' AND batch_no = ?';
    params.push(filters.batchNo);
  }
  
  if (filters.skuCode) {
    sql += ' AND sku_code = ?';
    params.push(filters.skuCode);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return await all(sql, params);
}

async function makeJudgment(recordId, judgmentType, newValue, note, judgedBy) {
  const record = await getRecord(recordId);
  
  if (!record) {
    throw new Error(`记录不存在: ${recordId}`);
  }
  
  const oldValue = record[judgmentType];
  
  await run(
    `INSERT INTO judgments (record_id, batch_no, sku_code, judgment_type, old_value, new_value, judge_note, judged_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recordId,
      record.batch_no,
      record.sku_code,
      judgmentType,
      String(oldValue),
      String(newValue),
      note,
      judgedBy
    ]
  );
  
  const updates = {
    [judgmentType]: newValue,
    judged_by: judgedBy,
    judged_at: new Date().toISOString()
  };
  
  if (judgmentType === 'supplier_accepted_qty' || 
      judgmentType === 'supplier_rejected_qty' || 
      judgmentType === 'supplier_pending_qty') {
    const accepted = judgmentType === 'supplier_accepted_qty' ? newValue : record.supplier_accepted_qty;
    const rejected = judgmentType === 'supplier_rejected_qty' ? newValue : record.supplier_rejected_qty;
    const pending = judgmentType === 'supplier_pending_qty' ? newValue : record.supplier_pending_qty;
    
    updates.final_qty = safeParseInt(accepted);
    
    if (safeParseInt(pending) > 0) {
      updates.status = 'partial';
    } else if (safeParseInt(accepted) >= safeParseInt(record.apply_qty)) {
      updates.status = 'confirmed';
      updates.judgment = '供应商确认';
    } else if (safeParseInt(rejected) > 0 && safeParseInt(accepted) === 0) {
      updates.status = 'rejected';
      updates.judgment = '供应商拒收';
    }
  }
  
  return await updateRecord(recordId, updates, judgedBy, note);
}

async function recalculateBatch(batchNo) {
  const records = await all('SELECT * FROM records WHERE batch_no = ?', [batchNo]);
  
  for (const record of records) {
    const quality = calculateDataQuality(record);
    await run(
      `UPDATE records 
       SET data_quality_score = ?, has_warning = ?, warning_messages = ?
       WHERE id = ?`,
      [quality.score, quality.hasWarning ? 1 : 0, quality.warningMessages, record.id]
    );
  }
  
  return records.length;
}

async function getImportFailures(batchId = null) {
  let sql = 'SELECT * FROM import_failures';
  const params = [];
  
  if (batchId) {
    sql += ' WHERE batch_id = ?';
    params.push(batchId);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  return await all(sql, params);
}

async function getImportBatches(sourceType = null) {
  let sql = 'SELECT * FROM import_batches';
  const params = [];
  
  if (sourceType) {
    sql += ' WHERE source_type = ?';
    params.push(sourceType);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  return await all(sql, params);
}

async function getSystemLogs(limit = 100) {
  return await all('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?', [limit]);
}

module.exports = {
  getRecordId,
  getOrCreateRecord,
  updateRecord,
  getRecord,
  getRecordByBatchAndSku,
  listRecords,
  getRecordSources,
  getChangeHistory,
  makeJudgment,
  recalculateBatch,
  getImportFailures,
  getImportBatches,
  getSystemLogs
};
