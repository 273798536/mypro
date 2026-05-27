export type CardType = 'invoice' | 'customer' | 'payment';

export type CardStatus = 'normal' | 'warning' | 'danger' | 'unknown';

export type GamePhase = 'idle' | 'playing' | 'submitted' | 'ended';

export type AnomalyType = 'duplicate_invoice' | 'mismatch_chain' | 'delayed_payment' | 'amount_anomaly';

export type Severity = 'high' | 'medium' | 'low';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Role = 'seller' | 'buyer';

export type PaymentMethod = 'bank' | 'cash' | 'transfer';

export type ActionType = 'select' | 'deselect' | 'check_label' | 'uncheck_label' | 'submit';

export interface BaseCard {
  id: string;
  type: CardType;
  isSelected: boolean;
  status: CardStatus;
}

export interface InvoiceCardData {
  invoiceNo: string;
  seller: string;
  buyer: string;
  amount: number;
  date: string;
  taxRate: number;
  remark?: string;
}

export interface InvoiceCard extends BaseCard {
  type: 'invoice';
  data: InvoiceCardData;
}

export interface CustomerCardData {
  companyName: string;
  taxNo: string;
  role: Role;
  industry?: string;
}

export interface CustomerCard extends BaseCard {
  type: 'customer';
  data: CustomerCardData;
}

export interface PaymentCardData {
  paymentId: string;
  amount: number;
  date: string;
  relatedInvoice: string;
  method: PaymentMethod;
}

export interface PaymentCard extends BaseCard {
  type: 'payment';
  data: PaymentCardData;
}

export type Card = InvoiceCard | CustomerCard | PaymentCard;

export interface RiskLabel {
  id: string;
  name: string;
  description: string;
  isChecked: boolean;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  cardIds: string[];
  description: string;
  scoreDelta: number;
  isDetected: boolean;
  isWronglyMarked: boolean;
}

export interface OperationLog {
  timestamp: number;
  action: ActionType;
  cardId?: string;
  labelId?: string;
  details?: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  timeLimit: number;
  difficulty: Difficulty;
  cardCount: {
    invoice: number;
    customer: number;
    payment: number;
  };
  anomalies: {
    duplicateInvoices: number;
    mismatchChains: number;
    delayedPayments: number;
  };
}

export interface GameRecord {
  id: string;
  levelId: string;
  levelName: string;
  score: number;
  grade: string;
  completedAt: number;
  totalAnomalies: number;
  detectedAnomalies: number;
  wrongMarks: number;
  operationLog: OperationLog[];
  anomalies: Anomaly[];
  cards: Card[];
}

export interface GameState {
  gameId: string;
  levelId: string;
  timeLeft: number;
  phase: GamePhase;
  cards: Card[];
  selectedCardIds: string[];
  riskLabels: RiskLabel[];
  score: number;
  anomalies: Anomaly[];
  operationLog: OperationLog[];
  startedAt: number;
}

export interface ScoringResult {
  totalScore: number;
  correctDetections: number;
  wrongMarks: number;
  missedAnomalies: number;
  timeBonus: number;
  grade: string;
}
