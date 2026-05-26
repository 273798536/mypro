export type CashflowType = 'salary' | 'rent' | 'loan' | 'receivable' | 'tax' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type FlowDirection = 'in' | 'out';
export type StressLevel = 'none' | 'warning' | 'danger';
export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export interface Revision {
  id: string;
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

export interface CashflowEntry {
  id: string;
  type: CashflowType;
  direction: FlowDirection;
  amount: number;
  date: string;
  description: string;
  priority: Priority;
  source: string;
  isDelayed: boolean;
  delayNote?: string;
  originalDate?: string;
  createdAt: string;
  updatedAt: string;
  revisionHistory: Revision[];
}

export interface AccountSettings {
  initialBalance: number;
  safetyLine: number;
  currency: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  entries: CashflowEntry[];
  settings: AccountSettings;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
}

export interface DailySummary {
  date: string;
  inflow: number;
  outflow: number;
  netAmount: number;
  balance: number;
  entries: CashflowEntry[];
  stressLevel: StressLevel;
  stressReasons: string[];
}

export interface ImportResult {
  imported: number;
  ignored: number;
  overwritten: number;
  errors: string[];
}

export interface FilterState {
  types: CashflowType[];
  priorities: Priority[];
  showDelayedOnly: boolean;
}

export const CASHFLOW_TYPE_LABELS: Record<CashflowType, string> = {
  salary: '工资',
  rent: '房租',
  loan: '贷款',
  receivable: '回款',
  tax: '税费',
  other: '其他'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const TYPE_COLORS: Record<CashflowType, string> = {
  salary: 'bg-purple-100 text-purple-800 border-purple-200',
  rent: 'bg-orange-100 text-orange-800 border-orange-200',
  loan: 'bg-blue-100 text-blue-800 border-blue-200',
  receivable: 'bg-green-100 text-green-800 border-green-200',
  tax: 'bg-pink-100 text-pink-800 border-pink-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200'
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800'
};

export const STRESS_COLORS: Record<StressLevel, string> = {
  none: 'border-transparent',
  warning: 'border-yellow-400 bg-yellow-50',
  danger: 'border-red-500 bg-red-50'
};