export interface Sample {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  grade: string;
  currentVersion: number;
  status: 'pending' | 'approved' | 'rejected' | 'leak_suspected';
  createdAt: string;
  updatedAt: string;
  versions: SampleVersion[];
  isLeakSuspected: boolean;
  leakReason?: string;
}

export interface SampleVersion {
  version: number;
  content: string;
  score: number;
  gradeResult: string;
  changedBy: 'algorithm' | 'human' | 'threshold';
  changeDescription: string;
  createdAt: string;
  diffHighlights: DiffHighlight[];
}

export interface DiffHighlight {
  type: 'added' | 'removed' | 'modified';
  field: string;
  oldValue: string;
  newValue: string;
}

export interface WithdrawalRecord {
  id: string;
  title: string;
  reason: string;
  affectedSampleCount: number;
  affectedSampleIds: string[];
  conclusionChange: string;
  impactLevel: 'high' | 'medium' | 'low';
  createdAt: string;
  createdBy: string;
  oralNotes?: string;
  status: 'active' | 'reverted' | 'resolved';
}

export interface ReplayReport {
  id: string;
  title: string;
  generatedAt: string;
  conclusionImpact: ConclusionImpact;
  grayscaleBreakdown: GrayscaleBreakdown;
  actionGuide: ActionGuide;
}

export interface ConclusionImpact {
  originalConclusion: string;
  newConclusion: string;
  changeReason: string;
  evidenceChain: EvidenceNode[];
}

export interface EvidenceNode {
  id: string;
  type: 'sample_change' | 'threshold_change' | 'human_review' | 'withdrawal';
  title: string;
  description: string;
  timestamp: string;
}

export interface GrayscaleBreakdown {
  sampleChange: {
    contribution: number;
    description: string;
    details: string[];
  };
  thresholdChange: {
    contribution: number;
    description: string;
    details: string[];
  };
  humanReview: {
    contribution: number;
    description: string;
    details: string[];
  };
}

export interface ActionGuide {
  toSupplement: ActionItem[];
  toApprove: ActionItem[];
  toConfirm: ActionItem[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedSampleId?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'sample_version' | 'withdrawal' | 'note' | 'status_change' | 'report';
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
  status?: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  targetType: 'sample' | 'withdrawal' | 'report';
  targetId: string;
}

export interface DashboardStats {
  totalSamples: number;
  totalWithdrawals: number;
  pendingCount: number;
  leakSuspectedCount: number;
  trend: {
    samples: number;
    withdrawals: number;
    pending: number;
    leaks: number;
  };
}
