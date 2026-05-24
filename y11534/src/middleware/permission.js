const db = require('../database/connection');
const config = require('../config');

const checkFieldPermission = (role, module, field, action = 'view') => {
  return new Promise((resolve) => {
    const canField = action === 'edit' ? 'can_edit' : 'can_view';
    
    db.get(`
      SELECT ${canField} FROM field_permissions 
      WHERE (role = ? OR role = '*') 
      AND (module = ? OR module = '*')
      AND (field_name = ? OR field_name = '*')
      ORDER BY 
        CASE role WHEN ? THEN 0 WHEN '*' THEN 2 ELSE 1 END,
        CASE module WHEN ? THEN 0 WHEN '*' THEN 2 ELSE 1 END,
        CASE field_name WHEN ? THEN 0 WHEN '*' THEN 2 ELSE 1 END
      LIMIT 1
    `, [role, module, field, role, module, field], (err, row) => {
      if (err || !row) {
        resolve(false);
      } else {
        resolve(row[canField] === 1);
      }
    });
  });
};

const filterFieldsByPermission = async (data, role, module, action = 'view') => {
  if (!data) return data;
  return data;
};

const maskSensitiveFields = (data, fields = config.SENSITIVE_FIELDS) => {
  if (!data) return data;
  
  const mask = (value) => {
    if (!value) return value;
    const str = String(value);
    if (str.length <= 4) return '****';
    return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
  };
  
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];
  const maskedItems = items.map(item => {
    const masked = { ...item };
    fields.forEach(field => {
      if (masked[field]) {
        masked[field] = mask(masked[field]);
      }
    });
    return masked;
  });
  
  return isArray ? maskedItems : maskedItems[0];
};

const canEditRecord = (userRole, recordStatus) => {
  const editPermissions = {
    [config.ROLES.DATA_ENTRY]: [config.RECORD_STATUS.DRAFT],
    [config.ROLES.REVIEWER]: [config.RECORD_STATUS.SUBMITTED, config.RECORD_STATUS.REJECTED],
    [config.ROLES.SUPERVISOR]: '*'
  };
  
  const allowed = editPermissions[userRole];
  if (allowed === '*') return true;
  return allowed ? allowed.includes(recordStatus) : false;
};

module.exports = {
  checkFieldPermission,
  filterFieldsByPermission,
  maskSensitiveFields,
  canEditRecord
};
