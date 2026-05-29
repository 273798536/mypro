import type { Complex, QuantumState, MeasurementBasis, MeasurementResult } from '@/types/quantum';
import seedrandom from 'seedrandom';

export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function complexConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

export function complexMag2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

export function complexMag(a: Complex): number {
  return Math.sqrt(complexMag2(a));
}

export function innerProduct(a: Complex[], b: Complex[]): Complex {
  let result: Complex = { re: 0, im: 0 };
  for (let i = 0; i < a.length; i++) {
    result = complexAdd(result, complexMul(complexConj(a[i]), b[i]));
  }
  return result;
}

export function measureProbabilities(
  state: QuantumState,
  basis: MeasurementBasis
): number[] {
  return basis.eigenvectors.map((ev) => {
    const braket = innerProduct(ev.amplitudes, state.amplitudes);
    return complexMag2(braket);
  });
}

export function checkNormalization(probabilities: number[]): boolean {
  const sum = probabilities.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) < 0.001;
}

export function collapseOutcome(
  probabilities: number[],
  seed?: number
): { outcomeIndex: number; randomSeed: number; randomValue: number } {
  const randomSeed = seed ?? Math.floor(Math.random() * 100000);
  const rng = seedrandom(String(randomSeed));
  const r = rng();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (r < cumulative) {
      return { outcomeIndex: i, randomSeed, randomValue: r };
    }
  }
  return {
    outcomeIndex: probabilities.length - 1,
    randomSeed,
    randomValue: r,
  };
}

export function describeSeedInfluence(
  randomSeed: number,
  randomValue: number,
  outcomeIndex: number,
  probabilities: number[],
  basis: MeasurementBasis
): string {
  const outcomeLabel = basis.eigenvectors[outcomeIndex]?.label ?? `本征态${outcomeIndex}`;
  let cumulative = 0;
  let zone = '';
  for (let i = 0; i < probabilities.length; i++) {
    const prev = cumulative;
    cumulative += probabilities[i];
    if (i === outcomeIndex) {
      zone = `[${prev.toFixed(3)}, ${cumulative.toFixed(3)})`;
      break;
    }
  }
  return `种子 ${randomSeed} → 随机值 r=${randomValue.toFixed(4)}，落入${outcomeLabel}区间${zone}，塌缩至${outcomeLabel}`;
}

export function performMeasurement(
  state: QuantumState,
  basis: MeasurementBasis,
  stepIndex: number,
  seed?: number
): MeasurementResult {
  const probabilities = measureProbabilities(state, basis);
  const isNormalized = checkNormalization(probabilities);
  const { outcomeIndex, randomSeed, randomValue } = collapseOutcome(probabilities, seed);
  const outcomeLabel = basis.eigenvectors[outcomeIndex]?.label ?? `本征态${outcomeIndex}`;
  const seedInfluence = describeSeedInfluence(
    randomSeed,
    randomValue,
    outcomeIndex,
    probabilities,
    basis
  );

  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stateId: state.id,
    basisId: basis.id,
    outcomeIndex,
    outcomeLabel,
    probabilities,
    isNormalized,
    randomSeed,
    seedInfluence,
    timestamp: Date.now(),
    stepIndex,
  };
}

const SQRT2_INV = 1 / Math.sqrt(2);

export const PRESET_STATES: QuantumState[] = [
  {
    id: 'state-0',
    label: '|0⟩',
    amplitudes: [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    importOrder: 1,
    importTag: '先到',
    basis: 'Z',
  },
  {
    id: 'state-1',
    label: '|1⟩',
    amplitudes: [{ re: 0, im: 0 }, { re: 1, im: 0 }],
    importOrder: 2,
    importTag: '先到',
    basis: 'Z',
  },
  {
    id: 'state-plus',
    label: '|+⟩',
    amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: SQRT2_INV, im: 0 }],
    importOrder: 3,
    importTag: '先到',
    basis: 'X',
  },
  {
    id: 'state-minus',
    label: '|−⟩',
    amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: -SQRT2_INV, im: 0 }],
    importOrder: 4,
    importTag: '先到',
    basis: 'X',
  },
  {
    id: 'state-psi',
    label: '|ψ⟩',
    amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: 0, im: SQRT2_INV }],
    importOrder: 5,
    importTag: '后补',
    basis: 'Z',
  },
];

export const PRESET_BASES: MeasurementBasis[] = [
  {
    id: 'basis-z',
    label: 'Z基',
    symbol: 'σ_z',
    eigenvectors: [
      {
        id: 'ev-z0',
        label: '|0⟩',
        amplitudes: [{ re: 1, im: 0 }, { re: 0, im: 0 }],
        importOrder: 1,
        importTag: '先到',
        basis: 'Z',
      },
      {
        id: 'ev-z1',
        label: '|1⟩',
        amplitudes: [{ re: 0, im: 0 }, { re: 1, im: 0 }],
        importOrder: 2,
        importTag: '先到',
        basis: 'Z',
      },
    ],
    importOrder: 1,
    importTag: '先到',
    color: '#00d4ff',
  },
  {
    id: 'basis-x',
    label: 'X基',
    symbol: 'σ_x',
    eigenvectors: [
      {
        id: 'ev-xp',
        label: '|+⟩',
        amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: SQRT2_INV, im: 0 }],
        importOrder: 3,
        importTag: '先到',
        basis: 'X',
      },
      {
        id: 'ev-xm',
        label: '|−⟩',
        amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: -SQRT2_INV, im: 0 }],
        importOrder: 4,
        importTag: '先到',
        basis: 'X',
      },
    ],
    importOrder: 2,
    importTag: '先到',
    color: '#00ff88',
  },
  {
    id: 'basis-y',
    label: 'Y基',
    symbol: 'σ_y',
    eigenvectors: [
      {
        id: 'ev-yp',
        label: '|i+⟩',
        amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: 0, im: SQRT2_INV }],
        importOrder: 5,
        importTag: '后补',
        basis: 'Y',
      },
      {
        id: 'ev-ym',
        label: '|i−⟩',
        amplitudes: [{ re: SQRT2_INV, im: 0 }, { re: 0, im: -SQRT2_INV }],
        importOrder: 6,
        importTag: '后补',
        basis: 'Y',
      },
    ],
    importOrder: 3,
    importTag: '后补',
    color: '#c084fc',
  },
];
