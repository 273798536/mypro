export interface FundHolding {
  id: string
  portfolioId: string
  fundCode: string
  fundName: string
  weight: number
  industryId: string
  industryName: string
  isProhibited: boolean
}

export interface IndustryClassification {
  id: string
  name: string
  maxWeight: number
}

export interface IndustryViolation {
  industryId: string
  industryName: string
  currentWeight: number
  maxWeight: number
  overage: number
}

export interface WeightCheckResult {
  passed: boolean
  totalWeight: number
  detail: string
}

export interface IndustryCheckResult {
  passed: boolean
  violations: IndustryViolation[]
  detail: string
}

export interface ProhibitedCheckResult {
  passed: boolean
  prohibitedFunds: string[]
  detail: string
}

export interface ConstraintCheckResult {
  id: string
  weightCheck: WeightCheckResult
  industryCheck: IndustryCheckResult
  prohibitedCheck: ProhibitedCheckResult
  checkedAt: string
}

export interface AuditRecord {
  id: string
  portfolioId: string
  operation: string
  field: string
  oldValue: string
  newValue: string
  reason: string
  constraintCheckId: string
  createdAt: string
}

export interface RiskBudget {
  id: string
  portfolioId: string
  volatilityLimit: number
  drawdownLimit: number
  industryConcentration: number
}

export interface RiskScore {
  concentration: number
  volatility: number
  drawdown: number
  liquidity: number
  compliance: number
  overall: number
  explanations: Record<string, string>
}

export interface Report {
  id: string
  portfolioId: string
  version: string
  generatedAt: string
  constraintChecks: ConstraintCheckResult[]
  riskScore: RiskScore
  holdings: FundHolding[]
  riskBudget: RiskBudget
}

export interface Portfolio {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface SamplePortfolio {
  id: string
  name: string
  description: string
  holdings: Omit<FundHolding, 'id' | 'portfolioId'>[]
  riskBudget: Omit<RiskBudget, 'id' | 'portfolioId'>
}
