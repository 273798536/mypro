export enum MemberStatus {
  active = 'active',
  at_risk = 'at_risk',
  silent = 'silent',
  churned = 'churned',
  new = 'new',
  reactivated = 'reactivated',
}

export interface DataBatch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  missingMonths: string[];
  memberCount: number;
  isCurrent: boolean;
}

export interface TransitionCell {
  fromStatus: MemberStatus;
  toStatus: MemberStatus;
  count: number;
  probability: number;
  isAbnormal: boolean;
  abnormalReason?: string;
  memberIds: string[];
}

export interface TransitionMatrix {
  batchId: string;
  period: string;
  cells: TransitionCell[];
  statusOrder: MemberStatus[];
}

export interface MemberStatusRecord {
  id: string;
  memberId: string;
  status: MemberStatus;
  startDate: string;
  endDate: string;
  source: 'auto' | 'manual' | 'customer_service';
  remark?: string;
  activities: string[];
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  registerDate: string;
  totalOrders: number;
  totalAmount: number;
  lastActiveDate: string;
  currentStatus: MemberStatus;
  statusHistory: MemberStatusRecord[];
  behaviorTags: string[];
  systemTags: string[];
  tagConflict: boolean;
  customerServiceNotes: CustomerServiceNote[];
  churnProbability: number;
  predictedStatus3m: MemberStatus;
}

export interface CustomerServiceNote {
  id: string;
  memberId: string;
  date: string;
  operator: string;
  content: string;
  type: 'complaint' | 'consult' | 'feedback' | 'other';
  attachmentUrl?: string;
  relatedStatus?: MemberStatus;
}

export interface Activity {
  id: string;
  name: string;
  type: 'promotion' | 'version_update' | 'event' | 'campaign';
  startDate: string;
  endDate: string;
  overlapWith?: string[];
  version?: string;
}

export interface StatusJumpReview {
  id: string;
  memberId: string;
  fromStatus: MemberStatus;
  toStatus: MemberStatus;
  jumpDate: string;
  isApproved: boolean | null;
  reviewer?: string;
  reviewDate?: string;
  reviewComment?: string;
  evidence: string[];
  plainLanguageExplanation?: string;
}

export interface MarkovPrediction {
  batchId: string;
  predictionDate: string;
  horizonMonths: number;
  initialDistribution: Record<MemberStatus, number>;
  transitionMatrix: number[][];
  predictions: Array<{
    month: number;
    distribution: Record<MemberStatus, number>;
    confidenceInterval: {
      lower: Record<MemberStatus, number>;
      upper: Record<MemberStatus, number>;
    };
  }>;
}

export interface InterventionSuggestion {
  id: string;
  name: string;
  description: string;
  targetStatuses: MemberStatus[];
  expectedChurnReduction: number;
  cost: 'low' | 'medium' | 'high';
  applicableMemberIds: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  type: 'text' | 'chart' | 'table';
  data?: unknown;
}

export interface ExportReport {
  id: string;
  batchId: string;
  generatedAt: string;
  generatedBy: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  jumpExplanations: string[];
}
