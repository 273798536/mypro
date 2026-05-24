import { PermissionConfig } from '../types';

export const PERMISSIONS: PermissionConfig = {
  readonly: {
    visibleFields: [
      'material_id',
      'material_name',
      'platform',
      'record_date',
      'impressions',
      'clicks',
      'cost',
      'audit_status',
      'status'
    ],
    allowedActions: ['view', 'report', 'export']
  },
  entry: {
    visibleFields: [
      'id',
      'source',
      'source_line',
      'material_id',
      'material_name',
      'platform',
      'record_date',
      'impressions',
      'clicks',
      'cost',
      'audit_status',
      'audit_reason',
      'status',
      'raw_data'
    ],
    allowedActions: ['view', 'import', 'check', 'fix', 'report', 'export', 'history']
  },
  review: {
    visibleFields: [
      'id',
      'source',
      'source_line',
      'material_id',
      'material_name',
      'platform',
      'record_date',
      'impressions',
      'clicks',
      'cost',
      'audit_status',
      'audit_reason',
      'status',
      'created_by',
      'created_at',
      'updated_at',
      'raw_data'
    ],
    allowedActions: ['view', 'import', 'check', 'fix', 'approve', 'reject', 'report', 'export', 'history']
  },
  manager: {
    visibleFields: [
      'id',
      'source',
      'source_line',
      'material_id',
      'material_name',
      'platform',
      'record_date',
      'impressions',
      'clicks',
      'cost',
      'audit_status',
      'audit_reason',
      'status',
      'created_by',
      'created_at',
      'updated_at',
      'request_id',
      'raw_data'
    ],
    allowedActions: ['view', 'import', 'check', 'fix', 'approve', 'reject', 'report', 'export', 'history', 'init', 'user:create']
  }
};

export function checkPermission(role: string, action: string): boolean {
  const config = PERMISSIONS[role];
  if (!config) return false;
  return config.allowedActions.includes(action);
}

export function filterFieldsByRole(role: string, data: Record<string, any>): Record<string, any> {
  const config = PERMISSIONS[role];
  if (!config) return {};
  
  const filtered: Record<string, any> = {};
  for (const field of config.visibleFields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }
  return filtered;
}
