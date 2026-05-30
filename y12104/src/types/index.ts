export interface Contestant {
  id: string;
  name: string;
  team: string;
  category: string;
}

export interface ScoreItem {
  id: string;
  category: string;
  points: number;
  weight: number;
}

export interface Score {
  id: string;
  contestantId: string;
  totalScore: number;
  items: ScoreItem[];
  calculatedAt: string;
}

export interface Submission {
  id: string;
  contestantId: string;
  submitTime: string;
  fileHash?: string;
}

export type TieBreakRuleType = 'submissionTime' | 'specificCategory' | 'headToHead' | 'manual';

export interface TieBreakRule {
  order: number;
  rule: TieBreakRuleType;
  category?: string;
  ascending: boolean;
}

export interface ScoreWeight {
  category: string;
  weight: number;
}

export interface RankingRule {
  id: string;
  name: string;
  description: string;
  scoreWeights: ScoreWeight[];
  tieBreakRules: TieBreakRule[];
}

export type TieBreakStatus = 'pending' | 'confirmed' | 'manual';

export interface RankingEntry {
  id: string;
  contestantId: string;
  rank: number;
  score: number;
  isTied: boolean;
  tieBreakStatus?: TieBreakStatus;
  tieBreakNotes?: string;
}

export interface RankingVersion {
  id: string;
  version: number;
  ruleConfig: RankingRule;
  createdAt: string;
  createdBy: string;
  changeReason: string;
  changeType: 'initial' | 'score' | 'rule' | 'appeal' | 'manual';
  rankingSnapshot: RankingEntry[];
}

export type ChangeActionType = 'score_update' | 'rule_change' | 'tiebreak_confirm' | 'appeal_approved' | 'appeal_rejected' | 'manual_edit';

export interface ChangeLog {
  id: string;
  versionId: string;
  actionType: ChangeActionType;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  operator: string;
  timestamp: string;
  description: string;
  affectedContestants: string[];
}

export type AppealStatus = 'pending' | 'approved' | 'rejected';
export type AppealType = 'score' | 'rule' | 'tiebreak';

export interface Appeal {
  id: string;
  contestantId: string;
  type: AppealType;
  reason: string;
  status: AppealStatus;
  reviewer?: string;
  reviewerNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface TieBreakGroup {
  id: string;
  score: number;
  contestantIds: string[];
  status: 'pending' | 'confirmed';
  confirmedBy?: string;
  confirmedAt?: string;
  appliedRule?: TieBreakRule;
}

export interface AppState {
  contestants: Contestant[];
  scores: Score[];
  submissions: Submission[];
  currentRanking: RankingEntry[];
  rankingVersions: RankingVersion[];
  currentRule: RankingRule;
  availableRules: RankingRule[];
  pendingTieBreaks: TieBreakGroup[];
  appeals: Appeal[];
  changeLogs: ChangeLog[];
  currentOperator: string;
}
