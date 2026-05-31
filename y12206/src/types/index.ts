export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  status: "active" | "resigned";
  resignDate?: string;
  baseInfo: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  totalSalary: number;
  isBackpay: boolean;
  backpayMonths?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RatioVersion {
  id: string;
  personalRatio: number;
  companyRatio: number;
  effectiveMonth: string;
  expireMonth?: string;
  isDelayed: boolean;
  delayedMonths?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ValidationType = "conflict" | "warning" | "info";
export type ValidationCategory =
  | "resign_not_stop"
  | "backpay_cross_month"
  | "ratio_version_mismatch"
  | "data_inconsistency"
  | "ratio_delayed";

export interface ValidationResult {
  id: string;
  employeeId: string;
  month: string;
  type: ValidationType;
  category: ValidationCategory;
  description: string;
  sources: {
    archive?: string;
    salary?: string;
    ratio?: string;
  };
  timeline: Array<{
    time: string;
    event: string;
    source: string;
  }>;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  entityType: "employee" | "salary" | "ratio";
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: string;
  relatedValidationId?: string;
}

export type SourceType = "archive" | "salary" | "ratio";

export interface ValidationSummary {
  total: number;
  conflicts: number;
  warnings: number;
  info: number;
  resolved: number;
}
