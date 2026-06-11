export type WarningStatus = 'confirmed' | 'pending' | 'returned';

export type RiskLevel = 'high' | 'medium' | 'low';

export type StatusTab = 'all' | WarningStatus;

export interface Remark {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isTemporaryLedger: boolean;
  judgmentImpact?: string;
}

export interface Screenshot {
  id: string;
  url: string;
  name: string;
  uploadAt: string;
  uploadBy: string;
}

export interface WarningRecord {
  id: string;
  billNo: string;
  customerName: string;
  amount: number;
  isNegativeCorrection: boolean;
  status: WarningStatus;
  riskType: string;
  riskLevel: RiskLevel;
  createDate: string;
  confirmDate?: string;
  operator?: string;
  remarks: Remark[];
  screenshots: Screenshot[];
  description: string;
}

export interface FilterCriteria {
  billNo?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
  isNegativeCorrection?: boolean | null;
  riskLevel?: RiskLevel | '';
  status?: WarningStatus | '';
}

export const STATUS_LABEL: Record<WarningStatus, string> = {
  confirmed: '已确认',
  pending: '待补件',
  returned: '退回',
};

export const STATUS_TAB_LABEL: Record<StatusTab, string> = {
  all: '全部',
  confirmed: '已确认',
  pending: '待补件',
  returned: '退回',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};
