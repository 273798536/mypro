const db = require('../config/database');

const validationRules = {
  work_orders: {
    order_no: { required: true, type: 'string', pattern: /^WO\d{8,}$/ },
    road_section: { required: true, type: 'string', minLength: 2 },
    light_count: { required: false, type: 'number', min: 0 },
    fault_type: { required: true, type: 'string', enum: ['bulb_broken', 'circuit_fault', 'pole_damage', 'control_issue', 'other'] },
    status: { required: false, type: 'string', enum: ['pending', 'reviewing', 'approved', 'rejected', 'closed'] }
  },
  inspection_photos: {
    work_order_id: { required: true, type: 'number', exists: 'work_orders' },
    photo_url: { required: true, type: 'string', minLength: 5 }
  },
  repair_hotlines: {
    work_order_id: { required: true, type: 'number', exists: 'work_orders' },
    call_time: { required: true, type: 'datetime' },
    fault_description: { required: true, type: 'string', minLength: 5 }
  },
  spare_parts: {
    work_order_id: { required: true, type: 'number', exists: 'work_orders' },
    part_batch_no: { required: true, type: 'string', pattern: /^BATCH[\dA-Z]{5,}$/ },
    part_name: { required: true, type: 'string', minLength: 2 },
    quantity: { required: false, type: 'number', min: 1 }
  },
  external_receipts: {
    work_order_id: { required: true, type: 'number', exists: 'work_orders' },
    receipt_no: { required: true, type: 'string', pattern: /^RCPT\d{6,}$/ }
  }
};

const validateField = (value, rule, fieldName) => {
  const errors = [];
  
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} 是必填字段`);
    return errors;
  }
  
  if (value === undefined || value === null || value === '') {
    return errors;
  }
  
  if (rule.type === 'number') {
    if (isNaN(Number(value))) {
      errors.push(`${fieldName} 必须是数字`);
    } else if (rule.min !== undefined && Number(value) < rule.min) {
      errors.push(`${fieldName} 不能小于 ${rule.min}`);
    }
  }
  
  if (rule.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${fieldName} 必须是字符串`);
    } else {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldName} 长度不能少于 ${rule.minLength} 个字符`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${fieldName} 格式不正确`);
      }
    }
  }
  
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${fieldName} 必须是以下值之一: ${rule.enum.join(', ')}`);
  }
  
  return errors;
};

const checkExists = (tableName, id) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM ${tableName} WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

const validateData = async (tableName, data, checkForeignKeys = true) => {
  const errors = [];
  const rules = validationRules[tableName];
  
  if (!rules) {
    return { valid: true, errors: [] };
  }
  
  for (const [fieldName, rule] of Object.entries(rules)) {
    const fieldErrors = validateField(data[fieldName], rule, fieldName);
    errors.push(...fieldErrors);
    
    if (checkForeignKeys && rule.exists && data[fieldName]) {
      const exists = await checkExists(rule.exists, data[fieldName]);
      if (!exists) {
        errors.push(`${fieldName} 引用的 ${rule.exists} 记录不存在`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

const recordBadData = (sourceTable, sourceData, errorType, errorMessage, reporterUserId = null) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO bad_data_records 
       (source_table, source_data, error_type, error_message, reporter_user_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        sourceTable,
        JSON.stringify(sourceData),
        errorType,
        errorMessage,
        reporterUserId
      ],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

const getBadDataRecords = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM bad_data_records WHERE 1=1';
    const params = [];
    
    if (filters.is_resolved !== undefined) {
      sql += ' AND is_resolved = ?';
      params.push(filters.is_resolved ? 1 : 0);
    }
    if (filters.source_table) {
      sql += ' AND source_table = ?';
      params.push(filters.source_table);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          source_data: row.source_data ? JSON.parse(row.source_data) : null
        })));
      }
    });
  });
};

const resolveBadData = (badDataId, resolvedUserId, resolutionNote) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE bad_data_records 
       SET is_resolved = 1, resolved_user_id = ?, resolved_at = CURRENT_TIMESTAMP, resolution_note = ? 
       WHERE id = ?`,
      [resolvedUserId, resolutionNote, badDataId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
};

module.exports = {
  validateData,
  recordBadData,
  getBadDataRecords,
  resolveBadData,
  validationRules
};
