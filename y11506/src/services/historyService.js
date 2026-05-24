const { getDatabase } = require('../db/database');

const RECORD_TYPES = {
  INSPECTION: 'inspection',
  CALIBRATION: 'calibration',
  REPAIR: 'repair',
  BATCH: 'batch'
};

const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  IMPORT: 'import',
  FIX: 'fix'
};

function logChange(recordType, recordId, fieldName, oldValue, newValue, operator, operationType, batchId = null) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO change_history 
    (record_type, record_id, field_name, old_value, new_value, operator, operation_type, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    recordType,
    recordId,
    fieldName,
    oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
    newValue !== null && newValue !== undefined ? String(newValue) : null,
    operator || process.env.USER || 'system',
    operationType,
    batchId
  );
}

function logRecordCreation(recordType, recordId, data, operator, batchId) {
  const db = getDatabase();
  const changes = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      changes.push({
        recordType,
        recordId,
        fieldName: key,
        oldValue: null,
        newValue: value,
        operator,
        operationType: OPERATION_TYPES.CREATE,
        batchId
      });
    }
  }
  
  const stmt = db.prepare(`
    INSERT INTO change_history 
    (record_type, record_id, field_name, old_value, new_value, operator, operation_type, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(
        item.recordType,
        item.recordId,
        item.fieldName,
        item.oldValue,
        String(item.newValue),
        item.operator,
        item.operationType,
        item.batchId
      );
    }
  });
  
  insertMany(changes);
  return changes.length;
}

function logRecordUpdate(recordType, recordId, oldData, newData, operator, batchId) {
  const changes = [];
  
  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = oldData[key];
    if (newValue !== undefined && String(oldValue) !== String(newValue)) {
      changes.push({
        recordType,
        recordId,
        fieldName: key,
        oldValue,
        newValue,
        operator,
        operationType: OPERATION_TYPES.UPDATE,
        batchId
      });
    }
  }
  
  if (changes.length > 0) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO change_history 
      (record_type, record_id, field_name, old_value, new_value, operator, operation_type, batch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.recordType,
          item.recordId,
          item.fieldName,
          item.oldValue !== null && item.oldValue !== undefined ? String(item.oldValue) : null,
          String(item.newValue),
          item.operator,
          item.operationType,
          item.batchId
        );
      }
    });
    
    insertMany(changes);
  }
  
  return changes.length;
}

function getRecordHistory(recordType, recordId, limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM change_history
    WHERE record_type = ? AND record_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(recordType, recordId, limit);
}

function getBatchHistory(batchId, limit = 500) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM change_history
    WHERE batch_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(batchId, limit);
}

function getOperatorHistory(operator, limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM change_history
    WHERE operator = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(operator, limit);
}

function getRecentHistory(days = 7, limit = 500) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM change_history
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(days, limit);
}

function getChangeSummary(startDate, endDate) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      record_type,
      operation_type,
      operator,
      COUNT(*) as change_count,
      DATE(created_at) as change_date
    FROM change_history
    WHERE created_at BETWEEN ? AND ?
    GROUP BY record_type, operation_type, operator, DATE(created_at)
    ORDER BY change_date DESC
  `);
  return stmt.all(startDate, endDate);
}

module.exports = {
  RECORD_TYPES,
  OPERATION_TYPES,
  logChange,
  logRecordCreation,
  logRecordUpdate,
  getRecordHistory,
  getBatchHistory,
  getOperatorHistory,
  getRecentHistory,
  getChangeSummary
};
