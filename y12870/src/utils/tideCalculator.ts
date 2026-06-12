import type { TidalHarmonic, TidalPoint } from '@/types';

const SPEED: Record<string, number> = {
  M2: 28.984104, S2: 30.0, K1: 15.041069, O1: 13.943036,
  P1: 14.958931, K2: 30.082138, N2: 28.439729, Q1: 13.398661,
  M4: 57.968208, MS4: 58.984104,
};

const NODE_F: Record<string, { f: number; u: number; V0: number }> = {
  M2: { f: 1.0, u: 0, V0: 0 },
  S2: { f: 1.0, u: 0, V0: 0 },
  K1: { f: 1.0, u: 0, V0: 0 },
  O1: { f: 0.98, u: 2.1, V0: 120 },
  P1: { f: 1.0, u: 0, V0: 0 },
  K2: { f: 1.0, u: 0, V0: 0 },
  N2: { f: 1.0, u: 0, V0: 320 },
  Q1: { f: 0.95, u: 3.2, V0: 280 },
  M4: { f: 1.0, u: 0, V0: 0 },
  MS4: { f: 1.0, u: 0, V0: 0 },
};

const MAJOR_CONSTITUENTS = ['M2', 'S2', 'K1', 'O1'];

export function evaluateHarmonicCoverage(inputs: TidalHarmonic[]): {
  coverage: number; missingMajor: string[]; confidence: number;
} {
  const names = new Set(inputs.map(h => h.constituent));
  const missingMajor = MAJOR_CONSTITUENTS.filter(c => !names.has(c));
  const coverage = inputs.length / (MAJOR_CONSTITUENTS.length + 4);
  let confidence = 0.95;
  if (missingMajor.length >= 2) confidence = 0.45;
  else if (missingMajor.length === 1) confidence = 0.72;
  else if (inputs.length < 6) confidence = 0.82;
  return { coverage: Math.min(1, coverage), missingMajor, confidence };
}

function juncDateToHours(base: Date): number {
  const y = base.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  return (base.getTime() - start) / 3600000;
}

export function calculateTidalSeries(
  harmonics: TidalHarmonic[],
  startDate: Date,
  hours: number = 72,
  stepHours: number = 1
): TidalPoint[] {
  const result: TidalPoint[] = [];
  const baseT0 = juncDateToHours(startDate);
  const evalRes = evaluateHarmonicCoverage(harmonics);
  const A0 = 180;

  let prev: number | null = null;
  let prevTrend: 'up' | 'down' | null = null;

  for (let h = 0; h <= hours; h += stepHours) {
    const t = baseT0 + h;
    let level = A0;
    harmonics.forEach(hc => {
      const sp = SPEED[hc.constituent] || 15;
      const nf = NODE_F[hc.constituent] || { f: 1, u: 0, V0: 0 };
      const theta = (sp * t + nf.V0 + nf.u - hc.phase) * Math.PI / 180;
      level += nf.f * hc.amplitude * Math.cos(theta);
    });
    level = level / 100;

    let type: 'H' | 'L' | null = null;
    if (prev !== null) {
      const curTrend = level > prev ? 'up' : 'down';
      if (prevTrend && curTrend !== prevTrend) {
        type = prevTrend === 'up' ? 'H' : 'L';
      }
      prevTrend = curTrend;
    }
    prev = level;

    const time = new Date(startDate.getTime() + h * 3600000);
    result.push({
      time: time.toISOString().slice(0, 16).replace('T', ' '),
      level: +level.toFixed(3),
      type,
      confidence: +(evalRes.confidence + Math.sin(h / 6) * 0.02 - 0.01).toFixed(2),
    });
  }
  return result;
}

export function getHighLowTides(series: TidalPoint[]): TidalPoint[] {
  return series.filter(p => p.type);
}

export function getSourceMaterials(harmonics: TidalHarmonic[]): string[] {
  const set = new Set(harmonics.map(h => h.sourceMaterial).filter(Boolean));
  return Array.from(set);
}
