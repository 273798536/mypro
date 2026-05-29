export interface Athlete {
  id: string;
  name: string;
  grade: string;
  className: string;
}

export interface Event {
  id: string;
  name: string;
  type: 'field' | 'track';
  weight: number;
  unit: string;
}

export interface Score {
  id: string;
  athleteId: string;
  eventId: string;
  value: number;
  status: 'normal' | 'forfeit' | 'appeal';
  remark?: string;
}

export type RuleType = 'highest_single' | 'most_first' | 'best_second' | 'best_third' | 'custom';

export interface TieBreakRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  priority: number;
  enabled: boolean;
  params?: Record<string, any>;
}

export interface Appeal {
  id: string;
  athleteId: string;
  eventId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  adjustedScore?: number;
}

export type StepStatus = 'resolved' | 'tied' | 'stuck';

export interface RankingStep {
  stepNumber: number;
  ruleId: string;
  ruleName: string;
  status: StepStatus;
  tiedAthletes: string[];
  explanation: string;
  scores: Record<string, number>;
}

export interface RankingResult {
  athleteId: string;
  rank: number;
  totalScore: number;
  weightedScores: Record<string, number>;
  tieBreakRule?: string;
  steps: RankingStep[];
}

export interface CalculationSnapshot {
  id: string;
  timestamp: number;
  rules: TieBreakRule[];
  events: Event[];
  results: RankingResult[];
  reviewResults: Record<string, boolean>;
}

export interface PendingItem {
  id: string;
  type: 'forfeit' | 'appeal' | 'rule_conflict';
  title: string;
  description: string;
  athleteId?: string;
  eventId?: string;
  scoreId?: string;
  appealId?: string;
  reviewed: boolean;
}

export type PageType = 'dashboard' | 'import' | 'rules' | 'review' | 'trace';
