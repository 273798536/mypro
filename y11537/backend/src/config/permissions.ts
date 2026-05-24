import { UserRole, AuditAction, PermissionConfig } from '../models/types';

export const rolePermissions: Record<UserRole, PermissionConfig> = {
  [UserRole.DATA_ENTRY]: {
    visibleFields: [
      'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
      'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
      'isProxy', 'proxyEmployeeId', 'proxyEmployeeName', 'remark', 'createdAt'
    ],
    allowedActions: [
      AuditAction.SUBMIT,
      AuditAction.QUEUE,
      AuditAction.EXPORT
    ]
  },
  [UserRole.REVIEWER]: {
    visibleFields: [
      'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
      'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
      'isProxy', 'proxyEmployeeId', 'proxyEmployeeName', 'isCompensated', 'compensationSource',
      'isValid', 'validationRemark', 'status', 'retryCategory', 'retryCount',
      'errorMessage', 'originalData', 'correctedData', 'remark', 'createdAt', 'updatedAt'
    ],
    allowedActions: [
      AuditAction.SUBMIT,
      AuditAction.QUEUE,
      AuditAction.RETRY,
      AuditAction.MANUAL_TAKEOVER,
      AuditAction.APPROVE,
      AuditAction.REJECT,
      AuditAction.UPDATE,
      AuditAction.EXPORT
    ]
  },
  [UserRole.SUPERVISOR]: {
    visibleFields: [
      'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
      'trainingDate', 'signinTime', 'source', 'sourceFile', 'qrcodeId', 'location',
      'latitude', 'longitude', 'isProxy', 'proxyEmployeeId', 'proxyEmployeeName',
      'isCompensated', 'compensationSource', 'isValid', 'validationRemark',
      'status', 'retryCategory', 'retryCount', 'maxRetryCount', 'lastRetryTime',
      'nextRetryTime', 'errorMessage', 'errorStack', 'originalData', 'correctedData',
      'handledBy', 'handledAt', 'handleRemark', 'compensatedRecordId',
      'closedBy', 'closedAt', 'closeReason', 'createdBy', 'createdAt', 'updatedAt'
    ],
    allowedActions: [
      AuditAction.SUBMIT,
      AuditAction.QUEUE,
      AuditAction.RETRY,
      AuditAction.MANUAL_TAKEOVER,
      AuditAction.COMPENSATE,
      AuditAction.CLOSE,
      AuditAction.APPROVE,
      AuditAction.REJECT,
      AuditAction.UPDATE,
      AuditAction.DELETE,
      AuditAction.EXPORT
    ]
  },
  [UserRole.READ_ONLY]: {
    visibleFields: [
      'id', 'employeeId', 'employeeName', 'department', 'trainingId', 'trainingName',
      'trainingDate', 'signinTime', 'source', 'isProxy', 'isCompensated',
      'isValid', 'status', 'retryCategory', 'retryCount', 'createdAt'
    ],
    allowedActions: [
      AuditAction.EXPORT
    ]
  }
};

export const hrbpFocusFields = [
  'retryCategory',
  'status',
  'retryCount',
  'maxRetryCount',
  'nextRetryTime',
  'errorMessage',
  'isCompensated',
  'handledAt',
  'closedAt'
];

export function filterFieldsByRole<T extends Record<string, any>>(
  data: T,
  role: UserRole
): Partial<T> {
  const allowedFields = rolePermissions[role].visibleFields;
  const filtered: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      filtered[field as keyof T] = data[field as keyof T];
    }
  }
  
  return filtered;
}

export function canPerformAction(role: UserRole, action: AuditAction): boolean {
  return rolePermissions[role].allowedActions.includes(action);
}
