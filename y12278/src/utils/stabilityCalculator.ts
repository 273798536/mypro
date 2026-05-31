import type { ShipModel, CargoCell, BallastVersion, StabilityResult, Point3D } from '../types';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateCargoCG(cells: CargoCell[]): Point3D & { totalWeight: number } {
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (const cell of cells) {
    if (cell.currentLoad > 0) {
      totalWeight += cell.currentLoad;
      sumX += cell.currentLoad * cell.centerOfGravity.x;
      sumY += cell.currentLoad * cell.centerOfGravity.y;
      sumZ += cell.currentLoad * cell.centerOfGravity.z;
    }
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0, z: 0, totalWeight: 0 };
  }

  return {
    x: sumX / totalWeight,
    y: sumY / totalWeight,
    z: sumZ / totalWeight,
    totalWeight,
  };
}

function calculateBallastCG(ballast: BallastVersion, ship: ShipModel): Point3D & { totalWeight: number } {
  const foreX = -ship.length * 0.35;
  const aftX = ship.length * 0.35;
  const portY = -ship.width * 0.4;
  const starboardY = ship.width * 0.4;
  const ballastZ = ship.draft * 0.4;

  const totalWeight = ballast.totalBallast;
  if (totalWeight === 0) {
    return { x: 0, y: 0, z: 0, totalWeight: 0 };
  }

  const sumX = ballast.foreTank * foreX + ballast.aftTank * aftX;
  const sumY = ballast.portTank * portY + ballast.starboardTank * starboardY;
  const sumZ = (ballast.foreTank + ballast.aftTank + ballast.portTank + ballast.starboardTank) * ballastZ;

  return {
    x: sumX / totalWeight,
    y: sumY / totalWeight,
    z: sumZ / totalWeight,
    totalWeight,
  };
}

export function calculateStability(
  ship: ShipModel,
  cargoCells: CargoCell[],
  ballast: BallastVersion,
  weatherLevel: number
): StabilityResult {
  const lightShipWeight = ship.lightShipWeight;
  const lightShipCG = ship.lightShipCG;

  const cargoResult = calculateCargoCG(cargoCells);
  const ballastResult = calculateBallastCG(ballast, ship);

  const totalWeight = lightShipWeight + cargoResult.totalWeight + ballastResult.totalWeight;

  const combinedCG: Point3D = {
    x: (lightShipWeight * lightShipCG.x + cargoResult.totalWeight * cargoResult.x + ballastResult.totalWeight * ballastResult.x) / totalWeight,
    y: (lightShipWeight * lightShipCG.y + cargoResult.totalWeight * cargoResult.y + ballastResult.totalWeight * ballastResult.y) / totalWeight,
    z: (lightShipWeight * lightShipCG.z + cargoResult.totalWeight * cargoResult.z + ballastResult.totalWeight * ballastResult.z) / totalWeight,
  };

  const KB = ship.draft * 0.55;
  const BM = (ship.width * ship.width) / (12 * ship.draft);
  const KM = KB + BM;
  const GM = KM - combinedCG.z;

  const heelAngle = (combinedCG.y / (GM * 1.5)) * (180 / Math.PI);
  const trimAngle = (combinedCG.x / (GM * 3)) * (180 / Math.PI);

  const centerOfBuoyancy: Point3D = {
    x: combinedCG.x * 0.6,
    y: 0,
    z: KB,
  };

  const gravityOffsetDistance = Math.sqrt(combinedCG.x * combinedCG.x + combinedCG.y * combinedCG.y);
  let direction = '';
  if (Math.abs(combinedCG.y) > Math.abs(combinedCG.x)) {
    direction = combinedCG.y > 0 ? '右舷' : '左舷';
  } else {
    direction = combinedCG.x > 0 ? '艉部' : '艏部';
  }
  const allowableOffset = ship.width * 0.025;

  const overloadCells = cargoCells
    .filter(cell => cell.currentLoad > cell.maxCapacity)
    .map(cell => cell.id);

  const weatherFactor = 1 + (weatherLevel - 1) * 0.1;
  const adjustedGM = GM / weatherFactor;

  let modelConclusion: 'safe' | 'warning' | 'danger';
  if (adjustedGM > 0.8 && gravityOffsetDistance < allowableOffset * 0.7) {
    modelConclusion = 'safe';
  } else if (adjustedGM > 0.5 && gravityOffsetDistance < allowableOffset) {
    modelConclusion = 'warning';
  } else {
    modelConclusion = 'danger';
  }

  const overloadRatio = overloadCells.length / cargoCells.filter(c => c.currentLoad > 0).length;
  let gridConclusion: 'safe' | 'warning' | 'danger';
  if (overloadRatio === 0) {
    gridConclusion = 'safe';
  } else if (overloadRatio < 0.1) {
    gridConclusion = 'warning';
  } else {
    gridConclusion = 'danger';
  }

  return {
    id: generateId('STAB'),
    shipModelId: ship.id,
    cargoGridId: cargoCells[0]?.gridId || '',
    ballastVersionId: ballast.id,
    GM: Math.round(GM * 100) / 100,
    heelAngle: Math.round(heelAngle * 10) / 10,
    trimAngle: Math.round(trimAngle * 10) / 10,
    centerOfGravity: {
      x: Math.round(combinedCG.x * 100) / 100,
      y: Math.round(combinedCG.y * 100) / 100,
      z: Math.round(combinedCG.z * 100) / 100,
    },
    centerOfBuoyancy: {
      x: Math.round(centerOfBuoyancy.x * 100) / 100,
      y: Math.round(centerOfBuoyancy.y * 100) / 100,
      z: Math.round(centerOfBuoyancy.z * 100) / 100,
    },
    displacement: Math.round(totalWeight),
    modelConclusion,
    gridConclusion,
    isConsistent: modelConclusion === gridConclusion,
    overloadCells,
    gravityOffset: {
      distance: Math.round(gravityOffsetDistance * 100) / 100,
      direction,
      allowable: Math.round(allowableOffset * 100) / 100,
    },
    manualCheckIds: [],
    createdAt: new Date().toISOString(),
  };
}

export function formatConclusion(conclusion: 'safe' | 'warning' | 'danger'): { text: string; color: string } {
  switch (conclusion) {
    case 'safe':
      return { text: '安全', color: '#27AE60' };
    case 'warning':
      return { text: '警告', color: '#F39C12' };
    case 'danger':
      return { text: '危险', color: '#E74C3C' };
  }
}
