import { Anomaly, AnomalyType } from '../types';
import { Ball } from './ball';

export class CollisionDetector {
  private ball: Ball;
  private groundY: number;
  private initialEnergy: number = 0;
  private anomalies: Anomaly[] = [];

  constructor(ball: Ball, groundY: number) {
    this.ball = ball;
    this.groundY = groundY;
  }

  setInitialEnergy(energy: number): void {
    this.initialEnergy = energy;
  }

  checkContinuousCollision(prevY: number, dt: number): boolean {
    const ballBottom = this.ball.y + this.ball.radius;
    const prevBallBottom = prevY + this.ball.radius;

    if (prevBallBottom <= this.groundY && ballBottom > this.groundY) {
      return true;
    }

    return false;
  }

  checkPenetration(): number {
    const ballBottom = this.ball.y + this.ball.radius;
    const penetration = ballBottom - this.groundY;
    return Math.max(0, penetration);
  }

  checkEnergyIncrease(currentEnergy: number): boolean {
    if (this.initialEnergy > 0 && currentEnergy > this.initialEnergy * 1.01) {
      return true;
    }
    return false;
  }

  checkBounceHeight(initialHeight: number, bounceHeight: number): boolean {
    return bounceHeight > initialHeight * 1.01;
  }

  detectAndRecordAnomalies(
    prevY: number,
    currentEnergy: number,
    dt: number
  ): Anomaly[] {
    this.anomalies = [];

    const penetration = this.checkPenetration();
    if (penetration > this.ball.radius * 0.5) {
      this.anomalies.push({
        type: 'COLLISION_PENETRATION',
        message: `碰撞穿透检测: 穿透深度 ${penetration.toFixed(2)}px，超过阈值`,
        timestamp: Date.now(),
      });
    }

    if (this.checkEnergyIncrease(currentEnergy)) {
      const increasePercent = ((currentEnergy - this.initialEnergy) / this.initialEnergy * 100).toFixed(2);
      this.anomalies.push({
        type: 'ENERGY_INCREASE',
        message: `能量异常增加: 初始能量 ${this.initialEnergy.toFixed(4)}J，当前能量 ${currentEnergy.toFixed(4)}J，增加 ${increasePercent}%`,
        timestamp: Date.now(),
      });
    }

    return this.anomalies;
  }

  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  clearAnomalies(): void {
    this.anomalies = [];
  }

  resolvePenetration(): void {
    const penetration = this.checkPenetration();
    if (penetration > 0) {
      this.ball.y -= penetration;
      if (this.ball.vy > 0) {
        this.ball.vy = 0;
      }
    }
  }
}

export function calculateRestitution(dropHeight: number, bounceHeight: number): number {
  if (dropHeight <= 0) return 0;
  const ratio = bounceHeight / dropHeight;
  return Math.sqrt(Math.max(0, Math.min(1, ratio)));
}

export function calculateBounceHeight(dropHeight: number, restitution: number): number {
  return dropHeight * restitution * restitution;
}
