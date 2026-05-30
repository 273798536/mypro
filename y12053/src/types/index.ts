export type LevelId = 'level1' | 'level2' | 'level3'

export interface Stock {
  code: string
  name: string
  price: number
  admissionFee: number
  minShares: number
  maxShares: number
  deadline: string
  winningRate: number
  winningNumbers: string[]
  missingColumn?: 'quantity' | 'price' | 'fee' | null
}

export type ProblemType = 'insufficient_funds' | 'refund_delay' | 'missing_column' | 'fee_delay'
export type ProblemSeverity = 'error' | 'warning' | 'info'

export interface ProblemConfig {
  type: ProblemType
  title: string
  description: string
  sourceMaterial: string
  severity: ProblemSeverity
  delayDays?: number
}

export interface Level {
  id: LevelId
  title: string
  description: string
  difficulty: '入门' | '进阶' | '挑战'
  learningPoints: string[]
  initialFunds: number
  stocks: Stock[]
  problems: ProblemConfig[]
}

export interface Funds {
  available: number
  frozen: number
  pendingRefund: number
  total: number
}

export interface Subscription {
  id: string
  stockCode: string
  stockName: string
  shares: number
  amount: number
  fee: number
  status: 'pending' | 'frozen' | 'won' | 'lost' | 'cancelled'
  lotteryNumber: string
  wonShares?: number
  refundAmount?: number
  refundDelayed?: boolean
  feeDelayed?: boolean
}

export type GamePhase = 'select' | 'subscribe' | 'frozen' | 'lottery' | 'settlement' | 'review'

export type EventType = 'subscribe' | 'freeze' | 'lottery_publish' | 'win' | 'lose' | 'refund' | 'fee_charge' | 'problem' | 'refund_delay' | 'fee_delay' | 'insufficient_funds'

export interface TimelineEvent {
  id: string
  type: EventType
  title: string
  description: string
  day: number
  problem?: ProblemConfig
}

export type FundFlowType = 'freeze' | 'unfreeze' | 'refund' | 'charge' | 'fee' | 'deduction'

export interface FundFlow {
  id: string
  type: FundFlowType
  amount: number
  balance: number
  description: string
  day: number
  delayed: boolean
  expectedDay: number
  actualDay: number
  sourceMaterial?: string
}
