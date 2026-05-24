const config = require('../config');
const moment = require('moment');

const checkMissingFields = (data, requiredFields) => {
  const missing = [];
  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  });
  return missing;
};

const checkCrossDate = (startDate, endDate, allowCrossDays = false) => {
  if (!startDate || !endDate) return false;
  const start = moment(startDate);
  const end = moment(endDate);
  return !allowCrossDays && end.diff(start, 'days') > 0;
};

const checkNameChanged = (oldName, newName) => {
  if (!oldName || !newName) return false;
  return oldName.trim() !== newName.trim();
};

const checkAmountConflict = (oldAmount, newAmount, tolerance = 0.01) => {
  if (oldAmount === undefined || oldAmount === null || 
      newAmount === undefined || newAmount === null) {
    return false;
  }
  return Math.abs(parseFloat(oldAmount) - parseFloat(newAmount)) > tolerance;
};

const checkQuantityConflict = (oldQty, newQty) => {
  if (oldQty === undefined || oldQty === null || 
      newQty === undefined || newQty === null) {
    return false;
  }
  return parseInt(oldQty) !== parseInt(newQty);
};

const analyzeDirtyRecord = (data, existingRecord = null, recordType) => {
  const issues = [];
  let isDirty = false;
  
  const requiredFieldsMap = {
    'teller_schedules': ['teller_id', 'teller_name', 'branch', 'schedule_date', 'shift_type'],
    'leave_forms': ['teller_id', 'teller_name', 'branch', 'leave_type', 'start_date', 'end_date'],
    'business_forecasts': ['forecast_date', 'branch'],
    'supplier_bills': ['bill_no', 'supplier_name', 'branch', 'bill_date', 'amount']
  };
  
  const requiredFields = requiredFieldsMap[recordType] || [];
  const missingFields = checkMissingFields(data, requiredFields);
  
  if (missingFields.length > 0) {
    isDirty = true;
    issues.push({
      type: config.DIRTY_TYPES.MISSING_FIELDS,
      details: `缺少必填字段: ${missingFields.join(', ')}`,
      fields: missingFields
    });
  }
  
  if (existingRecord) {
    if (recordType === 'teller_schedules') {
      if (checkNameChanged(existingRecord.teller_name, data.teller_name)) {
        isDirty = true;
        issues.push({
          type: config.DIRTY_TYPES.NAME_CHANGED,
          details: `柜员姓名不一致: 原有"${existingRecord.teller_name}", 新数据"${data.teller_name}"`,
          oldValue: existingRecord.teller_name,
          newValue: data.teller_name
        });
      }
    }
    
    if (recordType === 'leave_forms') {
      if (checkCrossDate(data.start_date, data.end_date, false)) {
        isDirty = true;
        issues.push({
          type: config.DIRTY_TYPES.CROSS_DATE,
          details: `请假跨日: ${data.start_date} 到 ${data.end_date}`,
          startDate: data.start_date,
          endDate: data.end_date
        });
      }
    }
    
    if (recordType === 'supplier_bills') {
      if (checkAmountConflict(existingRecord.amount, data.amount)) {
        isDirty = true;
        issues.push({
          type: config.DIRTY_TYPES.AMOUNT_CONFLICT,
          details: `金额冲突: 原有${existingRecord.amount}, 新数据${data.amount}`,
          oldValue: existingRecord.amount,
          newValue: data.amount
        });
      }
      if (checkQuantityConflict(existingRecord.quantity, data.quantity)) {
        isDirty = true;
        issues.push({
          type: config.DIRTY_TYPES.QUANTITY_CONFLICT,
          details: `数量冲突: 原有${existingRecord.quantity}, 新数据${data.quantity}`,
          oldValue: existingRecord.quantity,
          newValue: data.quantity
        });
      }
    }
  }
  
  return {
    isDirty,
    dirtyType: issues.length > 0 ? issues[0].type : null,
    dirtyDetails: JSON.stringify(issues),
    issues
  };
};

const getDirtyRecords = (db, recordType, filters = {}) => {
  return new Promise((resolve, reject) => {
    let whereClause = ['is_dirty = 1'];
    let params = [];
    
    if (filters.dirtyType) {
      whereClause.push('dirty_type = ?');
      params.push(filters.dirtyType);
    }
    if (filters.branch) {
      whereClause.push('branch = ?');
      params.push(filters.branch);
    }
    if (filters.batchNo) {
      whereClause.push('batch_no = ?');
      params.push(filters.batchNo);
    }
    
    const where = whereClause.join(' AND ');
    
    db.all(`
      SELECT * FROM ${recordType} 
      WHERE ${where}
      ORDER BY created_at DESC
    `, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const resolveDirtyRecord = (db, recordType, recordId, processingOpinion, user) => {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE ${recordType}
      SET is_dirty = 0,
          dirty_type = NULL,
          dirty_details = NULL,
          processing_opinion = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [processingOpinion, user.id, recordId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

module.exports = {
  checkMissingFields,
  checkCrossDate,
  checkNameChanged,
  checkAmountConflict,
  checkQuantityConflict,
  analyzeDirtyRecord,
  getDirtyRecords,
  resolveDirtyRecord
};
