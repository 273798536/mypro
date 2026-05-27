export type LiquidityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type RiskType = 'CROSS_DAY_REDEMPTION' | 'LIQUIDITY_MISMATCH' | 'DUPLICATE_CASH_USAGE';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SourceInfo {
  sourceFile: string;
  sourceLine: number;
}

export interface Holding extends SourceInfo {
  id: string;
  fundCode: string;
  assetName: string;
  amount: number;
  liquidityLevel: LiquidityLevel;
  maturityDays: number;
  createdAt: string;
  isCorrected?: boolean;
}

export interface Redemption extends SourceInfo {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  requestDate: string;
  valueDate: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
  isCorrected?: boolean;
}

export interface CashPosition extends SourceInfo {
  id: string;
  tradeDate: string;
  availableCash: number;
  reservedCash: number;
  reservedBy: string;
  isCorrected?: boolean;
}

export interface RiskAlert {
  id: string;
  riskType: RiskType;
  description: string;
  severity: number;
  severityLevel: RiskSeverity;
  affectedIds: string[];
  sourceRef: string;
  detectedAt: string;
  isResolved: boolean;
}

export interface CorrectionTrace {
  id: string;
  recordType: 'HOLDING' | 'REDEMPTION' | 'CASH_POSITION';
  recordId: string;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  operator: string;
  reason: string;
  correctedAt: string;
}

export interface TradeCalendar {
  tradeDate: string;
  isTradingDay: boolean;
  holidayName?: string;
}

export interface PoolBlockData {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  value: number;
  layer: 'cash' | 'holding' | 'redemption';
  liquidityLevel?: LiquidityLevel;
  pressureLevel: number;
  isRisk: boolean;
  riskType?: RiskType;
  relatedId?: string;
}

export type SidebarTab = 'holdings' | 'redemptions' | 'cash' | 'risks';

export interface AppState {
  currentDate: string;
  dateRange: [string, string];
  holdings: Holding[];
  redemptions: Redemption[];
  cashPositions: CashPosition[];
  riskAlerts: RiskAlert[];
  correctionTraces: CorrectionTrace[];
  tradeCalendar: TradeCalendar[];
  selectedBlockId: string | null;
  selectedRiskType: RiskType | null;
  sidebarTab: SidebarTab;
  isPlaying: boolean;
  setCurrentDate: (date: string) => void;
  setDateRange: (range: [string, string]) => void;
  selectBlock: (id: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setIsPlaying: (playing: boolean) => void;
  applyCorrection: (trace: Omit<CorrectionTrace, 'id' | 'correctedAt'>) => void;
  recalculateRisks: () => void;
  resolveRisk: (riskId: string) => void;
}
