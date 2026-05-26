export interface Point {
  x: number;
  y: number;
}

export type ElementType = 'robot' | 'ball' | 'obstacle' | 'passPoint';

export interface TacticsElement {
  id: string;
  type: ElementType;
  position: Point;
  label: string;
  color: string;
}

export interface Robot extends TacticsElement {
  type: 'robot';
  energy: number;
  maxEnergy: number;
  speed: number;
}

export interface Ball extends TacticsElement {
  type: 'ball';
  ownerId?: string;
}

export interface Obstacle extends TacticsElement {
  type: 'obstacle';
  width: number;
  height: number;
}

export interface PassPoint extends TacticsElement {
  type: 'passPoint';
  targetId?: string;
}

export interface Path {
  id: string;
  elementId: string;
  points: Point[];
  color: string;
}

export type AnyElement = Robot | Ball | Obstacle | PassPoint;

export interface TacticsScheme {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elements: AnyElement[];
  paths: Path[];
  fieldSize: { width: number; height: number };
  lastScore?: number;
}

export type SimulationEventType =
  | 'collision'
  | 'energy_empty'
  | 'out_of_bounds'
  | 'pass_complete'
  | 'pass_fail'
  | 'robot_reach_target';

export interface SimulationEvent {
  id: string;
  time: number;
  type: SimulationEventType;
  message: string;
  position: Point;
  elementIds: string[];
}

export interface SimulationFrame {
  time: number;
  elementStates: {
    elementId: string;
    position: Point;
    energy?: number;
  }[];
}

export interface SimulationResult {
  schemeId: string;
  startTime: number;
  endTime: number;
  events: SimulationEvent[];
  score: {
    obstacle: number;
    pass: number;
    energy: number;
    completion: number;
    total: number;
  };
  frames: SimulationFrame[];
  finalElementStates: {
    elementId: string;
    position: Point;
    energy?: number;
  }[];
}

export type ToolType =
  | 'select'
  | 'robot'
  | 'ball'
  | 'obstacle'
  | 'passPoint'
  | 'path'
  | 'delete';

export const FIELD_WIDTH = 900;
export const FIELD_HEIGHT = 600;
export const ROBOT_RADIUS = 20;
export const BALL_RADIUS = 12;
export const ENERGY_PER_UNIT = 0.5;
export const ROBOT_SPEED = 80;
export const BALL_SPEED = 150;
