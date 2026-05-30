import type { GameParams, TrajectoryPoint, Vector2D, Target, GameError } from '@/types';
import {
  calculateLorentzForce,
  calculateAcceleration,
  updateVelocity,
  updatePosition,
  calculateKineticEnergy,
  checkDirectionError,
  checkEnergyOverlimit,
  checkMassInvalid,
  getExpectedForceDirection,
  MAX_ENERGY_THRESHOLD
} from './lorentzForce';

export const SIMULATION_DT = 0.016;
export const MAX_SIMULATION_STEPS = 500;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;

export interface SimulationResult {
  trajectory: TrajectoryPoint[];
  finalPosition: Vector2D;
  errors: GameError[];
  maxEnergy: number;
  hitTarget: Target | null;
}

export function simulateTrajectory(
  params: GameParams,
  targets: Target[],
  startPosition: Vector2D = { x: 50, y: CANVAS_HEIGHT / 2 }
): SimulationResult {
  const errors: GameError[] = [];
  const trajectory: TrajectoryPoint[] = [];
  let maxEnergy = 0;
  
  if (checkMassInvalid(params.projectile.mass)) {
    errors.push({
      type: 'mass',
      severity: 'error',
      message: `弹丸质量 ${params.projectile.mass}kg 超出有效范围 (0.1-100kg)`,
      nextStep: '请联系物理竞赛社核心成员核实材料参数，确认弹丸规格后重新设置',
      physicsFormula: 'm ∈ [0.1, 100] kg'
    });
  }
  
  const initialVelocity: Vector2D = {
    x: params.current.magnitude * 2,
    y: 0
  };
  
  const expectedDirection = getExpectedForceDirection(
    params.current.direction,
    params.magneticField.direction
  );
  
  let position = { ...startPosition };
  let velocity = { ...initialVelocity };
  let hitTarget: Target | null = null;
  
  for (let step = 0; step < MAX_SIMULATION_STEPS; step++) {
    const force = calculateLorentzForce(
      velocity,
      params.projectile.charge,
      params.magneticField
    );
    
    const acceleration = calculateAcceleration(force, Math.max(params.projectile.mass, 0.001));
    const energy = calculateKineticEnergy(params.projectile.mass, velocity);
    
    if (energy > maxEnergy) maxEnergy = energy;
    
    if (step === 10 && checkDirectionError(force, expectedDirection)) {
      errors.push({
        type: 'direction',
        severity: 'pending',
        message: `洛伦兹力方向待确认：预期${expectedDirection}，实际计算方向相反`,
        nextStep: '请使用左手定则复核：伸开左手，使拇指与其余四个手指垂直，并且都与手掌在同一平面内；让磁感线从掌心进入，并使四指指向正电荷运动的方向',
        physicsFormula: 'F = q(v × B)'
      });
    }
    
    if (checkEnergyOverlimit(energy)) {
      errors.push({
        type: 'energy',
        severity: 'warning',
        message: `能量超限：当前动能 ${energy.toFixed(1)}J 超过安全阈值 ${MAX_ENERGY_THRESHOLD}J`,
        nextStep: '请联系物理竞赛社器材管理员核实电源参数，降低电流或磁场强度',
        physicsFormula: 'Ek = ½mv²'
      });
      break;
    }
    
    trajectory.push({
      x: position.x,
      y: position.y,
      velocity: { ...velocity },
      force: { ...force },
      timestamp: step * SIMULATION_DT,
      energy
    });
    
    for (const target of targets) {
      const dx = position.x - target.x;
      const dy = position.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < target.radius) {
        hitTarget = target;
        break;
      }
    }
    if (hitTarget) break;
    
    velocity = updateVelocity(velocity, acceleration, SIMULATION_DT);
    position = updatePosition(position, velocity, SIMULATION_DT);
    
    if (position.x < 0 || position.x > CANVAS_WIDTH ||
        position.y < 0 || position.y > CANVAS_HEIGHT) {
      break;
    }
  }
  
  return {
    trajectory,
    finalPosition: position,
    errors,
    maxEnergy,
    hitTarget
  };
}

export function calculateScore(
  hitTarget: Target | null,
  errors: GameError[],
  maxEnergy: number
): number {
  let score = 0;
  
  if (hitTarget) {
    score += hitTarget.points;
  }
  
  const errorPenalty = errors.reduce((sum, err) => {
    if (err.severity === 'error') return sum + 200;
    if (err.severity === 'warning') return sum + 100;
    if (err.severity === 'pending') return sum + 50;
    return sum;
  }, 0);
  
  score = Math.max(0, score - errorPenalty);
  
  if (maxEnergy < 1000) score += 50;
  else if (maxEnergy < 2000) score += 25;
  
  return score;
}

export function calculateDeviation(
  finalPosition: Vector2D,
  targets: Target[]
): number {
  if (targets.length === 0) return Infinity;
  
  let minDeviation = Infinity;
  for (const target of targets) {
    const dx = finalPosition.x - target.x;
    const dy = finalPosition.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    minDeviation = Math.min(minDeviation, distance);
  }
  
  return minDeviation;
}
