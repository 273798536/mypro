export type CaliberName = 'supply_chain_prepayment' | 'operating_expense';

export type TransactionStatus = 'normal' | 'single_caliber' | 'double_caliber';

export type JudgmentResult = 'matched' | 'unmatched';

export interface BankTransaction {
  id: string;
  bankSerialNo: string;
  amount: number;
  transactionDate: string;
  counterparty: string;
  originalRemark: string;
  supplementRemark?: string;
  status: TransactionStatus;
  approverName: string;
  approverNameChanged?: boolean;
  reviewed?: boolean;
}

export interface CalculationRule {
  id: string;
  transactionId: string;
  caliberName: CaliberName;
  caliberDisplayName: string;
  ruleName: string;
  ruleDetail: string;
  isHit: boolean;
  judgmentResult: JudgmentResult;
  isConflict?: boolean;
}

export interface RemarkRecord {
  id: string;
  transactionId: string;
  content: string;
  affectedJudgments: string[];
  createdAt: string;
  createdBy: string;
}

export interface HistoryRecord {
  id: string;
  transactionId: string;
  oldConclusion: string;
  newRemark: string;
  changeReason: string;
  changedBy: string;
  changedAt: string;
  oldMaterials?: string[];
}

export interface DashboardStats {
  totalAnomalies: number;
  totalAmount: number;
  doubleCaliberCount: number;
  singleCaliberCount: number;
  normalCount: number;
}

export interface CaliberDistribution {
  name: string;
  value: number;
  color: string;
}

export interface RenameGuideStep {
  id: number;
  title: string;
  description: string;
  checked: boolean;
}
