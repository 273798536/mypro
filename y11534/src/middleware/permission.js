const db = require('../database/connection');
const config = require('../config');

const getRolePermissions = (role, module, action = 'view') => {
  return new Promise((resolve) => {
    const canField = action === 'edit' ? 'can_edit' : 'can_view';
    
    db.all(`
      SELECT field_name, ${canField} as allowed FROM field_permissions 
      WHERE (role = ? OR role = '*') 
      AND (module = ? OR module = '*')
      ORDER BY 
        CASE role WHEN ? THEN 0 WHEN '*' THEN 2 ELSE 1 END,
        CASE module WHEN ? THEN 0 WHEN '*' THEN 2 ELSE 1 END
    `, [role, module, role, module], (err, rows) => {
      if (err || !rows || rows.length === 0) {
        resolve(null);
      } else {
        const permissions = {};
        let hasWildcard = false;
        let wildcardAllowed = false;
        
        for (const row of rows) {
          if (row.field_name === '*') {
            hasWildcard = true;
            wildcardAllowed = row.allowed === 1;
          } else {
            permissions[row.field_name] = row.allowed === 1;
          }
        }
        
        resolve({ permissions, hasWildcard, wildcardAllowed });
      }
    });
  });
};

const checkFieldPermission = async (role, module, field, action = 'view') => {
  const result = await getRolePermissions(role, module, action);
  if (!result) return false;
  
  const { permissions, hasWildcard, wildcardAllowed } = result;
  
  if (permissions[field] !== undefined) {
    return permissions[field];
  }
  
  if (hasWildcard) {
    return wildcardAllowed;
  }
  
  return false;
};

const filterFieldsByPermission = async (data, role, module, action = 'view') => {
  if (!data) return data;
  
  const permissionResult = await getRolePermissions(role, module, action);
  
  if (!permissionResult) {
    return data;
  }
  
  const { permissions, hasWildcard, wildcardAllowed } = permissionResult;
  
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];
  const filteredItems = [];
  
  for (const item of items) {
    const filtered = {};
    for (const [key, value] of Object.entries(item)) {
      let allowed = wildcardAllowed;
      
      if (permissions[key] !== undefined) {
        allowed = permissions[key];
      } else if (hasWildcard) {
        allowed = wildcardAllowed;
      }
      
      if (allowed) {
        filtered[key] = value;
      }
    }
    filteredItems.push(filtered);
  }
  
  return isArray ? filteredItems : filteredItems[0];
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
