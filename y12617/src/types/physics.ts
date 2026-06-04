export interface Vector2 {
  x: number;
  y: number;
}

export interface BallConfig {
  id: string;
  radius: number;
  color: string;
  label: string;
  initialPosition: Vector2;
  initialVelocity: Vector2;
  mass: number;
}

export interface BallState {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  label: string;
  mass: number;
}

export type CollisionEventType = 'ball-ball' | 'ball-wall';

export interface CollisionEvent {
  id: string;
  timestamp: number;
  type: CollisionEventType;
  ballIds: string[];
  position: Vector2;
  isBoundaryError?: boolean;
  boundaryErrorMessage?: string;
}

export interface CanvasSnapshot {
  id: string;
  timePoint: number;
  timestamp: number;
  ballStates: BallState[];
  collisionEvents: CollisionEvent[];
}
