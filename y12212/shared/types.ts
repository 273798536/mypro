export type UserType = 'resident' | 'commercial' | 'industrial' | 'temporary';
export type UserCategory = 'single' | 'combined';
export type BillStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'exception';
export type ExceptionType = 'reading_gap' | 'discount_expired' | 'allocation_error';
export type AllocationMethod = 'population' | 'area' | 'equal';
export type ImportType = 'profile' | 'price' | 'payment';
export type UserRole = 'reviewer' | 'supervisor' | 'admin';

export const USER_TYPE_LABELS: Record<UserType, string> = {
  resident: '居民',
  commercial: '商业',
  industrial: '工业',
  temporary: '临时',
};

export const USER_CATEGORY_LABELS: Record<UserCategory, string> = {
  single: '单户',
  combined: '合表',
};

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  approved: '已通过',
  rejected: '已驳回',
  exception: '异常',
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  reading_gap: '抄表缺口',
  discount_expired: '减免过期',
  allocation_error: '分摊不均',
};

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  population: '按人口',
  area: '按面积',
  equal: '均分',
};

export interface UserProfile {
  id: string;
  user_no: string;
  name: string;
  user_type: UserType;
  user_category: UserCategory;
  combined_group_id: string | null;
  population: number | null;
  area: number | null;
  address: string;
  contact: string | null;
  discount_rate: number | null;
  discount_expire_date: string | null;
  created_at: string;
}

export interface TierPrice {
  id: string;
  user_type: UserType;
  tier: number;
  min_usage: number;
  max_usage: number;
  price_per_ton: number;
  effective_date: string;
}

export interface PaymentRecord {
  id: string;
  user_no: string;
  billing_month: string;
  last_reading: number;
  current_reading: number;
  usage: number;
  paid_amount: number;
  payment_date: string | null;
  source_file: string | null;
  import_task_id: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  user_no: string;
  billing_month: string;
  user_type: UserType;
  user_category: UserCategory;
  total_usage: number;
  calculated_amount: number;
  status: BillStatus;
  combined_group_id: string | null;
  allocation_method: AllocationMethod | null;
  review_comments: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  import_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillDetail {
  id: string;
  bill_id: string;
  tier: number;
  usage: number;
  price_per_ton: number;
  amount: number;
}

export interface BillException {
  id: string;
  bill_id: string;
  type: ExceptionType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  human_readable: string;
  resolved: number;
  resolution: string | null;
  created_at: string;
}

export interface ImportTask {
  id: string;
  type: ImportType;
  file_name: string;
  original_file_path: string;
  total_records: number;
  success_count: number;
  error_count: number;
  error_details: string | null;
  status: 'processing' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
}

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface DashboardStats {
  pending_count: number;
  exception_count: number;
  approved_count: number;
  rejected_count: number;
  today_processed: number;
}

export interface TrendItem {
  date: string;
  approved: number;
  rejected: number;
  exception: number;
}

export interface WarningItem {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  days_remaining?: number;
  created_at: string;
}
