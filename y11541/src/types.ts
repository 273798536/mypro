export type UserRole = 'entry' | 'review' | 'manager' | 'readonly';

export type DirtyType = 
  | 'missing_field'
  | 'cross_day'
  | 'name_change'
  | 'amount_conflict'
  | 'quantity_conflict'
  | 'duplicate';

export type RecordStatus = 
  | 'pending'
  | 'dirty'
  | 'fixed'
  | 'approved'
  | 'rejected'
  | 'imported';

export type ImportSource = 'material_id' | 'audit_result' | 'cost_daily' | 'history_zip' | 'supplement';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface MaterialRecord {
  id: string;
  source: ImportSource;
  source_line?: number;
  material_id: string;
  material_name: string;
  platform: string;
  record_date: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  audit_status?: string;
  audit_reason?: string;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  request_id?: string;
  raw_data: string;
}

export interface DirtyRecord {
  id: string;
  record_id: string;
  dirty_type: DirtyType;
  field_name?: string;
  expected_value?: string;
  actual_value?: string;
  suggestion: string;
  fixed: boolean;
  fixed_by?: string;
  fixed_at?: string;
  created_at: string;
}

export interface ChangeHistory {
  id: string;
  record_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  changed_at: string;
  change_reason: string;
}

export interface MaterialAlias {
  id: string;
  canonical_id: string;
  alias_name: string;
  platform: string;
  created_at: string;
}

export interface PermissionConfig {
  [role: string]: {
    visibleFields: string[];
    allowedActions: string[];
  };
}

export interface ImportResult {
  total: number;
  success: number;
  dirty: number;
  duplicate: number;
  recordIds: string[];
}

export interface ReportSummary {
  totalRecords: number;
  dirtyRecords: number;
  fixedRecords: number;
  importedRecords: number;
  byPlatform: Record<string, number>;
  byDirtyType: Record<string, number>;
  failedList: Array<{
    source_line: number;
    material_id: string;
    material_name: string;
    dirty_types: string[];
    suggestions: string[];
  }>;
}
