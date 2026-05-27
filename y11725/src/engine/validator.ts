import type { Anomaly, StatePoint, Process, ProcessType } from '../types';
import { checkIdealGasLaw } from './thermodynamics';

function createAnomaly(
  type: Anomaly['type'],
  severity: Anomaly['severity'],
  message: string,
  sourceRef: Anomaly['sourceRef'],
  suggestion?: string
): Anomaly {
  return {
    id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message,
    sourceRef,
    suggestion,
    timestamp: Date.now(),
  };
}

export function validateStatePoint(point: StatePoint, n: number = 1): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (point.P <= 0) {
    anomalies.push(
      createAnomaly(
        'invalid_state',
        'error',
        `状态点 ${point.label} 的压强 P = ${point.P} Pa 无效，必须大于0`,
        { type: 'state_point', id: point.id, field: 'P', originalValue: point.P.toString() },
        '请检查压强值是否正确，是否混淆了单位（如kPa与Pa）'
      )
    );
  }

  if (point.V <= 0) {
    anomalies.push(
      createAnomaly(
        'invalid_state',
        'error',
        `状态点 ${point.label} 的体积 V = ${point.V} m³ 无效，必须大于0`,
        { type: 'state_point', id: point.id, field: 'V', originalValue: point.V.toString() },
        '请检查体积值是否正确，是否混淆了单位（如L与m³）'
      )
    );
  }

  if (point.T <= 0) {
    anomalies.push(
      createAnomaly(
        'invalid_state',
        'error',
        `状态点 ${point.label} 的温度 T = ${point.T} K 无效，必须大于0K`,
        { type: 'state_point', id: point.id, field: 'T', originalValue: point.T.toString() },
        '请检查温度值是否使用开尔文温标，0°C = 273.15K'
      )
    );
  }

  if (point.P > 0 && point.V > 0 && point.T > 0) {
    const gasLawCheck = checkIdealGasLaw(point, n);
    if (!gasLawCheck.satisfies) {
      anomalies.push(
        createAnomaly(
          'data_contradiction',
          'warning',
          `状态点 ${point.label} 不满足理想气体状态方程 PV=nRT，偏差 ${(gasLawCheck.deviation * 100).toFixed(2)}%`,
          { type: 'state_point', id: point.id },
          `根据 PV=nRT，预期温度应为 ${gasLawCheck.expectedT.toFixed(2)} K，请检查P、V、T的一致性`
        )
      );
    }
  }

  return anomalies;
}

export function validateProcess(
  process: Process,
  fromPoint: StatePoint,
  toPoint: StatePoint,
  type: ProcessType
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const deltaT = toPoint.T - fromPoint.T;

  if (type === 'isothermal' && Math.abs(deltaT) > 0.1) {
    anomalies.push(
      createAnomaly(
        'isothermal_adiabatic_confusion',
        'error',
        `等温过程中温度变化 ΔT = ${deltaT.toFixed(2)} K，等温过程要求温度不变`,
        { type: 'process', id: process.id, originalValue: `ΔT=${deltaT.toFixed(2)}` },
        '请确认是否应为等温过程，或调整状态点使温度一致。如果是绝热过程请选择正确的过程类型'
      )
    );
  }

  if (type === 'isobaric' && Math.abs(toPoint.P - fromPoint.P) > 0.1) {
    anomalies.push(
      createAnomaly(
        'data_contradiction',
        'error',
        `等压过程中压强变化 ΔP = ${(toPoint.P - fromPoint.P).toExponential(2)} Pa，等压过程要求压强不变`,
        { type: 'process', id: process.id },
        '请调整状态点使压强一致，或选择正确的过程类型'
      )
    );
  }

  if (type === 'isochoric' && Math.abs(toPoint.V - fromPoint.V) > 1e-10) {
    anomalies.push(
      createAnomaly(
        'data_contradiction',
        'error',
        `等容过程中体积变化 ΔV = ${(toPoint.V - fromPoint.V).toExponential(2)} m³，等容过程要求体积不变`,
        { type: 'process', id: process.id },
        '请调整状态点使体积一致，或选择正确的过程类型'
      )
    );
  }

  if (type === 'adiabatic' && Math.abs(process.Q) > 1) {
    anomalies.push(
      createAnomaly(
        'isothermal_adiabatic_confusion',
        'error',
        `绝热过程中热量 Q = ${process.Q.toExponential(2)} J，绝热过程要求 Q = 0`,
        { type: 'process', id: process.id, originalValue: `Q=${process.Q.toExponential(2)}` },
        '请确认是否应为绝热过程。如果是等温过程请选择正确的过程类型'
      )
    );
  }

  const energyConservation = Math.abs(process.deltaU - process.Q - process.W);
  if (energyConservation > 1) {
    anomalies.push(
      createAnomaly(
        'energy_conservation_violation',
        'error',
        `能量守恒不满足：ΔU - Q - W = ${energyConservation.toExponential(2)} J，应等于0`,
        { type: 'process', id: process.id },
        '请检查计算过程，热力学第一定律要求 ΔU = Q + W'
      )
    );
  }

  return anomalies;
}

export function validateCycle(
  processes: Process[],
  statePoints: StatePoint[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (processes.length < 2) {
    anomalies.push(
      createAnomaly(
        'path_not_closed',
        'warning',
        '过程数量不足，无法形成循环',
        { type: 'input' },
        '至少需要2个过程才能形成循环'
      )
    );
    return anomalies;
  }

  const firstPoint = statePoints.find(p => p.id === processes[0].from);
  const lastPoint = statePoints.find(p => p.id === processes[processes.length - 1].to);

  if (!firstPoint || !lastPoint) {
    anomalies.push(
      createAnomaly(
        'path_not_closed',
        'error',
        '循环路径引用了不存在的状态点',
        { type: 'input' },
        '请检查所有过程的起点和终点是否对应有效的状态点'
      )
    );
    return anomalies;
  }

  const pDiff = Math.abs(firstPoint.P - lastPoint.P);
  const vDiff = Math.abs(firstPoint.V - lastPoint.V);
  const tDiff = Math.abs(firstPoint.T - lastPoint.T);

  if (pDiff > 1 || vDiff > 1e-10 || tDiff > 0.1) {
    anomalies.push(
      createAnomaly(
        'path_not_closed',
        'error',
        `循环未闭合：起点(${firstPoint.label})与终点(${lastPoint.label})不重合。ΔP=${pDiff.toExponential(2)}, ΔV=${vDiff.toExponential(2)}, ΔT=${tDiff.toFixed(2)}`,
        { type: 'input', originalValue: `起点:${firstPoint.label}, 终点:${lastPoint.label}` },
        '请调整最后一个过程的终点，使其与第一个过程的起点状态一致'
      )
    );
  }

  for (let i = 0; i < processes.length - 1; i++) {
    const currentTo = processes[i].to;
    const nextFrom = processes[i + 1].from;
    if (currentTo !== nextFrom) {
      const currentToPoint = statePoints.find(p => p.id === currentTo);
      const nextFromPoint = statePoints.find(p => p.id === nextFrom);
      anomalies.push(
        createAnomaly(
          'path_not_closed',
          'error',
          `过程 ${i + 1} 的终点(${currentToPoint?.label || '?'}) 与过程 ${i + 2} 的起点(${nextFromPoint?.label || '?'}) 不连续`,
          { type: 'process', id: processes[i].id },
          '请确保相邻过程首尾相连'
        )
      );
    }
  }

  return anomalies;
}

export function validateAll(
  statePoints: StatePoint[],
  processes: Process[],
  n: number = 1
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const point of statePoints) {
    anomalies.push(...validateStatePoint(point, n));
  }

  for (const process of processes) {
    const fromPoint = statePoints.find(p => p.id === process.from);
    const toPoint = statePoints.find(p => p.id === process.to);
    if (fromPoint && toPoint) {
      anomalies.push(...validateProcess(process, fromPoint, toPoint, process.type));
    } else {
      anomalies.push(
        createAnomaly(
          'invalid_state',
          'error',
          `过程引用了不存在的状态点`,
          { type: 'process', id: process.id },
          '请检查过程的起点和终点状态点是否存在'
        )
      );
    }
  }

  if (processes.length > 0) {
    anomalies.push(...validateCycle(processes, statePoints));
  }

  return anomalies;
}
