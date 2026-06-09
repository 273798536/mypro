import type { FourierConfig, DataRow, CounterExample, WindowFunction } from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function windowFactor(type: WindowFunction, n: number, N: number): number {
  switch (type) {
    case 'hanning':
      return 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
    case 'hamming':
      return 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    case 'blackman':
      return (
        0.42 -
        0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) +
        0.08 * Math.cos((4 * Math.PI * n) / (N - 1))
      );
    case 'rectangular':
    default:
      return 1;
  }
}

export function simpleFFT(
  data: { x: number; y: number }[],
  config: FourierConfig,
): { frequency: number; amplitude: number }[] {
  const N = Math.min(config.windowSize, data.length);
  const result: { frequency: number; amplitude: number }[] = [];
  const freqStep = config.sampleRate / N;

  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N; n++) {
      const w = windowFactor(config.windowFunction, n, N);
      const y = (data[n]?.y ?? 0) * w;
      const angle = (-2 * Math.PI * k * n) / N;
      real += y * Math.cos(angle);
      imag += y * Math.sin(angle);
    }
    const amplitude = Math.sqrt(real * real + imag * imag) / N;
    result.push({
      frequency: k * freqStep,
      amplitude: Number(amplitude.toFixed(4)),
    });
  }
  return result;
}

export function applyFilter(
  spectrum: { frequency: number; amplitude: number }[],
  config: FourierConfig,
): { frequency: number; amplitude: number }[] {
  return spectrum.map((bin) => {
    let gain = 1;
    if (bin.frequency < config.highPassCutoff) {
      const ratio = bin.frequency / Math.max(config.highPassCutoff, 0.001);
      gain = ratio * ratio;
    } else if (bin.frequency > config.lowPassCutoff) {
      const ratio = config.lowPassCutoff / Math.max(bin.frequency, 0.001);
      gain = ratio * ratio;
    }
    return {
      frequency: bin.frequency,
      amplitude: Number((bin.amplitude * gain).toFixed(4)),
    };
  });
}

export function computeDraftRows(
  rows: DataRow[],
  config: FourierConfig,
  draftId: string,
): DataRow[] {
  const validPoints = rows
    .filter((r) => r.xValue !== null && r.yValue !== null)
    .map((r) => ({ x: r.xValue as number, y: r.yValue as number }));

  const spectrum = simpleFFT(validPoints, config);
  const filtered = applyFilter(spectrum, config);

  return rows.map((row, idx) => {
    const specIdx = Math.min(idx, spectrum.length - 1);
    return {
      ...row,
      fftAmplitude: row.isEmpty ? null : spectrum[specIdx]?.amplitude ?? row.fftAmplitude,
      filteredAmplitude: row.isEmpty ? null : filtered[specIdx]?.amplitude ?? row.filteredAmplitude,
      draftId,
    };
  });
}

export interface BoundaryCondition {
  name: string;
  generator: () => { x: number; y: number }[];
  expected: string;
  validator: (output: { frequency: number; amplitude: number }[]) => boolean;
}

export const defaultBoundaryConditions: BoundaryCondition[] = [
  {
    name: '零输入信号',
    generator: () => Array.from({ length: 32 }, (_, i) => ({ x: i, y: 0 })),
    expected: '输出全为0，残差 < 0.001',
    validator: (out) => out.every((p) => Math.abs(p.amplitude) < 0.001),
  },
  {
    name: '纯直流信号',
    generator: () => Array.from({ length: 32 }, (_, i) => ({ x: i, y: 1 })),
    expected: '输出恒定，无振荡',
    validator: (out) => {
      if (out.length < 2) return false;
      const first = out[0].amplitude;
      return out.every((p) => Math.abs(p.amplitude - first) < 0.01);
    },
  },
  {
    name: '截止频率处单频信号',
    generator: () =>
      Array.from({ length: 64 }, (_, i) => ({
        x: i,
        y: Math.sin((2 * Math.PI * 150 * i) / 1000),
      })),
    expected: '衰减 > 3dB',
    validator: (out) => {
      const peak = Math.max(...out.map((p) => Math.abs(p.amplitude)));
      return peak < 0.708;
    },
  },
  {
    name: '奈奎斯特频率处信号',
    generator: () =>
      Array.from({ length: 32 }, (_, i) => ({ x: i, y: i % 2 === 0 ? 1 : -1 })),
    expected: '完全滤除',
    validator: (out) => Math.max(...out.map((p) => Math.abs(p.amplitude))) < 0.01,
  },
  {
    name: '阶跃信号',
    generator: () =>
      Array.from({ length: 64 }, (_, i) => ({ x: i, y: i < 32 ? 0 : 1 })),
    expected: '无明显超调',
    validator: (out) => Math.max(...out.map((p) => p.amplitude)) < 1.15,
  },
];

export function generateCounterExamples(
  draftId: string,
  config: FourierConfig,
  conditions: BoundaryCondition[] = defaultBoundaryConditions,
): CounterExample[] {
  return conditions.map((cond) => {
    const input = cond.generator();
    const spectrum = simpleFFT(input, config);
    const filtered = applyFilter(spectrum, config);
    const passed = cond.validator(filtered);
    return {
      id: uid(),
      draftId,
      boundaryCondition: cond.name,
      inputData: input,
      expectedOutput: cond.expected,
      actualOutput: passed
        ? '符合预期'
        : `峰值 ${Math.max(...filtered.map((p) => p.amplitude)).toFixed(4)} 超出阈值`,
      passed,
    };
  });
}
