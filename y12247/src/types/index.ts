export interface Cargo {
  id: string;
  name: string;
  weight: number;
  volume: number;
  category: 'steel' | 'grain' | 'machinery' | 'chemical' | 'container';
  position?: { row: number; col: number };
  loaded: boolean;
}

export interface BallastTank {
  id: string;
  side: 'port' | 'starboard';
  capacity: number;
  current: number;
  operations: BallastOperation[];
}

export interface BallastOperation {
  id: string;
  timestamp: number;
  action: 'fill' | 'drain';
  amount: number;
  isRetroactive: boolean;
  affectedCargoIds: string[];
}

export interface ShipState {
  maxDisplacement: number;
  currentDisplacement: number;
  draftDepth: number;
  maxDraft: number;
  buoyancyMargin: number;
  centerOfGravity: { x: number; y: number };
  maxHeelAngle: number;
  currentHeelAngle: number;
}

export interface Violation {
  rule: 'overload' | 'gravity_shift' | 'ballast_omit' | 'draft_exceed';
  severity: 'warning' | 'danger' | 'critical';
  message: string;
  relatedCargoIds: string[];
  relatedBallastOpIds: string[];
}

export interface GravityTrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface VoyageReport {
  id: string;
  levelId: string;
  cargoManifest: Cargo[];
  ballastLog: BallastOperation[];
  gravityTrack: GravityTrackPoint[];
  violations: Violation[];
  score: number;
  submittedAt: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  shipMaxDisplacement: number;
  shipMaxDraft: number;
  shipMaxHeelAngle: number;
  shipBeamWidth: number;
  shipLength: number;
  gridRows: number;
  gridCols: number;
  cargoList: Cargo[];
  ballastTanks: BallastTank[];
  targetScore: number;
}

export type CargoCategory = Cargo['category'];

export const CARGO_COLORS: Record<CargoCategory, string> = {
  steel: '#7B8794',
  grain: '#D4A843',
  machinery: '#4A7C59',
  chemical: '#C75450',
  container: '#5B8DBE',
};

export const CARGO_LABELS: Record<CargoCategory, string> = {
  steel: '钢材',
  grain: '谷物',
  machinery: '机械',
  chemical: '化学品',
  container: '集装箱',
};

export const CATEGORY_ICONS: Record<CargoCategory, string> = {
  steel: '🔩',
  grain: '🌾',
  machinery: '⚙️',
  chemical: '🧪',
  container: '📦',
};
