import type { Frame, GameEvent, Level, Planet, RunResult } from './types';
import { GAME_CONSTANTS } from './types';

const { DT, G, ESCAPE_RADIUS, THRUST_ACCEL, FUEL_CONSUMPTION, LOW_FUEL_THRESHOLD } =
  GAME_CONSTANTS;

export interface EngineSnapshot {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  thrust: number;
  angle: number;
}

export class OrbitEngine {
  private level: Level;
  private state: EngineSnapshot;
  private frames: Frame[] = [];
  private events: GameEvent[] = [];
  private planetsInfluence: Map<string, boolean> = new Map();
  private lowFuelEmitted = false;
  private ended = false;
  private result: RunResult | null = null;
  private failureReason?: string;
  private enterSpeedMap: Map<string, number> = new Map();

  constructor(level: Level) {
    this.level = level;
    this.state = {
      t: 0,
      x: level.start.x,
      y: level.start.y,
      vx: level.start.vx,
      vy: level.start.vy,
      fuel: level.fuelBudget,
      thrust: 0,
      angle: Math.atan2(level.start.vy, level.start.vx),
    };
    for (const p of level.planets) {
      this.planetsInfluence.set(p.id, false);
    }
    this.pushFrame();
  }

  snapshot(): EngineSnapshot {
    return { ...this.state };
  }

  setControls(thrust: number, angle: number) {
    this.state.thrust = Math.max(0, Math.min(1, thrust));
    this.state.angle = angle;
  }

  step() {
    if (this.ended) return;

    const { thrust, angle } = this.state;
    let ax = 0;
    let ay = 0;

    for (const planet of this.level.planets) {
      const dx = planet.x - this.state.x;
      const dy = planet.y - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < planet.radius) {
        this.end('collision', `探测器与「${planet.name}」发生碰撞，任务失败`);
        return;
      }
      const a = (G * planet.mass) / (dist * dist);
      ax += (a * dx) / dist;
      ay += (a * dy) / dist;
      this.checkInfluence(planet, dist);
    }

    if (thrust > 0 && this.state.fuel > 0) {
      ax += Math.cos(angle) * THRUST_ACCEL * thrust;
      ay += Math.sin(angle) * THRUST_ACCEL * thrust;
      this.state.fuel -= FUEL_CONSUMPTION * thrust * DT;
      if (this.state.fuel < 0) this.state.fuel = 0;
    }

    if (!this.lowFuelEmitted && this.state.fuel > 0 && this.state.fuel / this.level.fuelBudget <= LOW_FUEL_THRESHOLD) {
      this.lowFuelEmitted = true;
      this.emitEvent('fuel-low', '燃料余量低于 15%，请注意节流');
    }

    if (this.state.fuel <= 0 && thrust > 0) {
      this.end('fuel-out', '燃料耗尽，探测器失去推进能力');
      return;
    }

    this.state.vx += ax * DT;
    this.state.vy += ay * DT;
    this.state.x += this.state.vx * DT;
    this.state.y += this.state.vy * DT;
    this.state.t += DT;

    const distFromOrigin = Math.sqrt(this.state.x * this.state.x + this.state.y * this.state.y);
    if (distFromOrigin > ESCAPE_RADIUS) {
      this.end('escape', '探测器飞出引力边界，发生轨道逃逸');
      return;
    }

    if (this.state.t >= this.level.timeLimit) {
      this.end('timeout', `任务超时（超过 ${this.level.timeLimit} 秒）`);
      return;
    }

    const target = this.level.target;
    const dtx = target.centerX - this.state.x;
    const dty = target.centerY - this.state.y;
    const distTarget = Math.sqrt(dtx * dtx + dty * dty);
    const speed = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy);
    if (
      Math.abs(distTarget - target.radius) <= target.tolerance &&
      speed >= target.requiredSpeedRange[0] &&
      speed <= target.requiredSpeedRange[1]
    ) {
      this.emitEvent('target-reached', `成功进入目标轨道，速度 ${speed.toFixed(1)}`);
      this.end('success', '成功进入目标轨道');
      return;
    }

    this.pushFrame();
  }

  private checkInfluence(planet: Planet, dist: number) {
    const wasInside = this.planetsInfluence.get(planet.id);
    const nowInside = dist <= planet.influence;
    if (!wasInside && nowInside) {
      this.planetsInfluence.set(planet.id, true);
      this.enterSpeedMap.set(planet.id, Math.sqrt(this.state.vx ** 2 + this.state.vy ** 2));
      this.emitEvent('enter-influence', `进入「${planet.name}」引力影响范围`, planet.name);
    } else if (wasInside && !nowInside) {
      this.planetsInfluence.set(planet.id, false);
      this.emitEvent('leave-influence', `离开「${planet.name}」引力影响范围`, planet.name);
    }
  }

  private pushFrame() {
    let nearest: Planet | null = null;
    let nearestDist = Infinity;
    for (const p of this.level.planets) {
      const dx = p.x - this.state.x;
      const dy = p.y - this.state.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    this.frames.push({
      t: this.state.t,
      x: this.state.x,
      y: this.state.y,
      vx: this.state.vx,
      vy: this.state.vy,
      fuel: this.state.fuel,
      thrust: this.state.thrust,
      angle: this.state.angle,
      nearestPlanet: nearest?.id ?? null,
      altitude: nearest ? nearestDist - nearest.radius : 0,
    });
  }

  private emitEvent(type: GameEvent['type'], message: string, planet?: string) {
    this.events.push({ t: this.state.t, type, message, planet });
  }

  private end(result: RunResult, reason: string) {
    this.ended = true;
    this.result = result;
    if (result !== 'success') {
      this.failureReason = reason;
    }
  }

  isEnded() {
    return this.ended;
  }
  getResult(): RunResult | null {
    return this.result;
  }
  getFailureReason() {
    return this.failureReason;
  }
  getFrames(): Frame[] {
    return this.frames;
  }
  getEvents(): GameEvent[] {
    return this.events;
  }
  getEnterSpeedMap() {
    return this.enterSpeedMap;
  }
}
