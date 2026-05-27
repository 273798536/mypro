import { computeSedimentation } from '@/lib/sedimentation';
import type { Sample } from '@/types';

export const SEED_SAMPLES: Sample[] = [
  computeSedimentation({
    diameter: { value: 50, unit: 'um' },
    particleDensity: 2650,
    liquidViscosity: 0.001,
    temperature: 25,
    observationHeight: 0.2,
    source: '批次A-001 · 石英砂',
    note: '正常样本 · Stokes 层流区',
    corrections: [],
    raw: 'd=50um ρp=2650 μ=0.001 T=25 H=0.2 src="批次A-001" note="正常样本"',
  }),
  computeSedimentation({
    diameter: { value: 600, unit: 'um' },
    particleDensity: 2650,
    liquidViscosity: 0.0006,
    temperature: 25,
    observationHeight: 0.2,
    source: '批次A-002 · 粗砂（水温已查表修正）',
    note: '边界样本 · Re 接近 1',
    corrections: ['黏度按 25℃ 查表修正为 0.0006 Pa·s'],
    raw: 'd=600um ρp=2650 μ=0.0006 T=25 H=0.2 src="批次A-002" note="边界样本"',
  }),
  computeSedimentation({
    diameter: { value: 50, unit: 'um' },
    particleDensity: 2650,
    liquidViscosity: 0.001,
    temperature: null,
    observationHeight: 0.2,
    source: '批次A-003 · 温度缺失',
    note: '明显坏数据 · 温度未记录',
    corrections: [],
    raw: 'd=50um ρp=2650 μ=0.001 H=0.2 src="批次A-003" note="温度缺失"',
  }),
];
