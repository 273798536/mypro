import { Vector2 } from './Vector2';
import type { BallConfig, BallState } from '../types/physics';

export class Ball {
  public id: string;
  public position: Vector2;
  public velocity: Vector2;
  public radius: number;
  public color: string;
  public label: string;
  public mass: number;
  public trail: Vector2[] = [];
  private maxTrailLength = 20;

  constructor(config: BallConfig) {
    this.id = config.id;
    this.position = new Vector2(config.initialPosition.x, config.initialPosition.y);
    this.velocity = new Vector2(config.initialVelocity.x, config.initialVelocity.y);
    this.radius = config.radius;
    this.color = config.color;
    this.label = config.label;
    this.mass = config.mass;
  }

  update(dt: number, friction: number): void {
    this.position = this.position.add(this.velocity.mul(dt));
    this.velocity = this.velocity.mul(friction);
    
    this.trail.push(this.position.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  getState(): BallState {
    return {
      id: this.id,
      position: { x: this.position.x, y: this.position.y },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      radius: this.radius,
      color: this.color,
      label: this.label,
      mass: this.mass,
    };
  }

  reset(config: BallConfig): void {
    this.position = new Vector2(config.initialPosition.x, config.initialPosition.y);
    this.velocity = new Vector2(config.initialVelocity.x, config.initialVelocity.y);
    this.trail = [];
  }

  containsPoint(point: Vector2, tolerance: number = 5): boolean {
    const dist = Vector2.distance(this.position, point);
    return dist <= this.radius + tolerance;
  }

  getSpeed(): number {
    return this.velocity.length();
  }
}
