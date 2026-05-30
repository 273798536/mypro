import { Particle, OreBlock, CollisionRecord, GameError } from '@/utils/types';
import { PHYSICS_CONSTANTS, SCORE_CONFIG } from '@/utils/constants';
import {
  calculateMomentum,
  calculateTotalMomentum,
  calculateMomentumError,
  checkMomentumDirection,
  isMomentumConserved,
  calculateElasticCollision2D,
} from './momentum';
import {
  calculateKineticEnergy,
  calculateTotalEnergy,
  checkEnergyConservation,
  checkEnergyOverLimit,
} from './energy';

export interface ValidationResult {
  collisionRecord: CollisionRecord;
  errors: GameError[];
  scoreChange: number;
  oreCollected: boolean;
  penaltyReason?: string;
}

export function validateAndRecordCollision(
  particle: Particle,
  ore: OreBlock,
  collisionPoint: { x: number; y: number },
  frameIndex: number
): ValidationResult {
  const beforeParticleMomentum = calculateMomentum(particle.type.mass, { x: particle.vx, y: particle.vy });
  const beforeOreMomentum = calculateMomentum(ore.type.mass, { x: ore.vx, y: ore.vy });
  const beforeTotalMomentum = calculateTotalMomentum(beforeParticleMomentum, beforeOreMomentum);
  
  const beforeParticleEnergy = calculateKineticEnergy(particle.type.mass, { x: particle.vx, y: particle.vy });
  const beforeOreEnergy = calculateKineticEnergy(ore.type.mass, { x: ore.vx, y: ore.vy });
  const beforeTotalEnergy = calculateTotalEnergy(beforeParticleEnergy, beforeOreEnergy);
  
  const collisionResult = calculateElasticCollision2D(
    {
      x: particle.x,
      y: particle.y,
      vx: particle.vx,
      vy: particle.vy,
      mass: particle.type.mass,
    },
    {
      x: ore.x + ore.width / 2,
      y: ore.y + ore.height / 2,
      vx: ore.vx,
      vy: ore.vy,
      mass: ore.type.mass,
    },
    PHYSICS_CONSTANTS.ELASTIC_COEFFICIENT
  );
  
  const afterParticleMomentum = calculateMomentum(particle.type.mass, { x: collisionResult.particleVx, y: collisionResult.particleVy });
  const afterOreMomentum = calculateMomentum(ore.type.mass, { x: collisionResult.oreVx, y: collisionResult.oreVy });
  const afterTotalMomentum = calculateTotalMomentum(afterParticleMomentum, afterOreMomentum);
  
  const afterParticleEnergy = calculateKineticEnergy(particle.type.mass, { x: collisionResult.particleVx, y: collisionResult.particleVy });
  const afterOreEnergy = calculateKineticEnergy(ore.type.mass, { x: collisionResult.oreVx, y: collisionResult.oreVy });
  const afterTotalEnergy = calculateTotalEnergy(afterParticleEnergy, afterOreEnergy);
  
  const momentumError = calculateMomentumError(beforeTotalMomentum, afterTotalMomentum);
  const momentumConserved = isMomentumConserved(momentumError, PHYSICS_CONSTANTS.MOMENTUM_CONSERVATION_TOLERANCE);
  
  const simulatedParticleAfter = { ...particle, vx: collisionResult.particleVx, vy: collisionResult.particleVy };
  const simulatedOreAfter = { ...ore, vx: collisionResult.oreVx, vy: collisionResult.oreVy };
  const directionCheck = checkMomentumDirection(
    beforeTotalMomentum,
    afterTotalMomentum,
    simulatedParticleAfter,
    simulatedOreAfter
  );
  
  const energyCheck = checkEnergyConservation(
    beforeTotalEnergy,
    afterTotalEnergy,
    PHYSICS_CONSTANTS.ENERGY_CONSERVATION_TOLERANCE
  );
  
  const overLimitCheck = checkEnergyOverLimit(
    afterTotalEnergy,
    beforeTotalEnergy,
    PHYSICS_CONSTANTS.MAX_ENERGY_PER_LAUNCH,
    PHYSICS_CONSTANTS.ENERGY_CONSERVATION_TOLERANCE
  );
  
  const errors: GameError[] = [];
  let penaltyAmount = 0;
  let penaltyReason: string | undefined;
  
  if (directionCheck.isWrong) {
    const error: GameError = {
      id: `err-${Date.now()}-${Math.random()}`,
      type: 'momentum_direction',
      message: `动量方向错误！${directionCheck.wrongMaterial || '碰撞'}的运动方向不符合物理定律`,
      materialName: directionCheck.wrongMaterial,
      position: collisionPoint,
      collisionId: `coll-${Date.now()}`,
      timestamp: Date.now(),
    };
    errors.push(error);
    penaltyAmount += SCORE_CONFIG.MOMENTUM_ERROR_PENALTY;
    penaltyReason = `动量方向错误 (${directionCheck.wrongMaterial || '碰撞系统'})`;
  }
  
  if (overLimitCheck.isOverLimit) {
    const error: GameError = {
      id: `err-${Date.now()}-${Math.random()}`,
      type: 'energy_over_limit',
      message: `能量超限！碰撞后能量超出允许范围 ${overLimitCheck.overLimitAmount.toFixed(1)}J`,
      materialName: ore.type.name,
      position: collisionPoint,
      collisionId: `coll-${Date.now()}`,
      timestamp: Date.now(),
    };
    errors.push(error);
    const energyPenalty = Math.ceil(overLimitCheck.overLimitAmount * SCORE_CONFIG.ENERGY_OVER_LIMIT_PENALTY_PER_UNIT);
    penaltyAmount += energyPenalty;
    penaltyReason = penaltyReason 
      ? `${penaltyReason} + 能量超限 ${overLimitCheck.overLimitAmount.toFixed(1)}J`
      : `能量超限 ${overLimitCheck.overLimitAmount.toFixed(1)}J`;
  }
  
  const energySufficient = beforeParticleEnergy >= ore.type.energyThreshold;
  const oreCollected = energySufficient && errors.length === 0;
  
  let scoreChange = 0;
  if (oreCollected) {
    scoreChange = ore.type.scoreValue;
    if (momentumConserved && energyCheck.isConserved) {
      scoreChange += SCORE_CONFIG.PERFECT_COLLISION_BONUS;
    }
  }
  scoreChange -= penaltyAmount;
  
  const collisionRecord: CollisionRecord = {
    id: `coll-${Date.now()}`,
    timestamp: Date.now(),
    frameIndex,
    particleId: particle.id,
    oreId: ore.id,
    oreName: ore.type.name,
    position: collisionPoint,
    beforeCollision: {
      particleMomentum: beforeParticleMomentum,
      particleEnergy: beforeParticleEnergy,
      oreVelocity: { x: ore.vx, y: ore.vy },
    },
    afterCollision: {
      particleMomentum: afterParticleMomentum,
      particleEnergy: afterParticleEnergy,
      oreVelocity: { x: collisionResult.oreVx, y: collisionResult.oreVy },
    },
    physicsCheck: {
      momentumConserved,
      momentumError,
      momentumDirectionWrong: directionCheck.isWrong,
      wrongDirectionMaterial: directionCheck.wrongMaterial,
      energyConserved: energyCheck.isConserved,
      energyDifference: energyCheck.difference,
      energyOverLimit: overLimitCheck.isOverLimit,
      energyLimit: overLimitCheck.limit,
      overLimitAmount: overLimitCheck.overLimitAmount,
    },
    scoreChange,
    penaltyReason,
    oreCollected,
  };
  
  return {
    collisionRecord,
    errors,
    scoreChange,
    oreCollected,
    penaltyReason,
  };
}

export function generatePhysicsSummary(record: CollisionRecord): string {
  const lines = [];
  
  lines.push(`碰撞记录 #${record.frameIndex}`);
  lines.push(`矿石: ${record.oreName}`);
  lines.push('--- 动量守恒校验 ---');
  lines.push(`碰撞前: (${record.beforeCollision.particleMomentum.x.toFixed(2)}, ${record.beforeCollision.particleMomentum.y.toFixed(2)}) kg·m/s`);
  lines.push(`碰撞后: (${record.afterCollision.particleMomentum.x.toFixed(2)}, ${record.afterCollision.particleMomentum.y.toFixed(2)}) kg·m/s`);
  lines.push(`动量守恒: ${record.physicsCheck.momentumConserved ? '✓ 通过' : '✗ 失败'}`);
  if (record.physicsCheck.momentumDirectionWrong) {
    lines.push(`⚠ 动量方向错误: ${record.physicsCheck.wrongDirectionMaterial}`);
  }
  lines.push('--- 能量守恒校验 ---');
  lines.push(`碰撞前: ${record.beforeCollision.particleEnergy.toFixed(2)} J`);
  lines.push(`碰撞后: ${record.afterCollision.particleEnergy.toFixed(2)} J`);
  lines.push(`能量差异: ${record.physicsCheck.energyDifference.toFixed(2)} J`);
  lines.push(`能量守恒: ${record.physicsCheck.energyConserved ? '✓ 通过' : '✗ 失败'}`);
  if (record.physicsCheck.energyOverLimit) {
    lines.push(`⚠ 能量超限: ${record.physicsCheck.overLimitAmount.toFixed(2)} J`);
  }
  lines.push('--- 游戏结果 ---');
  lines.push(`得分变化: ${record.scoreChange > 0 ? '+' : ''}${record.scoreChange}`);
  if (record.penaltyReason) {
    lines.push(`扣分原因: ${record.penaltyReason}`);
  }
  lines.push(`矿石采集: ${record.oreCollected ? '✓ 成功' : '✗ 失败'}`);
  
  return lines.join('\n');
}
