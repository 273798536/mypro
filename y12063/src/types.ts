export interface ProjectCard {
  id: string;
  name: string;
  investmentAmount: number;
  expectedRevenue: number;
  duration: number;
  riskLevel: 'low' | 'medium' | 'high';
  category: string;
  revenuePerRound: number[];
}

export interface DebtConfig {
  totalDebt: number;
  interestRate: number;
  interestType: 'fixed' | 'floating';
  repaymentTerm: number;
  floatingRates?: number[];
}

export interface InterestPayment {
  round: number;
  amount: number;
  paid: boolean;
  overdue: boolean;
  penalty: number;
}

export interface GameEvent {
  id: string;
  type: 'interest_miss' | 'project_delay' | 'revenue_decline';
  round: number;
  description: string;
  impact: {
    penaltyAmount?: number;
    delayRounds?: number;
    revenueReduction?: number;
    projectId?: string;
  };
  resolved: boolean;
}

export interface ActiveProject {
  card: ProjectCard;
  startRound: number;
  delayRounds: number;
  revenueReduction: number;
  roundsCollected: number;
}

export interface RoundSnapshot {
  round: number;
  cash: number;
  debtBalance: number;
  totalInterestPaid: number;
  projectRevenue: number;
  netWorth: number;
  decisions: Decision[];
  events: GameEvent[];
  interestPayments: InterestPayment[];
}

export interface Decision {
  round: number;
  projectIds: string[];
  repaymentAmount: number;
  repaymentType: 'minimum' | 'partial' | 'full';
}

export interface GameConfig {
  projects: ProjectCard[];
  debt: DebtConfig;
  totalRounds: number;
  difficulty: 'easy' | 'normal' | 'hard';
  seed: number;
}

export interface GameState {
  config: GameConfig;
  currentRound: number;
  totalRounds: number;
  cash: number;
  debtBalance: number;
  interestPayments: InterestPayment[];
  activeProjects: ActiveProject[];
  completedProjects: ActiveProject[];
  events: GameEvent[];
  snapshots: RoundSnapshot[];
  isPaused: boolean;
  isGameOver: boolean;
  seed: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  deductions: Deduction[];
  totalInterestPaid: number;
  totalProjectRevenue: number;
  consecutiveNegativeRounds: number;
}

export interface Deduction {
  type: 'project_delay' | 'interest_miss' | 'revenue_decline' | 'bankruptcy';
  round: number;
  amount: number;
  description: string;
}

export interface CorrectionState {
  originalResult: GameState;
  modifiedDebt: DebtConfig;
  modifiedResult: GameState | null;
  differences: DifferenceItem[];
}

export interface DifferenceItem {
  field: string;
  label: string;
  originalValue: number;
  modifiedValue: number;
  delta: number;
}
