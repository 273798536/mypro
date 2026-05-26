export interface CorrectionEntry {
  id: string;
  oldValue: number;
  newValue: number;
  reason: string;
  operator: string;
  correctedAt: string;
}

export interface CashFlowRecord {
  id: string;
  currency: string;
  amount: number;
  flowDate: string;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  customerName: string;
  sourceDoc: string;
  note: string;
  exchangeRate: number;
  plannedRate: number;
  direction: 'inflow' | 'outflow';
  corrections: CorrectionEntry[];
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface Anomaly {
  type: 'rate_gap' | 'date_misalignment' | 'negative_flow';
  severity: 'warning' | 'critical';
  description: string;
  details: Record<string, string | number>;
}

export interface FilterState {
  selectedCurrencies: string[];
  riskRange: [number, number];
  dateRange: [string, string];
}

export interface ViewMode {
  mode: 'terrain' | 'heatmap' | 'table';
}

export interface AppState {
  records: CashFlowRecord[];
  filters: FilterState;
  selectedRecordId: string | null;
  viewMode: ViewMode['mode'];
  showCorrections: boolean;
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'] as const;
export type Currency = typeof CURRENCIES[number];

export const RISK_LEVELS = [1, 2, 3, 4, 5] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
};

export const RISK_COLORS: Record<number, string> = {
  1: '#10b981',
  2: '#34d399',
  3: '#fbbf24',
  4: '#f97316',
  5: '#ef4444',
};

export const ANOMALY_COLORS = {
  rate_gap: '#dc2626',
  date_misalignment: '#a855f7',
  negative_flow: '#6366f1',
};
