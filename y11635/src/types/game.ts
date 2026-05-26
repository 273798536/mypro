export type WeatherType = 'sunny' | 'lightRain' | 'moderateRain' | 'heavyRain' | 'storm';

export interface WeatherCard {
  type: WeatherType;
  name: string;
  inflowMin: number;
  inflowMax: number;
  color: string;
  icon: string;
  description: string;
}

export interface RoundLog {
  round: number;
  weather: WeatherCard;
  upstreamInflow: number;
  gateOpening: number;
  storageChange: number;
  reservoirLevel: number;
  warningIssued: boolean;
  scoreChange: number;
  events: string[];
  downstreamFlow: number;
}

export interface ScoreDetail {
  round: number;
  category: string;
  score: number;
  reason: string;
  icon: string;
}

export interface GameState {
  round: number;
  maxRounds: number;
  weather: WeatherCard;
  upstreamInflow: number;
  reservoirLevel: number;
  gateOpening: number;
  warningIssued: boolean;
  riskScore: number;
  totalScore: number;
  status: 'playing' | 'success' | 'failed';
  failureReason: string | null;
  logs: RoundLog[];
  scoreDetails: ScoreDetail[];
  consecutiveOverflow: number;
  started: boolean;
}

export interface WaterLevelPoint {
  round: number;
  level: number;
  safeLine: number;
  warningLine: number;
  overflowLine: number;
}

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export interface ExportData {
  title: string;
  waterLevelData: WaterLevelPoint[];
  scoreDetails: ScoreDetail[];
  logs: RoundLog[];
  totalScore: number;
  status: 'playing' | 'success' | 'failed';
  failureReason: string | null;
}
