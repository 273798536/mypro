import type { DiameterUnit, Sample, SampleStatus } from '@/types';

export const G = 9.81;
export const RHO_LIQUID = 1000;

export function diameterToMeters(value: number, unit: DiameterUnit): number {
  switch (unit) {
    case 'um':
      return value * 1e-6;
    case 'mm':
      return value * 1e-3;
    case 'cm':
      return value * 1e-2;
  }
}

export function parseDiameterToken(raw: string): { value: number; unit: DiameterUnit } | { error: string } {
  const m = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*(μm|um|µm|mm|cm)$/i);
  if (!m) return { error: `粒径格式错误，需形如 "100μm / 0.1mm / 0.01cm` };
  const value = parseFloat(m[1]);
  const unitRaw = m[2].toLowerCase().replace('µ', 'u');
  const unit = (unitRaw === 'μm' || unitRaw === 'um' ? 'um' : unitRaw) as DiameterUnit;
  return { value, unit };
}

export function classifyStatus(re: number | null, hasTemp: boolean, errs: string[]): SampleStatus {
  if (errs.length > 0 || !hasTemp) return 'error';
  if (re === null) return 'error';
  if (re >= 2) return 'error';
  if (re >= 1) return 'boundary';
  return 'normal';
}

export interface ComputeResult {
  sample: Sample;
}

export interface ComputeInput {
  diameter: { value: number; unit: DiameterUnit };
  particleDensity: number;
  liquidViscosity: number;
  temperature: number | null;
  observationHeight: number;
  source: string;
  note: string;
  corrections: string[];
  raw: string;
}

export function computeSedimentation(input: ComputeInput): Sample {
  const errors: string[] = [];
  const { diameter, particleDensity, liquidViscosity, temperature } = input;

  if (diameter.value <= 0) errors.push('粒径必须为正数');
  if (particleDensity <= 0) errors.push('颗粒密度必须为正数');
  if (liquidViscosity <= 0) errors.push('液体黏度必须为正数');
  if (input.observationHeight <= 0) errors.push('观测高度必须为正数');
  if (temperature === null || Number.isNaN(temperature)) {
    errors.push('温度缺失，无法参与计算');
  }

  let stokesVelocity: number | null = null;
  let reynolds: number | null = null;

  if (errors.length === 0 && temperature !== null) {
    const d = diameterToMeters(diameter.value, diameter.unit);
    const denom = 18 * liquidViscosity;
    stokesVelocity = (G * d * d * (particleDensity - RHO_LIQUID)) / denom;
    if (stokesVelocity < 0) {
      errors.push('颗粒密度小于液体密度，Stokes 近似不适用（上浮颗粒）');
      stokesVelocity = null;
    } else {
      reynolds = (RHO_LIQUID * stokesVelocity * d) / liquidViscosity;
      if (reynolds >= 2) errors.push('雷诺数 ' + reynolds.toFixed(3) + ' 超 Stokes 适用范围(Re >= 2)');
      else if (reynolds >= 1) errors.push('雷诺数 ' + reynolds.toFixed(3) + ' 接近边界(1 <= Re < 2)');
    }
  }

  const hasTemp = temperature !== null && !Number.isNaN(temperature);
  const status = classifyStatus(reynolds, hasTemp, errors);

  return {
    id: crypto.randomUUID(),
    diameter,
    particleDensity,
    liquidViscosity,
    temperature,
    observationHeight: input.observationHeight,
    source: input.source,
    note: input.note,
    corrections: input.corrections,
    status,
    errors,
    stokesVelocity,
    reynolds,
    createdAt: new Date().toISOString(),
    raw: input.raw,
  };
}

export function formatVelocity(v: number | null): string {
  if (v === null) return '—';
  if (v < 1e-3) return `${(v * 1e6).toFixed(2)} μm/s`;
  if (v < 1) return `${(v * 1e3).toFixed(3)} mm/s`;
  return `${v.toFixed(3)} m/s`;
}

export function formatRe(re: number | null): string {
  return re === null ? '—' : re.toFixed(3);
}
