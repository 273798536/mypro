import { GAS_CONSTANT, type ProcessType, type StatePoint } from '../types';

export interface ProcessResult {
  W: number;
  Q: number;
  deltaU: number;
  formula: string;
}

export function calculateWork(
  type: ProcessType,
  from: StatePoint,
  to: StatePoint,
  n: number = 1,
  gamma: number = 1.4,
  polytropicN: number = 1.3
): { W: number; formula: string } {
  const P1 = from.P;
  const V1 = from.V;
  const T1 = from.T;
  const P2 = to.P;
  const V2 = to.V;
  const T2 = to.T;

  switch (type) {
    case 'isobaric': {
      const W = P1 * (V2 - V1);
      return { W, formula: `W = P·ΔV = ${P1.toExponential(2)} × (${V2.toExponential(2)} - ${V1.toExponential(2)})` };
    }
    case 'isochoric': {
      return { W: 0, formula: 'W = 0 (等容过程，体积不变)' };
    }
    case 'isothermal': {
      const W = n * GAS_CONSTANT * T1 * Math.log(V2 / V1);
      return { W, formula: `W = nRT·ln(V₂/V₁) = ${n} × ${GAS_CONSTANT} × ${T1} × ln(${V2.toExponential(2)}/${V1.toExponential(2)})` };
    }
    case 'adiabatic': {
      const W = (P1 * V1 - P2 * V2) / (gamma - 1);
      return { W, formula: `W = (P₁V₁ - P₂V₂)/(γ-1) = (${P1.toExponential(2)}×${V1.toExponential(2)} - ${P2.toExponential(2)}×${V2.toExponential(2)})/(${gamma}-1)` };
    }
    case 'polytropic': {
      if (Math.abs(polytropicN - 1) < 1e-10) {
        const W = n * GAS_CONSTANT * T1 * Math.log(V2 / V1);
        return { W, formula: `W = nRT·ln(V₂/V₁) = ${n} × ${GAS_CONSTANT} × ${T1} × ln(${V2.toExponential(2)}/${V1.toExponential(2)})` };
      }
      const W = (P1 * V1 - P2 * V2) / (polytropicN - 1);
      return { W, formula: `W = (P₁V₁ - P₂V₂)/(n-1) = (${P1.toExponential(2)}×${V1.toExponential(2)} - ${P2.toExponential(2)}×${V2.toExponential(2)})/(${polytropicN}-1)` };
    }
    default:
      return { W: 0, formula: '未知过程类型' };
  }
}

export function calculateInternalEnergyChange(
  from: StatePoint,
  to: StatePoint,
  n: number = 1,
  degreesOfFreedom: number = 5
): { deltaU: number; formula: string } {
  const Cv = (degreesOfFreedom / 2) * GAS_CONSTANT;
  const deltaU = n * Cv * (to.T - from.T);
  return {
    deltaU,
    formula: `ΔU = nCvΔT = ${n} × ${Cv.toFixed(2)} × (${to.T} - ${from.T})`,
  };
}

export function calculateHeat(deltaU: number, W: number): { Q: number; formula: string } {
  const Q = deltaU - W;
  return { Q, formula: 'Q = ΔU - W (热力学第一定律)' };
}

export function calculateProcess(
  type: ProcessType,
  from: StatePoint,
  to: StatePoint,
  n: number = 1,
  gamma: number = 1.4,
  polytropicN: number = 1.3,
  degreesOfFreedom: number = 5
): ProcessResult {
  const workResult = calculateWork(type, from, to, n, gamma, polytropicN);
  const energyResult = calculateInternalEnergyChange(from, to, n, degreesOfFreedom);
  const heatResult = calculateHeat(energyResult.deltaU, workResult.W);

  return {
    W: workResult.W,
    Q: heatResult.Q,
    deltaU: energyResult.deltaU,
    formula: `${workResult.formula}\n${energyResult.formula}\n${heatResult.formula}`,
  };
}

export function calculateCycle(
  processes: Array<{ type: ProcessType; W: number; Q: number; deltaU: number }>
): {
  netWork: number;
  netHeat: number;
  efficiency: number;
  heatIn: number;
  heatOut: number;
} {
  const netWork = processes.reduce((sum, p) => sum + p.W, 0);
  const netHeat = processes.reduce((sum, p) => sum + p.Q, 0);
  const heatIn = processes.reduce((sum, p) => sum + (p.Q > 0 ? p.Q : 0), 0);
  const heatOut = processes.reduce((sum, p) => sum + (p.Q < 0 ? Math.abs(p.Q) : 0), 0);
  const efficiency = heatIn > 0 ? (netWork / heatIn) * 100 : 0;

  return { netWork, netHeat, efficiency, heatIn, heatOut };
}

export function generateProcessPoints(
  type: ProcessType,
  from: StatePoint,
  to: StatePoint,
  numPoints: number = 50,
  gamma: number = 1.4,
  polytropicN: number = 1.3
): Array<{ P: number; V: number }> {
  const points: Array<{ P: number; V: number }> = [];
  const V1 = from.V;
  const V2 = to.V;
  const P1 = from.P;
  const P2 = to.P;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const V = V1 + t * (V2 - V1);
    let P: number;

    switch (type) {
      case 'isobaric':
        P = P1;
        break;
      case 'isochoric':
        P = P1 + t * (P2 - P1);
        break;
      case 'isothermal':
        P = (P1 * V1) / V;
        break;
      case 'adiabatic':
        P = P1 * Math.pow(V1 / V, gamma);
        break;
      case 'polytropic':
        P = P1 * Math.pow(V1 / V, polytropicN);
        break;
      default:
        P = P1 + t * (P2 - P1);
    }

    points.push({ P, V });
  }

  return points;
}

export function checkIdealGasLaw(point: StatePoint, n: number = 1): {
  satisfies: boolean;
  deviation: number;
  expectedT: number;
} {
  const expectedT = (point.P * point.V) / (n * GAS_CONSTANT);
  const deviation = Math.abs(point.T - expectedT) / expectedT;
  return {
    satisfies: deviation < 0.01,
    deviation,
    expectedT,
  };
}
