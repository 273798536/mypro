const fs = require('fs');
const path = require('path');
const os = require('os');
const { getWorkspacePaths, readJson, writeJson } = require('./file-manager');

const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  READONLY: 'readonly'
};

const PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.OPERATOR]: [
    'import.view',
    'import.create',
    'check.view',
    'check.run',
    'report.view',
    'report.create',
    'fix.view',
    'fix.create',
    'history.view',
    'export.view',
    'export.create',
    'queue.view',
    'queue.manage'
  ],
  [ROLES.READONLY]: [
    'import.view',
    'check.view',
    'check.run',
    'report.view',
    'report.create',
    'fix.view',
    'history.view',
    'export.view',
    'export.create',
    'queue.view'
  ]
};

const COMMAND_PERMISSIONS = {
  init: 'admin.init',
  import: {
    default: 'import.create',
    view: 'import.view'
  },
  check: {
    default: 'check.run',
    view: 'check.view'
  },
  report: {
    default: 'report.create',
    view: 'report.view'
  },
  fix: {
    default: 'fix.create',
    list: 'fix.view',
    view: 'fix.view'
  },
  history: 'history.view',
  export: {
    default: 'export.create',
    view: 'export.view'
  },
  'queue-retry': 'queue.manage',
  'queue-deadletter': 'queue.view'
};

const SENSITIVE_FIELDS = [
  'user_id',
  'user_name',
  'user_phone',
  'user_email',
  'agent_id',
  'agent_name',
  'conversation_id',
  'customer_info',
  'personal_info',
  'mobile',
  'phone',
  'email'
];

function getCurrentUser(root) {
  const envUser = process.env.KBASE_AUDIT_USER;
  const envRole = process.env.KBASE_AUDIT_ROLE;
  
  if (envUser && envRole) {
    return {
      username: envUser,
      role: envRole.toLowerCase(),
      source: 'environment'
    };
  }

  const systemUser = os.userInfo().username;

  if (root) {
    try {
      const assignedRole = getUserRole(root, systemUser);
      if (assignedRole) {
        return {
          username: systemUser,
          role: assignedRole,
          source: 'config'
        };
      }
    } catch (e) {
      // 如果读取配置失败，使用默认角色
    }
  }

  return {
    username: systemUser,
    role: ROLES.OPERATOR,
    source: 'system'
  };
}

function getRoleConfig(root) {
  const paths = getWorkspacePaths(root);
  const config = readJson(path.join(paths.root, '.kbase-audit', 'roles.json'));
  
  if (config) return config;

  const defaultConfig = {
    version: '1.0',
    roles: {
      admin: {
        name: '管理员',
        description: '拥有所有权限，可管理用户角色',
        permissions: ['*']
      },
      operator: {
        name: '运营人员',
        description: '可导入、检查、改判、导出数据',
        permissions: PERMISSIONS[ROLES.OPERATOR]
      },
      readonly: {
        name: '只读账号',
        description: '仅可查看数据，不能修改，敏感字段脱敏',
        permissions: PERMISSIONS[ROLES.READONLY]
      }
    },
    userRoles: {}
  };

  writeJson(path.join(paths.root, '.kbase-audit', 'roles.json'), defaultConfig);
  return defaultConfig;
}

function hasPermission(user, permission) {
  if (!user) return false;
  
  const userRole = user.role;
  
  if (userRole === ROLES.ADMIN) {
    return true;
  }

  const rolePerms = PERMISSIONS[userRole] || [];
  
  if (rolePerms.includes('*')) return true;
  if (rolePerms.includes(permission)) return true;
  
  const prefix = permission.split('.')[0];
  if (rolePerms.includes(`${prefix}.*`)) return true;

  return false;
}

function checkCommandPermission(commandName, options, user) {
  const cmdPerm = COMMAND_PERMISSIONS[commandName];
  
  if (!cmdPerm) return { allowed: true, permission: null };
  
  let permission;
  if (typeof cmdPerm === 'string') {
    permission = cmdPerm;
  } else {
    let subAction = 'default';
    if (options?.list) subAction = 'list';
    if (options?.view) subAction = 'view';
    permission = cmdPerm[subAction] || cmdPerm.default;
  }

  const allowed = hasPermission(user, permission);
  
  return {
    allowed,
    permission,
    userRole: user?.role,
    username: user?.username
  };
}

function maskSensitiveData(data, user) {
  if (!data || user?.role === ROLES.ADMIN || user?.role === ROLES.OPERATOR) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, user));
  }

  if (typeof data === 'object' && data !== null) {
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive && value) {
        if (typeof value === 'string') {
          if (value.length <= 4) {
            masked[key] = '****';
          } else {
            const start = value.substring(0, 2);
            const end = value.substring(value.length - 2);
            masked[key] = `${start}****${end}`;
          }
        } else {
          masked[key] = '***MASKED***';
        }
        masked[key + '_masked'] = true;
      } else if (typeof value === 'object') {
        masked[key] = maskSensitiveData(value, user);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

function filterSensitiveRecords(records, user) {
  if (!records || user?.role === ROLES.ADMIN || user?.role === ROLES.OPERATOR) {
    return records;
  }

  return records.map(record => ({
    ...record,
    parsedData: maskSensitiveData(record.parsedData, user),
    rawData: maskSensitiveData(record.rawData, user)
  }));
}

function assertPermission(commandName, options, user) {
  const check = checkCommandPermission(commandName, options, user);
  
  if (!check.allowed) {
    const error = new Error(
      `权限不足: 用户 '${check.username}' (角色: ${check.userRole}) ` +
      `没有权限执行该操作 (需要: ${check.permission})`
    );
    error.code = 'PERMISSION_DENIED';
    error.permission = check.permission;
    error.userRole = check.userRole;
    throw error;
  }

  return check;
}

function setUserRole(root, username, role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`无效角色: ${role}，有效值: ${Object.values(ROLES).join(', ')}`);
  }

  const paths = getWorkspacePaths(root);
  const config = getRoleConfig(root);
  
  config.userRoles[username] = {
    role,
    assignedAt: new Date().toISOString(),
    assignedBy: getCurrentUser().username
  };

  writeJson(path.join(paths.root, '.kbase-audit', 'roles.json'), config);
  return config.userRoles[username];
}

function getUserRole(root, username) {
  const config = getRoleConfig(root);
  const userConfig = config.userRoles[username];
  
  if (userConfig) {
    return userConfig.role;
  }
  
  return null;
}

module.exports = {
  ROLES,
  PERMISSIONS,
  SENSITIVE_FIELDS,
  getCurrentUser,
  getRoleConfig,
  hasPermission,
  checkCommandPermission,
  maskSensitiveData,
  filterSensitiveRecords,
  assertPermission,
  setUserRole,
  getUserRole
};
