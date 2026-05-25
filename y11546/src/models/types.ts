export type DataSourceType = 'material_list' | 'logistics_receipt' | 'on_site_borrow' | 'inventory_diff';

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export type TaskStatus = 'pending' | 'processing' | 'success' | 'retry_waiting' | 'manual_waiting' | 'permanent_failed';

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
    total_borrowed: number;
    total_lost: number;
    total_diffs: number;
  };
  failed_records: FailedRecord[];
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
}
