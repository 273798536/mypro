export interface ExperimentParams {
  ballMass: number;
  dropHeight: number;
  groundMaterial: string;
  restitution: number;
}

export interface ExperimentResult {
  id: string;
  timestamp: number;
  params: ExperimentParams;
  bounceHeight: number;
  calculatedRestitution: number;
  anomalies: string[];
  isAnomaly: boolean;
}

export interface PhysicsState {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isDragging: boolean;
  isPlaying: boolean;
  hasBounced: boolean;
}

export type AnomalyType =
  | 'ENERGY_INCREASE'
  | 'MATERIAL_OUT_OF_BOUNDS'
  | 'COLLISION_PENETRATION';

export interface Anomaly {
  type: AnomalyType;
  message: string;
  timestamp: number;
}

export interface GroundMaterial {
  id: string;
  name: string;
  restitution: number;
  color: string;
}

export interface FrameData {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  timestamp: number;
}

export const GROUND_MATERIALS: GroundMaterial[] = [
  { id: 'concrete', name: '水泥地面', restitution: 0.6, color: '#6b7280' },
  { id: 'wood', name: '木质地板', restitution: 0.7, color: '#92400e' },
  { id: 'rubber', name: '橡胶垫', restitution: 0.85, color: '#1f2937' },
  { id: 'glass', name: '玻璃', restitution: 0.9, color: '#e0f2fe' },
  { id: 'mud', name: '泥土地', restitution: 0.3, color: '#78350f' },
  { id: 'foam', name: '海绵', restitution: 0.1, color: '#fce7f3' },
];

export const GRAVITY = 9.81;
export const PIXELS_PER_METER = 50;
export const BALL_RADIUS = 20;
