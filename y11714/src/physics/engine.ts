import { Ball } from './ball';
import { CollisionDetector, calculateRestitution } from './collision';
import { Anomaly, FrameData, PIXELS_PER_METER } from '../types';

export interface PhysicsEngineState {
  isRunning: boolean;
  isPaused: boolean;
  timeScale: number;
  currentFrame: number;
}

export class PhysicsEngine {
  private ball: Ball;
  private collisionDetector: CollisionDetector;
  private groundY: number;
  private restitution: number;
  private dropHeight: number = 0;
  private bounceHeight: number = 0;
  private maxHeightAfterBounce: number = 0;
  private hasBounced: boolean = false;
  private initialEnergy: number = 0;
  private anomalies: Anomaly[] = [];
  private frameHistory: FrameData[] = [];
  private maxFrameHistory: number = 1000;
  private state: PhysicsEngineState;
  private lastTimestamp: number = 0;
  private animationFrameId: number | null = null;
  private onUpdate: (() => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(ball: Ball, groundY: number, restitution: number) {
    this.ball = ball;
    this.groundY = groundY;
    this.restitution = restitution;
    this.collisionDetector = new CollisionDetector(ball, groundY);
    this.state = {
      isRunning: false,
      isPaused: false,
      timeScale: 1,
      currentFrame: 0,
    };
  }

  setOnUpdate(callback: () => void): void {
    this.onUpdate = callback;
  }

  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  setRestitution(restitution: number): void {
    this.restitution = Math.max(0, Math.min(1, restitution));
  }

  setGroundY(groundY: number): void {
    this.groundY = groundY;
    this.collisionDetector = new CollisionDetector(this.ball, groundY);
  }

  setTimeScale(scale: number): void {
    this.state.timeScale = Math.max(0.1, Math.min(1, scale));
  }

  getTimeScale(): number {
    return this.state.timeScale;
  }

  setDropHeight(height: number): void {
    this.dropHeight = height;
    this.initialEnergy = this.ball.mass * 9.81 * height;
    this.collisionDetector.setInitialEnergy(this.initialEnergy);
  }

  getDropHeight(): number {
    return this.dropHeight;
  }

  getBounceHeight(): number {
    return this.bounceHeight;
  }

  getCalculatedRestitution(): number {
    return calculateRestitution(this.dropHeight, this.bounceHeight);
  }

  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  hasAnomalies(): boolean {
    return this.anomalies.length > 0;
  }

  getFrameHistory(): FrameData[] {
    return [...this.frameHistory];
  }

  clearFrameHistory(): void {
    this.frameHistory = [];
  }

  getState(): PhysicsEngineState {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  isPaused(): boolean {
    return this.state.isPaused;
  }

  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.currentFrame = 0;
    this.hasBounced = false;
    this.maxHeightAfterBounce = 0;
    this.bounceHeight = 0;
    this.anomalies = [];
    this.frameHistory = [];
    this.lastTimestamp = performance.now();

    this.dropHeight = this.ball.getHeight(this.groundY);
    this.initialEnergy = this.ball.mass * 9.81 * this.dropHeight;
    this.collisionDetector.setInitialEnergy(this.initialEnergy);

    this.animationLoop();
  }

  pause(): void {
    this.state.isPaused = true;
  }

  resume(): void {
    if (!this.state.isRunning) return;
    this.state.isPaused = false;
    this.lastTimestamp = performance.now();
    this.animationLoop();
  }

  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset(): void {
    this.stop();
    this.state.currentFrame = 0;
    this.hasBounced = false;
    this.maxHeightAfterBounce = 0;
    this.bounceHeight = 0;
    this.anomalies = [];
    this.frameHistory = [];
  }

  stepFrame(): void {
    const dt = 1 / 60;
    this.updatePhysics(dt);
  }

  private animationLoop(): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      const rawDt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const dt = rawDt * this.state.timeScale;
      const clampedDt = Math.min(dt, 1 / 30);

      this.updatePhysics(clampedDt);
      this.state.currentFrame++;

      if (this.onUpdate) {
        this.onUpdate();
      }

      const totalEnergy = this.ball.getKineticEnergy() + this.ball.getPotentialEnergy(this.groundY);
      const isSettled = this.hasBounced && 
        Math.abs(this.ball.vy) < 0.1 && 
        this.ball.getHeight(this.groundY) < 0.01;

      if (isSettled) {
        this.bounceHeight = this.maxHeightAfterBounce;
        this.state.isRunning = false;
        if (this.onComplete) {
          this.onComplete();
        }
      } else {
        this.animationLoop();
      }
    });
  }

  private updatePhysics(dt: number): void {
    const prevY = this.ball.y;
    const prevHeight = this.ball.getHeight(this.groundY);

    const { bounced } = this.ball.update(dt, this.groundY, this.restitution);

    if (bounced && !this.hasBounced) {
      this.hasBounced = true;
    }

    if (this.hasBounced) {
      const currentHeight = this.ball.getHeight(this.groundY);
      if (currentHeight > this.maxHeightAfterBounce) {
        this.maxHeightAfterBounce = currentHeight;
      }
    }

    const totalEnergy = this.ball.getKineticEnergy() + this.ball.getPotentialEnergy(this.groundY);
    const frameAnomalies = this.collisionDetector.detectAndRecordAnomalies(
      prevY,
      totalEnergy,
      dt
    );

    if (frameAnomalies.length > 0) {
      this.anomalies.push(...frameAnomalies);
    }

    if (this.frameHistory.length < this.maxFrameHistory) {
      this.frameHistory.push({
        position: { x: this.ball.x, y: this.ball.y },
        velocity: { x: this.ball.vx, y: this.ball.vy },
        timestamp: performance.now(),
      });
    }
  }

  getBall(): Ball {
    return this.ball;
  }

  getGroundY(): number {
    return this.groundY;
  }
}
