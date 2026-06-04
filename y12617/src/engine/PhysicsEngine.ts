import { Ball } from './Ball';
import { CollisionDetector } from './CollisionDetector';
import { generateId, ID_PREFIXES } from '../utils/id';
import type { BallConfig, BallState, CanvasSnapshot, CollisionEvent } from '../types/physics';

export class PhysicsEngine {
  private balls: Ball[] = [];
  private width: number;
  private height: number;
  private gravity: number = 0;
  private friction: number = 0.999;
  private collisionDetector: CollisionDetector;
  private collisionEvents: CollisionEvent[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.collisionDetector = new CollisionDetector(width, height);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.collisionDetector.setSize(width, height);
  }

  loadBalls(configs: BallConfig[]): void {
    this.balls = configs.map(config => new Ball(config));
    this.collisionEvents = [];
  }

  update(dt: number): CollisionEvent[] {
    const effectiveDt = Math.min(dt, 0.033);
    
    for (const ball of this.balls) {
      ball.velocity.y += this.gravity * effectiveDt;
      ball.update(effectiveDt, this.friction);
    }

    const newEvents = this.collisionDetector.detectAllCollisions(this.balls);
    this.collisionEvents.push(...newEvents);
    
    return newEvents;
  }

  forceBoundaryError(ballId: string): CollisionEvent | null {
    const event = this.collisionDetector.forceBoundaryError(ballId, this.balls);
    if (event) {
      this.collisionEvents.push(event);
    }
    return event;
  }

  getBalls(): Ball[] {
    return this.balls;
  }

  getBallStates(): BallState[] {
    return this.balls.map(ball => ball.getState());
  }

  getBallById(id: string): Ball | undefined {
    return this.balls.find(b => b.id === id);
  }

  getCollisionEvents(): CollisionEvent[] {
    return [...this.collisionEvents];
  }

  takeSnapshot(timePoint: number): CanvasSnapshot {
    return {
      id: generateId(ID_PREFIXES.SNAPSHOT),
      timePoint,
      timestamp: Date.now(),
      ballStates: this.getBallStates(),
      collisionEvents: [...this.collisionEvents],
    };
  }

  restoreFromSnapshot(snapshot: CanvasSnapshot): void {
    for (const ballState of snapshot.ballStates) {
      const ball = this.balls.find(b => b.id === ballState.id);
      if (ball) {
        ball.position.x = ballState.position.x;
        ball.position.y = ballState.position.y;
        ball.velocity.x = ballState.velocity.x;
        ball.velocity.y = ballState.velocity.y;
        ball.trail = [];
      }
    }
    this.collisionEvents = [...snapshot.collisionEvents];
  }

  reset(configs: BallConfig[]): void {
    this.balls = configs.map(config => new Ball(config));
    this.collisionEvents = [];
  }

  clearCollisionEvents(): void {
    this.collisionEvents = [];
  }

  getBallAtPoint(x: number, y: number, tolerance: number = 5): Ball | undefined {
    const point = { x, y } as any;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      if (this.balls[i].containsPoint(point, tolerance)) {
        return this.balls[i];
      }
    }
    return undefined;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);
    
    this.drawGrid(ctx);
    
    for (const ball of this.balls) {
      this.drawBallTrail(ctx, ball);
    }
    
    for (const ball of this.balls) {
      this.drawBall(ctx, ball);
    }
    
    this.drawBoundary(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(22, 93, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  private drawBallTrail(ctx: CanvasRenderingContext2D, ball: Ball): void {
    if (ball.trail.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
    
    for (let i = 1; i < ball.trail.length; i++) {
      const alpha = i / ball.trail.length;
      ctx.strokeStyle = ball.color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
      ctx.lineWidth = ball.radius * 0.3 * alpha;
      ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
    }
    ctx.stroke();
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
    const gradient = ctx.createRadialGradient(
      ball.position.x - ball.radius * 0.3,
      ball.position.y - ball.radius * 0.3,
      0,
      ball.position.x,
      ball.position.y,
      ball.radius
    );
    gradient.addColorStop(0, this.lightenColor(ball.color, 40));
    gradient.addColorStop(1, ball.color);
    
    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = this.darkenColor(ball.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (ball.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.label, ball.position.x, ball.position.y);
    }
  }

  private drawBoundary(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#165DFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, this.width - 3, this.height - 3);
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }
}
