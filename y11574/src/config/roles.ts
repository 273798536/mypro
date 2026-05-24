import { UserRole, RolePermissions } from '../types';

export const rolePermissions: Record<UserRole, RolePermissions> = {
  [UserRole.DATA_ENTRY]: {
    visibleFields: [
      'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
      'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
      'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
      'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
      'isDirty', 'dirtyRecordTypes', 'handlingOpinion', 'isCorrected',
      'createdAt', 'updatedAt', 'version'
    ],
    allowedActions: [
      'create_draft', 'update_draft', 'submit', 'view_list', 'view_detail',
      'view_my_records', 'view_history'
    ]
  },
  [UserRole.REVIEWER]: {
    visibleFields: [
      'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
      'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
      'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
      'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
      'submittedBy', 'submittedAt', 'isDirty', 'dirtyRecordTypes',
      'originalContent', 'handlingOpinion', 'isCorrected',
      'createdAt', 'updatedAt', 'version'
    ],
    allowedActions: [
      'view_list', 'view_detail', 'view_all_records', 'approve', 'reject',
      'request_second_confirmation', 'view_history', 'mark_dirty_resolved',
      'add_handling_opinion'
    ]
  },
  [UserRole.SUPERVISOR]: {
    visibleFields: [
      'id', 'ticketId', 'ticketNumber', 'customerName', 'customerPhone',
      'agentName', 'agentId', 'department', 'slaBreachType', 'slaBreachDuration',
      'compensationAmount', 'compensationType', 'escalationLevel', 'transferCount',
      'responsibleParty', 'liabilityReason', 'status', 'dataSources', 'occurrenceDate',
      'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt',
      'rejectedBy', 'rejectedAt', 'rejectionReason',
      'secondConfirmedBy', 'secondConfirmedAt',
      'isDirty', 'dirtyRecordTypes', 'originalContent',
      'handlingOpinion', 'isCorrected',
      'createdAt', 'updatedAt', 'version'
    ],
    allowedActions: [
      'view_list', 'view_detail', 'view_all_records', 'second_confirm',
      'view_history', 'export_masked', 'export_full',
      'view_role_summary', 'view_change_reasons', 'view_sensitive_handling',
      'mark_dirty_resolved', 'add_handling_opinion', 'correct_record'
    ]
  },
  [UserRole.READ_ONLY]: {
    visibleFields: [
      'id', 'ticketId', 'ticketNumber', 'customerName',
      'agentName', 'department', 'slaBreachType',
      'compensationAmount', 'compensationType', 'escalationLevel',
      'responsibleParty', 'liabilityReason', 'status', 'occurrenceDate',
      'isDirty', 'isCorrected', 'createdAt'
    ],
    allowedActions: [
      'view_list', 'view_detail', 'view_history'
    ]
  }
};

export const getRolePermissions = (role: UserRole): RolePermissions => {
  return rolePermissions[role];
};

export const hasPermission = (role: UserRole, action: string): boolean => {
  return rolePermissions[role].allowedActions.includes(action);
};

export const canViewField = (role: UserRole, field: string): boolean => {
  return rolePermissions[role].visibleFields.includes(field);
};
