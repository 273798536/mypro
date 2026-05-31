import type { Cargo, BallastTank, ShipState, Violation, LevelConfig } from '@/types';

export function calculateShipState(
  cargos: Cargo[],
  tanks: BallastTank[],
  config: LevelConfig
): ShipState {
  const loadedCargo = cargos.filter(c => c.loaded);
  const cargoWeight = loadedCargo.reduce((sum, c) => sum + c.weight, 0);
  const ballastWeight = tanks.reduce((sum, t) => sum + t.current, 0);
  const shipLightWeight = config.shipMaxDisplacement * 0.3;
  const currentDisplacement = shipLightWeight + cargoWeight + ballastWeight;
  const buoyancyMargin = config.shipMaxDisplacement - currentDisplacement;

  const draftRatio = currentDisplacement / config.shipMaxDisplacement;
  const draftDepth = config.shipMaxDraft * Math.min(draftRatio, 1.2);

  const cog = calculateCenterOfGravity(loadedCargo, tanks, config);

  const portBallast = tanks.filter(t => t.side === 'port').reduce((s, t) => s + t.current, 0);
  const starboardBallast = tanks.filter(t => t.side === 'starboard').reduce((s, t) => s + t.current, 0);
  const cargoMomentX = loadedCargo.reduce((sum, c) => {
    if (!c.position) return sum;
    const normalizedX = (c.position.col - (config.gridCols - 1) / 2) / ((config.gridCols - 1) / 2 || 1);
    return sum + c.weight * normalizedX;
  }, 0);
  const heelFromCargo = Math.atan2(cargoMomentX, currentDisplacement) * (180 / Math.PI);
  const heelFromBallast = Math.atan2((starboardBallast - portBallast), currentDisplacement) * (180 / Math.PI) * 2;
  const currentHeelAngle = heelFromCargo + heelFromBallast;

  return {
    maxDisplacement: config.shipMaxDisplacement,
    currentDisplacement,
    draftDepth,
    maxDraft: config.shipMaxDraft,
    buoyancyMargin: Math.max(buoyancyMargin, 0),
    centerOfGravity: cog,
    maxHeelAngle: config.shipMaxHeelAngle,
    currentHeelAngle,
  };
}

function calculateCenterOfGravity(
  loadedCargo: Cargo[],
  tanks: BallastTank[],
  config: LevelConfig
): { x: number; y: number } {
  let totalMomentX = 0;
  let totalMomentY = 0;
  let totalWeight = 0;

  const shipLightWeight = config.shipMaxDisplacement * 0.3;
  totalMomentY += shipLightWeight * 0;
  totalWeight += shipLightWeight;

  for (const cargo of loadedCargo) {
    if (!cargo.position) continue;
    const x = (cargo.position.col - (config.gridCols - 1) / 2) / ((config.gridCols - 1) / 2 || 1);
    const y = -(cargo.position.row / (config.gridRows || 1)) * 0.5;
    totalMomentX += cargo.weight * x;
    totalMomentY += cargo.weight * y;
    totalWeight += cargo.weight;
  }

  for (const tank of tanks) {
    const x = tank.side === 'port' ? -0.3 : 0.3;
    const y = -0.4;
    totalMomentX += tank.current * x;
    totalMomentY += tank.current * y;
    totalWeight += tank.current;
  }

  if (totalWeight === 0) return { x: 0, y: 0 };
  return { x: totalMomentX / totalWeight, y: totalMomentY / totalWeight };
}

export function evaluateViolations(
  shipState: ShipState,
  cargos: Cargo[],
  tanks: BallastTank[],
  config: LevelConfig
): Violation[] {
  const violations: Violation[] = [];
  const loadedCargo = cargos.filter(c => c.loaded);

  if (shipState.buoyancyMargin <= 0) {
    const overWeight = Math.abs(shipState.buoyancyMargin);
    const heaviestCargo = loadedCargo.sort((a, b) => b.weight - a.weight)[0];
    violations.push({
      rule: 'overload',
      severity: 'critical',
      message: `超载下沉！总排水量超出${overWeight.toFixed(0)}吨。${heaviestCargo ? `最重货物「${heaviestCargo.name}」(${heaviestCargo.weight}吨)建议卸载或调配压载水。` : ''}`,
      relatedCargoIds: heaviestCargo ? [heaviestCargo.id] : [],
      relatedBallastOpIds: [],
    });
  } else if (shipState.buoyancyMargin < config.shipMaxDisplacement * 0.05) {
    violations.push({
      rule: 'overload',
      severity: 'warning',
      message: `浮力余量仅剩${shipState.buoyancyMargin.toFixed(0)}吨，接近超载临界。建议减少载重或补充压载水。`,
      relatedCargoIds: [],
      relatedBallastOpIds: [],
    });
  }

  if (shipState.draftDepth > shipState.maxDraft) {
    const overDraft = shipState.draftDepth - shipState.maxDraft;
    violations.push({
      rule: 'draft_exceed',
      severity: shipState.draftDepth > shipState.maxDraft * 1.1 ? 'critical' : 'danger',
      message: `吃水深度${shipState.draftDepth.toFixed(2)}米，超出最大允许${overDraft.toFixed(2)}米。货物过重导致船体下沉。`,
      relatedCargoIds: loadedCargo.filter(c => c.position && c.position.row >= config.gridRows - 2).map(c => c.id),
      relatedBallastOpIds: [],
    });
  }

  if (Math.abs(shipState.currentHeelAngle) > shipState.maxHeelAngle) {
    const angle = Math.abs(shipState.currentHeelAngle);
    const side = shipState.currentHeelAngle > 0 ? '右舷' : '左舷';
    const tiltedCargo = loadedCargo.filter(c => {
      if (!c.position) return false;
      const colCenter = (config.gridCols - 1) / 2;
      return shipState.currentHeelAngle > 0
        ? c.position.col > colCenter
        : c.position.col < colCenter;
    });
    const oppositeTanks = tanks.filter(t =>
      shipState.currentHeelAngle > 0 ? t.side === 'port' : t.side === 'starboard'
    );
    violations.push({
      rule: 'gravity_shift',
      severity: angle > shipState.maxHeelAngle * 1.5 ? 'critical' : 'danger',
      message: `重心偏移${side}${angle.toFixed(1)}°，超过安全限制${shipState.maxHeelAngle}°。${tiltedCargo.length > 0 ? `偏${side}货物：${tiltedCargo.map(c => `「${c.name}」(${c.weight}吨)`).join('、')}。` : ''}${oppositeTanks.some(t => t.current < t.capacity * 0.5) ? `对侧压载舱仍有空间，建议注入压载水平衡。` : ''}`,
      relatedCargoIds: tiltedCargo.map(c => c.id),
      relatedBallastOpIds: [],
    });
  } else if (Math.abs(shipState.currentHeelAngle) > shipState.maxHeelAngle * 0.7) {
    const side = shipState.currentHeelAngle > 0 ? '右舷' : '左舷';
    violations.push({
      rule: 'gravity_shift',
      severity: 'warning',
      message: `重心偏向${side}${Math.abs(shipState.currentHeelAngle).toFixed(1)}°，接近安全限制。注意货物分布均衡。`,
      relatedCargoIds: [],
      relatedBallastOpIds: [],
    });
  }

  const hasLoadedCargo = loadedCargo.length > 0;
  const totalBallast = tanks.reduce((s, t) => s + t.current, 0);
  const totalBallastCapacity = tanks.reduce((s, t) => s + t.capacity, 0);
  if (hasLoadedCargo && totalBallast === 0 && Math.abs(shipState.currentHeelAngle) > 2) {
    violations.push({
      rule: 'ballast_omit',
      severity: 'danger',
      message: `压载水遗漏！当前横倾${Math.abs(shipState.currentHeelAngle).toFixed(1)}°但压载舱为空。应注入压载水以稳定船体。`,
      relatedCargoIds: [],
      relatedBallastOpIds: [],
    });
  } else if (hasLoadedCargo && totalBallast < totalBallastCapacity * 0.1 && shipState.buoyancyMargin < config.shipMaxDisplacement * 0.15) {
    violations.push({
      rule: 'ballast_omit',
      severity: 'warning',
      message: `压载水用量偏低，建议适当补充以增加吃水稳定性。`,
      relatedCargoIds: [],
      relatedBallastOpIds: [],
    });
  }

  return violations;
}

export function calculateScore(
  shipState: ShipState,
  violations: Violation[],
  cargos: Cargo[],
  config: LevelConfig
): number {
  const loadedCargo = cargos.filter(c => c.loaded);
  const totalCargoWeight = loadedCargo.reduce((s, c) => s + c.weight, 0);
  const loadEfficiency = totalCargoWeight / config.cargoList.reduce((s, c) => s + c.weight, 0);
  let score = 100;

  score *= loadEfficiency;

  for (const v of violations) {
    switch (v.severity) {
      case 'critical': score -= 30; break;
      case 'danger': score -= 15; break;
      case 'warning': score -= 5; break;
    }
  }

  if (Math.abs(shipState.currentHeelAngle) < shipState.maxHeelAngle * 0.3) {
    score += 10;
  }
  if (shipState.buoyancyMargin > config.shipMaxDisplacement * 0.1) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRetroactiveAffectedCargo(
  operation: { action: 'fill' | 'drain'; amount: number; side: 'port' | 'starboard' },
  cargos: Cargo[],
  config: LevelConfig
): string[] {
  const affectedIds: string[] = [];
  const colCenter = (config.gridCols - 1) / 2;
  for (const cargo of cargos) {
    if (!cargo.loaded || !cargo.position) continue;
    const isSameSide = operation.side === 'port'
      ? cargo.position.col < colCenter
      : cargo.position.col > colCenter;
    if (isSameSide) {
      affectedIds.push(cargo.id);
    }
  }
  return affectedIds;
}
