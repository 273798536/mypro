export type SeriesStatus = 'active' | 'completed' | 'pending';

export interface Series {
  id: string;
  name: string;
  episodes: number;
  productionCost: number;
  authorization: string;
  status: SeriesStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Cost {
  id: string;
  seriesId: string;
  channel: string;
  costDate: string;
  amount: number;
  isDelayed: boolean;
  remark: string;
  createdAt: string;
}

export interface Flow {
  id: string;
  seriesId: string;
  flowDate: string;
  amount: number;
  userSource: string;
  orderNo: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  seriesId: string;
  channel: string;
  paymentDate: string;
  amount: number;
  isSplit: boolean;
  splitFrom?: string;
  remark: string;
  createdAt: string;
}

export type CalculationStatus = 'normal' | 'exception' | 'pending' | 'outdated';

export interface Calculation {
  id: string;
  seriesId: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  totalFlow: number;
  totalPayment: number;
  recoveryRate: number;
  profit: number;
  status: CalculationStatus;
  version: number;
  calculatedAt: string;
  costIds: string[];
  flowIds: string[];
  paymentIds: string[];
}

export interface ChangeLog {
  id: string;
  seriesId: string;
  calculationId?: string;
  operator: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeReason: string;
  affectedCalculations: string[];
  createdAt: string;
}

export type ExceptionType = 'cost_delay' | 'payment_split' | 'account_mismatch' | 'data_missing';
export type ExceptionSeverity = 'high' | 'medium' | 'low';
export type ExceptionStatus = 'open' | 'processing' | 'resolved';

export interface Exception {
  id: string;
  calculationId: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  triggerSource: string;
  triggerSourceId: string;
  blockPoint: string;
  nextStep: string;
  remark?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  cost_delay: '消耗延迟',
  payment_split: '回款拆分',
  account_mismatch: '账号串剧',
  data_missing: '数据缺失',
};

export const EXCEPTION_SEVERITY_LABELS: Record<ExceptionSeverity, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

export const EXCEPTION_STATUS_LABELS: Record<ExceptionStatus, string> = {
  open: '待处理',
  processing: '处理中',
  resolved: '已解决',
};

export const CALCULATION_STATUS_LABELS: Record<CalculationStatus, string> = {
  normal: '正常',
  exception: '有异常',
  pending: '待重算',
  outdated: '已过时',
};

export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  active: '投放中',
  completed: '已完结',
  pending: '待投放',
};

export const CHANNELS = ['抖音', '快手', '微信视频号', '小红书', 'B站'];
