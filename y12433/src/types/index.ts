export interface Influencer {
  id: string;
  name: string;
  platform: string;
  followerCount: number;
  category: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  influencerId: string;
  influencerName: string;
  startDate: string;
  endDate: string;
  baseFee: number;
  commissionRate: number;
  returnDeductionRate: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface LiveSession {
  id: string;
  sessionNo: string;
  influencerId: string;
  influencerName: string;
  contractId: string;
  startTime: string;
  endTime: string;
  platform: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  gmv: number;
  orderCount: number;
}

export interface Order {
  id: string;
  orderNo: string;
  liveSessionId: string;
  sessionNo: string;
  influencerId: string;
  influencerName: string;
  productId: string;
  productName: string;
  amount: number;
  commission: number;
  commissionRate: number;
  orderTime: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'returned' | 'refunded';
  returnTime?: string;
  returnSessionId?: string;
  returnSessionNo?: string;
  isCrossSessionReturn: boolean;
  attributed: boolean;
  attributionEvidence?: string;
}

export interface Settlement {
  id: string;
  settlementNo: string;
  contractId: string;
  contractNo: string;
  influencerId: string;
  influencerName: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'reviewing' | 'approved' | 'paid' | 'disputed';
  baseFee: number;
  totalCommission: number;
  totalReturnDeduction: number;
  crossSessionReturnDeduction: number;
  duplicateCommissionDeduction: number;
  otherDeductions: number;
  netPayable: number;
  orderCount: number;
  returnCount: number;
  issues: SettlementIssue[];
  createdAt: string;
  updatedAt: string;
  versions: SettlementVersion[];
}

export interface SettlementVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  baseFee: number;
  totalCommission: number;
  totalReturnDeduction: number;
  crossSessionReturnDeduction: number;
  duplicateCommissionDeduction: number;
  otherDeductions: number;
  netPayable: number;
  changeLog: string;
}

export interface SettlementIssue {
  id: string;
  type: 'cross_session_return' | 'duplicate_commission' | 'missing_evidence' | 'discrepancy' | 'other';
  severity: 'warning' | 'error' | 'info';
  status: 'open' | 'resolved' | 'waived';
  description: string;
  evidenceRef: string;
  evidenceType: 'order' | 'contract' | 'session' | 'payment' | 'other';
  evidenceId?: string;
  evidenceNo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  id: string;
  requestNo: string;
  settlementId: string;
  settlementNo: string;
  contractId: string;
  contractNo: string;
  influencerId: string;
  influencerName: string;
  amount: number;
  previousPaid: number;
  currentRequest: number;
  status: 'draft' | 'reviewing' | 'approved' | 'paid' | 'rejected';
  paymentMethod: string;
  bankAccount?: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  attachments: Attachment[];
}

export interface DisputeNote {
  id: string;
  settlementId: string;
  issueId: string;
  author: string;
  content: string;
  createdAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export type TabKey = 'contracts' | 'orders' | 'settlement' | 'payment' | 'dispute';
