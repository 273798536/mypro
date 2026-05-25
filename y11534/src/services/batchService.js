const db = require('../database/connection');
const config = require('../config');
const { analyzeDirtyRecord } = require('./dataQualityService');
const { recordWorkFlow } = require('./workflowService');

const generateBatchNo = (recordType) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${recordType.toUpperCase()}_${dateStr}_${random}`;
};

const createBatchRecord = (recordType, totalCount, processedBy, duplicateStrategy) => {
  return new Promise((resolve, reject) => {
    const batchNo = generateBatchNo(recordType);
    db.run(`
      INSERT INTO batch_processing (
        batch_no, record_type, total_count, processed_by, duplicate_strategy, status
      ) VALUES (?, ?, ?, ?, ?, 'processing')
    `, [batchNo, recordType, totalCount, processedBy, duplicateStrategy], function(err) {
      if (err) reject(err);
      else resolve({ batchNo, id: this.lastID });
    });
  });
};

const updateBatchStats = (batchNo, stats) => {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE batch_processing
      SET success_count = ?,
          dirty_count = ?,
          duplicate_count = ?,
          duplicate_details = ?,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
      WHERE batch_no = ?
    `, [
      stats.successCount,
      stats.dirtyCount,
      stats.duplicateCount,
      JSON.stringify(stats.duplicateDetails),
      batchNo
    ], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

const checkDuplicate = (recordType, data) => {
  return new Promise((resolve, reject) => {
    let query, params;
    
    switch (recordType) {
      case 'teller_schedules':
        query = `SELECT * FROM teller_schedules WHERE teller_id = ? AND schedule_date = ?`;
        params = [data.teller_id, data.schedule_date];
        break;
      case 'leave_forms':
        query = `SELECT * FROM leave_forms WHERE form_no = ?`;
        params = [data.form_no];
        break;
      case 'business_forecasts':
        query = `SELECT * FROM business_forecasts WHERE forecast_date = ? AND branch = ?`;
        params = [data.forecast_date, data.branch];
        break;
      case 'supplier_bills':
        query = `SELECT * FROM supplier_bills WHERE bill_no = ?`;
        params = [data.bill_no];
        break;
      default:
        return resolve(null);
    }
    
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const processBatchRecords = async (recordType, records, user, duplicateStrategy = config.DUPLICATE_STRATEGY.IGNORE) => {
  const { batchNo } = await createBatchRecord(recordType, records.length, user.id, duplicateStrategy);
  
  const stats = {
    successCount: 0,
    dirtyCount: 0,
    duplicateCount: 0,
    duplicateDetails: []
  };
  
  const results = [];
  
  for (const record of records) {
    try {
      record.batch_no = batchNo;
      record.status = config.RECORD_STATUS.DRAFT;
      record.original_data = JSON.stringify(record);
      record.created_by = user.id;
      record.updated_by = user.id;
      
      const existingRecord = await checkDuplicate(recordType, record);
      
      if (existingRecord) {
        stats.duplicateCount++;
        stats.duplicateDetails.push({
          recordId: existingRecord.id,
          batchNo: existingRecord.batch_no,
          strategy: duplicateStrategy,
          timestamp: new Date().toISOString()
        });
        
        if (duplicateStrategy === config.DUPLICATE_STRATEGY.OVERWRITE) {
          record.updated_by = user.id;
          const updateResult = await updateRecord(recordType, existingRecord.id, record, user);
          
          await recordWorkFlow(
            recordType,
            existingRecord.id,
            'duplicate_overwrite',
            existingRecord.status,
            existingRecord.status,
            user,
            `重复数据覆盖处理: 原批次${existingRecord.batch_no}, 新批次${batchNo}`,
            { oldRecord: existingRecord, newRecord: record }
          );
          
          results.push({ status: 'overwritten', ...updateResult });
          stats.successCount++;
        } else {
          await recordWorkFlow(
            recordType,
            existingRecord.id,
            'duplicate_ignore',
            existingRecord.status,
            existingRecord.status,
            user,
            `重复数据忽略处理: 原批次${existingRecord.batch_no}, 新批次${batchNo}`,
            { ignoredRecord: record }
          );
          
          results.push({ status: 'ignored', record: record, reason: 'duplicate' });
        }
        continue;
      }
      
      const dirtyAnalysis = analyzeDirtyRecord(record, null, recordType);
      record.is_dirty = dirtyAnalysis.isDirty ? 1 : 0;
      record.dirty_type = dirtyAnalysis.dirtyType;
      record.dirty_details = dirtyAnalysis.dirtyDetails;
      
      if (dirtyAnalysis.isDirty) {
        stats.dirtyCount++;
      }
      
      const insertResult = await insertRecord(recordType, record);
      
      await recordWorkFlow(
        recordType,
        insertResult.id,
        'batch_import',
        null,
        config.RECORD_STATUS.DRAFT,
        user,
        `批量导入创建草稿，批次: ${batchNo}`,
        { batchNo, recordData: record }
      );
      
      results.push({ status: 'inserted', id: insertResult.id });
      stats.successCount++;
      
    } catch (err) {
      results.push({ status: 'error', record: record, error: err.message });
    }
  }
  
  await updateBatchStats(batchNo, stats);
  
  return {
    batchNo,
    stats,
    results
  };
};

const insertRecord = (recordType, data) => {
  return new Promise((resolve, reject) => {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => data[col]);
    
    db.run(`
      INSERT INTO ${recordType} (${columns.join(', ')})
      VALUES (${placeholders})
    `, values, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
};

const updateRecord = (recordType, id, data, user) => {
  return new Promise((resolve, reject) => {
    const columns = Object.keys(data).filter(col => col !== 'id' && col !== 'batch_no');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => data[col]), user.id, id];
    
    db.run(`
      UPDATE ${recordType}
      SET ${setClause}, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values, function(err) {
      if (err) reject(err);
      else resolve({ id, changes: this.changes });
    });
  });
};

const getBatchInfo = (batchNo) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT bp.*, u.real_name as processed_by_name
      FROM batch_processing bp
      LEFT JOIN users u ON bp.processed_by = u.id
      WHERE bp.batch_no = ?
    `, [batchNo], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getBatchRecords = (recordType, batchNo) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM ${recordType}
      WHERE batch_no = ?
      ORDER BY created_at DESC
    `, [batchNo], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  generateBatchNo,
  createBatchRecord,
  updateBatchStats,
  checkDuplicate,
  processBatchRecords,
  insertRecord,
  updateRecord,
  getBatchInfo,
  getBatchRecords
};
