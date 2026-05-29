import type {
  CargoBox,
  Compartment,
  GameError,
  ScoreDetail,
  Station,
  TemperatureZone,
  Deduction,
} from '../types';

export function validateZonePlacement(
  cargo: CargoBox,
  compartment: Compartment
): { valid: boolean; error?: GameError } {
  if (cargo.zone !== compartment.zone) {
    return {
      valid: false,
      error: {
        type: 'zone_mismatch',
        timestamp: Date.now(),
        cargoId: cargo.id,
        compartmentId: compartment.id,
        message: `温层不匹配：${cargo.name}是${getZoneLabel(cargo.zone)}货物，不能放入${getZoneLabel(compartment.zone)}区域`,
      },
    };
  }
  return { valid: true };
}

export function getZoneLabel(zone: TemperatureZone): string {
  const labels: Record<TemperatureZone, string> = {
    frozen: '冷冻',
    chilled: '冷藏',
    ambient: '常温',
  };
  return labels[zone];
}

export function checkUnloadOrder(
  placedCargos: Map<string, string>,
  cargos: CargoBox[],
  compartments: Compartment[],
  stations: Station[]
): { valid: boolean; warnings: GameError[] } {
  const warnings: GameError[] = [];
  const placedCompartments = compartments.filter((c) => c.occupiedBy);
  
  const sortedCompartments = [...placedCompartments].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  for (let i = 0; i < sortedCompartments.length; i++) {
    const current = sortedCompartments[i];
    const currentCargo = cargos.find((c) => c.id === current.occupiedBy);
    if (!currentCargo) continue;

    const currentStation = stations.find((s) => s.id === currentCargo.destination);
    if (!currentStation) continue;

    for (let j = i + 1; j < sortedCompartments.length; j++) {
      const later = sortedCompartments[j];
      const laterCargo = cargos.find((c) => c.id === later.occupiedBy);
      if (!laterCargo) continue;

      const laterStation = stations.find((s) => s.id === laterCargo.destination);
      if (!laterStation) continue;

      if (currentStation.order > laterStation.order) {
        warnings.push({
          type: 'unload_order',
          timestamp: Date.now(),
          cargoId: currentCargo.id,
          compartmentId: current.id,
          message: `卸货顺序警告：${currentCargo.name}（${currentStation.name}）被${laterCargo.name}（${laterStation.name}）阻挡，会导致先到站点的货物无法优先卸货`,
        });
      }
    }
  }

  return { valid: warnings.length === 0, warnings };
}

export function calculateScore(
  level: { cargoBoxes: CargoBox[]; compartments: Compartment[]; stations: Station[]; timeLimit: number },
  placedCargos: Map<string, string>,
  compartments: Compartment[],
  errors: GameError[],
  usedTime: number
): ScoreDetail {
  const baseScore = 100;
  let zoneCorrectness = 0;
  let unloadOrder = 0;
  const deductions: Deduction[] = [];

  const placedCompartments = compartments.filter((c) => c.occupiedBy);
  
  placedCompartments.forEach((compartment) => {
    const cargo = level.cargoBoxes.find((c) => c.id === compartment.occupiedBy);
    if (cargo && cargo.zone === compartment.zone) {
      zoneCorrectness += 5;
    }
  });

  const orderCheck = checkUnloadOrder(placedCargos, level.cargoBoxes, compartments, level.stations);
  const totalCargos = level.cargoBoxes.length;
  const orderErrors = orderCheck.warnings.length;
  unloadOrder = Math.max(0, (totalCargos - orderErrors) * 3);

  orderCheck.warnings.forEach((warning) => {
    const exists = errors.some(
      (e) =>
        e.type === 'unload_order' &&
        e.cargoId === warning.cargoId &&
        e.compartmentId === warning.compartmentId
    );
    if (!exists) {
      deductions.push({
        type: 'unload_order',
        amount: 5,
        reason: warning.message,
      });
    }
  });

  errors.forEach((error) => {
    if (error.type === 'zone_mismatch') {
      deductions.push({
        type: 'zone_mismatch',
        amount: 10,
        reason: error.message,
      });
    } else if (error.type === 'unload_order') {
      deductions.push({
        type: 'unload_order',
        amount: 5,
        reason: error.message,
      });
    }
  });

  const timeoutErrors = errors.filter((e) => e.type === 'timeout');
  if (timeoutErrors.length > 0 && usedTime > level.timeLimit) {
    const overtimeSeconds = usedTime - level.timeLimit;
    deductions.push({
      type: 'timeout',
      amount: overtimeSeconds,
      reason: `装载超时：超出时间限制 ${overtimeSeconds} 秒，超时每秒扣1分，共扣 ${overtimeSeconds} 分`,
    });
  }

  const timeBonus = Math.max(0, Math.floor((level.timeLimit - usedTime) * 0.5));

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const total = Math.max(0, baseScore + zoneCorrectness + unloadOrder + timeBonus - totalDeductions);

  return {
    total,
    baseScore,
    zoneCorrectness,
    unloadOrder,
    timeBonus,
    deductions,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
