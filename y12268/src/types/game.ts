export type Difficulty = 'easy' | 'normal' | 'hard'
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended'
export type ProjectType = 'infrastructure' | 'welfare' | 'debt_optimize'
export type EvidenceCategory = 'interest' | 'delay' | 'revenue' | 'consistency'

export interface DifficultyConfig {
  initialTreasury: number
  initialDebt: number
  baseInterestRate: number
  initialSatisfaction: number
  satisfactionDecay: number
  maxTurns: number
  baseRevenue: number
}

export interface ProjectCard {
  id: string
  name: string
  type: ProjectType
  cost: number
  expectedReturn: number
  delayProbability: number
  riskLevel: 'low' | 'medium' | 'high'
  description: string
  accepted: boolean
  delayed: boolean
  actualReturn: number
  turnDrawn: number
  completedTurn: number | null
}

export interface DelayRecord {
  projectId: string
  projectName: string
  originalTurn: number
  delayedToTurn: number
  reason: string
  penaltyAmount: number
}

export interface RevenueVersion {
  version: number
  turnNumber: number
  oldValue: number
  newValue: number
  changeReason: string
}

export interface EvidenceEntry {
  id: string
  turnNumber: number
  category: EvidenceCategory
  description: string
  calculationDetail: string
  consistencyFlag: boolean
  satisfactionSupplement: number | null
  timestamp: number
}

export interface TurnData {
  turnNumber: number
  treasuryBefore: number
  debtBefore: number
  satisfactionBefore: number
  infraInvestment: number
  interestPayment: number
  welfareSpending: number
  treasuryAfter: number
  debtAfter: number
  satisfactionAfter: number
  revenue: number
  interestAccrued: number
  comprehensiveRate: number
  projects: ProjectCard[]
  acceptedProjectIds: string[]
}

export interface TurnSnapshot {
  turnNumber: number
  treasury: number
  debt: number
  satisfaction: number
  comprehensiveRate: number
  decisions: {
    infraInvestment: number
    interestPayment: number
    welfareSpending: number
    acceptedProjects: string[]
  }
  results: {
    revenue: number
    interestAccrued: number
    satisfactionChange: number
  }
}

export interface DeductionItem {
  category: string
  amount: number
  reason: string
  evidenceRef: string
  calculationMethodology: string
}

export interface Settlement {
  totalScore: number
  debtHealthScore: number
  satisfactionScore: number
  projectScore: number
  efficiencyScore: number
  deductions: DeductionItem[]
  consistencyWarnings: EvidenceEntry[]
}

export interface GameState {
  id: string
  difficulty: Difficulty
  config: DifficultyConfig
  currentTurn: number
  treasury: number
  debt: number
  satisfaction: number
  comprehensiveRate: number
  totalInfraInvestment: number
  status: GameStatus
  turns: TurnData[]
  snapshots: TurnSnapshot[]
  projects: ProjectCard[]
  currentProjects: ProjectCard[]
  evidenceLog: EvidenceEntry[]
  revenueVersions: RevenueVersion[]
  delayRecords: DelayRecord[]
  settlement: Settlement | null
  infraInvestment: number
  interestPayment: number
  welfareSpending: number
  acceptedProjectIds: string[]
}
