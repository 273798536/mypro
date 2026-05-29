export enum CellType {
  EMPTY = 'empty',
  COMMERCIAL = 'commercial',
  RESIDENTIAL = 'residential',
  ROAD = 'road',
  GREEN = 'green',
  FIRE_STATION = 'fire_station'
}

export interface Position {
  row: number;
  col: number;
}

export interface CategoryScore {
  score: number;
  maxScore: number;
}

export interface DeductionItem {
  category: 'traffic' | 'fire' | 'green';
  reason: string;
  points: number;
  description: string;
  positions: Position[];
}

export interface ScoreResult {
  totalScore: number;
  maxScore: number;
  trafficScore: CategoryScore;
  fireScore: CategoryScore;
  greenScore: CategoryScore;
  deductions: DeductionItem[];
}

export interface GameState {
  grid: CellType[][];
  isRunning: boolean;
  isPaused: boolean;
  phase: 'planning' | 'simulating' | 'result';
  score: ScoreResult | null;
  selectedTool: CellType | null;
  firstRunGrid: CellType[][] | null;
  firstRunScore: ScoreResult | null;
  showComparison: boolean;
}

export const GRID_SIZE = 10;

export const CELL_CONFIG: Record<CellType, { emoji: string; name: string; color: string; bgColor: string }> = {
  [CellType.EMPTY]: { emoji: '', name: '空地', color: '#e5e7eb', bgColor: 'bg-gray-100' },
  [CellType.COMMERCIAL]: { emoji: '🏬', name: '商业区', color: '#f97316', bgColor: 'bg-orange-400' },
  [CellType.RESIDENTIAL]: { emoji: '🏠', name: '住宅区', color: '#3b82f6', bgColor: 'bg-blue-500' },
  [CellType.ROAD]: { emoji: '🛣️', name: '道路', color: '#6b7280', bgColor: 'bg-gray-500' },
  [CellType.GREEN]: { emoji: '🌲', name: '绿地', color: '#22c55e', bgColor: 'bg-green-500' },
  [CellType.FIRE_STATION]: { emoji: '🚒', name: '消防站', color: '#ef4444', bgColor: 'bg-red-500' }
};
