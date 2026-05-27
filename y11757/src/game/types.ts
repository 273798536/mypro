export interface Vector2 {
  x: number;
  y: number;
}

export interface Charge {
  id: string;
  position: Vector2;
  magnitude: number;
  strength: number;
}

export interface Ball {
  position: Vector2;
  velocity: Vector2;
  charge: number;
  radius: number;
}

export type CellType = 'empty' | 'wall' | 'start' | 'end' | 'obstacle';

export interface Maze {
  width: number;
  height: number;
  cellSize: number;
  grid: CellType[][];
  startPos: Vector2;
  endPos: Vector2;
}

export interface Obstacle {
  position: Vector2;
  width: number;
  height: number;
  type: 'repel' | 'attract' | 'neutral';
}

export interface Level {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  maze: Maze;
  initialEnergy: number;
  timeLimit: number;
  ballCharge: number;
  ballInitialVelocity: Vector2;
  obstacles: Obstacle[];
}

export type GameState = 'idle' | 'placing' | 'previewing' | 'running' | 'paused' | 'success' | 'failed';

export type FailReason = 'collision' | 'timeout' | 'no_energy' | 'path_wall' | 'field_too_strong' | null;

export type ToolType = 'positive' | 'negative' | 'erase' | null;

export interface PreviewWarning {
  type: 'path_wall' | 'field_too_strong';
  message: string;
  position?: Vector2;
}

export interface ReplayFrame {
  time: number;
  ballPosition: Vector2;
  ballVelocity: Vector2;
}

export interface GameRecord {
  id: string;
  levelId: number;
  levelName: string;
  timestamp: number;
  duration: number;
  energyUsed: number;
  chargesPlaced: number;
  success: boolean;
  failReason: FailReason;
  score: number;
  stars: number;
  charges: Charge[];
  replayData: ReplayFrame[];
  maxFieldStrength: number;
}

export interface GameStats {
  totalGames: number;
  successRate: number;
  averageScore: number;
  totalStars: number;
}

export type ChargeTool = {
  type: 'positive' | 'negative';
  strength: number;
};
