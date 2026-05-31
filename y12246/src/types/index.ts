export interface BondCard {
  id: string;
  name: string;
  code: string;
  faceValue: number;
  couponRate: number;
  maturityDate: string;
  interestPaymentDates: string[];
  putOptionDate?: string;
  issuer: string;
  rating: string;
}

export type CashFlowType = 'coupon' | 'principal' | 'put';
export type CashFlowStatus = 'pending' | 'confirmed' | 'delayed' | 'default' | 'put_option' | 'missed';

export interface CashFlowCell {
  id: string;
  date: string;
  originalDate: string;
  type: CashFlowType;
  expectedAmount: number;
  actualAmount?: number;
  status: CashFlowStatus;
  isSelected: boolean;
  period: number;
}

export type EventType = 'interest_delay' | 'put_notice' | 'default_warning' | 'payment_confirmation' | 'revoke_default' | 'put_deadline';

export interface AnnouncementEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  content: string;
  correctAction: string;
  options: string[];
  correctOptionIndex: number;
  relatedCashFlowId?: string;
}

export type TraceType = 'user_action' | 'conflict' | 'system_judge' | 'event_trigger';
export type TraceSource = 'bond_card' | 'cash_flow' | 'announcement' | 'system';

export interface OperationTrace {
  id: string;
  timestamp: string;
  type: TraceType;
  content: string;
  source: TraceSource;
  isCorrect?: boolean;
  details?: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  bondCard: BondCard;
  initialCashFlows: CashFlowCell[];
  events: AnnouncementEvent[];
  timelineDates: string[];
  targetScore: number;
  learningPoints: string[];
}

export interface GameState {
  currentLevelId: string | null;
  currentDateIndex: number;
  cashFlows: CashFlowCell[];
  activeEvent: AnnouncementEvent | null;
  traces: OperationTrace[];
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
  selectedAnswers: Record<string, number>;
  replayMode: boolean;
  replayStep: number;
}

export interface GameActions {
  startLevel: (levelId: string) => void;
  advanceTimeline: () => void;
  selectCashFlow: (cellId: string) => void;
  handleEventAnswer: (eventId: string, optionIndex: number) => void;
  endGame: () => void;
  resetGame: () => void;
  togglePause: () => void;
  startReplay: () => void;
  replayNextStep: () => void;
  replayPrevStep: () => void;
}
