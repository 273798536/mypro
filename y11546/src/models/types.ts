export type DataSourceType = 'material_list' | 'logistics_receipt' | 'on_site_borrow' | 'inventory_diff';

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export type TaskStatus = 'pending' | 'processing' | 'success' | 'partial_success' | 'retry_waiting' | 'manual_waiting' | 'permanent_failed';

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface MaterialItem {
  id?: string;
  source_type: DataSourceType;
  source_batch_id: string;
  original_line_no: number;
  material_code: string;
  material_name: string;
  specification?: string;
  quantity: number;
  unit: string;
  warehouse?: string;
  location?: string;
  batch_no?: string;
  responsible_person?: string;
  department?: string;
  remark?: string;
  import_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LogisticsReceipt {
  id?: string;
  source_type: DataSourceType;
  source_batch_id: string;
  original_line_no: number;
  waybill_no: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  sender?: string;
  receiver?: string;
  receive_time?: string;
  receive_address?: string;
  sign_status?: 'signed' | 'unsigned' | 'rejected';
  remark?: string;
  import_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OnSiteBorrow {
  id?: string;
  source_type: DataSourceType;
  source_batch_id: string;
  original_line_no: number;
  borrow_no: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  borrower: string;
  borrower_department?: string;
  borrow_time?: string;
  expected_return_time?: string;
  actual_return_time?: string;
  return_status?: 'borrowed' | 'returned' | 'lost' | 'unconfirmed';
  keeper?: string;
  remark?: string;
  import_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryDiff {
  id?: string;
  source_type: DataSourceType;
  source_batch_id: string;
  original_line_no: number;
  material_code: string;
  material_name: string;
  expected_quantity: number;
  actual_quantity: number;
  diff_quantity: number;
  unit: string;
  diff_type: 'surplus' | 'shortage' | 'consistent';
  check_time?: string;
  checker?: string;
  reason?: string;
  remark?: string;
  import_time?: string;
  created_at?: string;
  updated_at?: string;
}

export type SourceData = MaterialItem | LogisticsReceipt | OnSiteBorrow | InventoryDiff;

export interface ImportBatch {
  id: string;
  source_type: DataSourceType;
  file_name: string;
  file_hash: string;
  strategy: ImportStrategy;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_count?: number;
  updated_count?: number;
  ignored_count?: number;
  overwritten_count?: number;
  status: TaskStatus;
  operator: string;
  import_time: string;
  remark?: string;
}

export interface AuditLog {
  id?: string;
  batch_id: string;
  source_type: DataSourceType;
  action: 'create' | 'update' | 'delete' | 'import';
  material_code: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  operator: string;
  operate_time: string;
  original_line_no?: number;
}

export interface DiffResult<T> {
  type: DiffType;
  material_code: string;
  original_line_no?: number;
  old_data?: T;
  new_data?: T;
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
}

export interface CheckResult {
  id: string;
  check_time: string;
  source_type: DataSourceType;
  total_count: number;
  consistent_count: number;
  diff_count: number;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    material_code: string;
    original_line_no?: number;
    message: string;
    suggestion?: string;
  }>;
}

export interface FailedRecord {
  id?: string;
  batch_id: string;
  source_type: DataSourceType;
  original_line_no: number;
  material_code: string;
  error_type: string;
  error_message: string;
  raw_data: string;
  status: 'pending' | 'fixed' | 'ignored';
  fixed_by?: string;
  fixed_time?: string;
  created_at: string;
}

export interface AsyncTask {
  id: string;
  type: string;
  batch_id?: string;
  status: TaskStatus;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  next_retry_at?: string;
  operator: string;
}

export interface ReportData {
  summary: {
    total_materials: number;
    total_logistics: number;
    total_borrowed: number;
    total_lost: number;
    total_diffs: number;
  };
  failed_records: FailedRecord[];
  logistics_status: {
    signed: number;
    unsigned: number;
    rejected: number;
    total_quantity: number;
  };
  borrow_status: {
    borrowed: number;
    returned: number;
    lost: number;
    unconfirmed: number;
  };
  inventory_diff: {
    surplus: number;
    shortage: number;
    consistent: number;
  };
  cross_check: {
    logistics_not_in_list: number;
    borrow_not_in_list: number;
    diff_not_in_list: number;
    borrow_exceed_stock: number;
  };
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';
export type PermissionAction = 'import' | 'overwrite' | 'delete' | 'check' | 'fix' | 'freeze' | 'unfreeze' | 'export' | 'manage_users';

export interface User {
  id: string;
  username: string;
  display_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BatchFreeze {
  id: string;
  batch_id: string;
  frozen_by: string;
  frozen_at: string;
  reason?: string;
  unfrozen_by?: string;
  unfrozen_at?: string;
  is_active: boolean;
}

export interface OperationLock {
  id: string;
  resource_type: string;
  resource_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  operation: string;
}

export interface RolePermission {
  role: UserRole;
  action: PermissionAction;
  allowed: boolean;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  { role: 'admin', action: 'import', allowed: true },
  { role: 'admin', action: 'overwrite', allowed: true },
  { role: 'admin', action: 'delete', allowed: true },
  { role: 'admin', action: 'check', allowed: true },
  { role: 'admin', action: 'fix', allowed: true },
  { role: 'admin', action: 'freeze', allowed: true },
  { role: 'admin', action: 'unfreeze', allowed: true },
  { role: 'admin', action: 'export', allowed: true },
  { role: 'admin', action: 'manage_users', allowed: true },

  { role: 'manager', action: 'import', allowed: true },
  { role: 'manager', action: 'overwrite', allowed: true },
  { role: 'manager', action: 'delete', allowed: false },
  { role: 'manager', action: 'check', allowed: true },
  { role: 'manager', action: 'fix', allowed: true },
  { role: 'manager', action: 'freeze', allowed: true },
  { role: 'manager', action: 'unfreeze', allowed: false },
  { role: 'manager', action: 'export', allowed: true },
  { role: 'manager', action: 'manage_users', allowed: false },

  { role: 'operator', action: 'import', allowed: true },
  { role: 'operator', action: 'overwrite', allowed: false },
  { role: 'operator', action: 'delete', allowed: false },
  { role: 'operator', action: 'check', allowed: true },
  { role: 'operator', action: 'fix', allowed: false },
  { role: 'operator', action: 'freeze', allowed: false },
  { role: 'operator', action: 'unfreeze', allowed: false },
  { role: 'operator', action: 'export', allowed: true },
  { role: 'operator', action: 'manage_users', allowed: false },

  { role: 'viewer', action: 'import', allowed: false },
  { role: 'viewer', action: 'overwrite', allowed: false },
  { role: 'viewer', action: 'delete', allowed: false },
  { role: 'viewer', action: 'check', allowed: true },
  { role: 'viewer', action: 'fix', allowed: false },
  { role: 'viewer', action: 'freeze', allowed: false },
  { role: 'viewer', action: 'unfreeze', allowed: false },
  { role: 'viewer', action: 'export', allowed: true },
  { role: 'viewer', action: 'manage_users', allowed: false },
];
