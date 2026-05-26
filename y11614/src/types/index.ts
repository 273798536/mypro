export interface Employee {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  position: string;
  joinDate: string;
  idCard: string;
  socialSecurityBase: number;
  housingFundBase: number;
  status: 'active' | 'resigned' | 'pending';
}

export interface SalaryItem {
  id: string;
  employeeId: string;
  taxPeriod: string;
  baseSalary: number;
  performanceBonus: number;
  overtimePay: number;
  allowance: number;
  otherIncome: number;
  socialSecurityPersonal: number;
  housingFundPersonal: number;
  otherDeduction: number;
}

export type DeductionType = 
  | 'children_education' 
  | 'continuing_education' 
  | 'housing_loan' 
  | 'housing_rent' 
  | 'elderly_care' 
  | 'infant_care';

export interface SpecialDeduction {
  id: string;
  employeeId: string;
  deductionType: DeductionType;
  amount: number;
  effectiveMonth: string;
  expiryMonth?: string;
  source: 'employee_declaration' | 'system_import' | 'manual_adjustment';
  isLocked: boolean;
}

export interface BackPay {
  id: string;
  employeeId: string;
  originalPeriod: string;
  targetPeriod: string;
  amount: number;
  reason: string;
  taxAdjustment: number;
  isCrossPeriod: boolean;
}

export interface Resignation {
  id: string;
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  socialSecurityEndMonth: string;
  housingFundEndMonth: string;
  hasSeverancePay: boolean;
  severancePayAmount: number;
}

export interface TaxPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in_progress' | 'locked' | 'completed';
  isLocked: boolean;
  totalEmployees: number;
  totalSalary: number;
  totalTax: number;
  exceptionCount: number;
}

export interface SalaryCalculation {
  id: string;
  employeeId: string;
  taxPeriodId: string;
  grossSalary: number;
  socialSecurityPersonal: number;
  housingFundPersonal: number;
  specialDeductionTotal: number;
  taxableIncome: number;
  taxAmount: number;
  backPayAdjustment: number;
  otherDeduction: number;
  netSalary: number;
  calculationStatus: 'pending' | 'calculated' | 'recalculated';
  calculationTime?: string;
}

export type ExceptionType = 
  | 'deduction_mismatch' 
  | 'backpay_cross_period' 
  | 'social_security_after_resign' 
  | 'data_inconsistency' 
  | 'calculation_error';

export type ExceptionSeverity = 'error' | 'warning' | 'info';

export type ExceptionStatus = 'pending' | 'resolved' | 'ignored';

export interface Exception {
  id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  employeeId: string;
  employeeName?: string;
  taxPeriod: string;
  description: string;
  source: string;
  affectedFields: string[];
  suggestion: string;
  status: ExceptionStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'import' 
  | 'calculate' 
  | 'lock' 
  | 'unlock'
  | 'resolve_exception';

export type EntityType = 
  | 'employee' 
  | 'salary' 
  | 'deduction' 
  | 'backpay' 
  | 'calculation'
  | 'tax_period'
  | 'exception';

export interface AuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  operator: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  source: string;
  remark?: string;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  quickDeduction: number;
}

export interface ReportConfig {
  type: 'salary_detail' | 'tax_summary' | 'exception' | 'full';
  taxPeriod: string;
  format: 'excel' | 'pdf';
  includeDetails: boolean;
  includeExceptions: boolean;
}

export interface DashboardStats {
  currentPeriod: string;
  totalEmployees: number;
  totalSalary: number;
  totalTax: number;
  exceptionCount: number;
  pendingExceptions: number;
  calculationProgress: number;
  periodStatus: string;
}

export interface ImportFile {
  id: string;
  name: string;
  type: 'employee' | 'salary' | 'deduction' | 'backpay' | 'resignation' | 'tax_preview';
  status: 'uploading' | 'uploaded' | 'validating' | 'valid' | 'invalid';
  rowCount: number;
  errorCount: number;
  uploadedAt: string;
  errors?: string[];
}
