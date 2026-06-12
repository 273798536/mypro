import {
  PlanktonSample,
  WaterQuality,
  RiskAlert,
  VersionHistory,
  ReviewRecord,
  SPECIES_LIST,
  BUOY_LIST,
} from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(20260612);

export function generateMockSamples(): PlanktonSample[] {
  const samples: PlanktonSample[] = [];
  const positions: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < 120; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() * 18 + 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    let layerIndex: number;
    const r = rand();
    if (r < 0.45) layerIndex = 0;
    else if (r < 0.8) layerIndex = 1;
    else layerIndex = 2;

    const y = layerIndex === 0
      ? randomInRange(12, 18)
      : layerIndex === 1
      ? randomInRange(4, 10)
      : randomInRange(-10, 2);

    positions.push({ x, y, z });

    const species = SPECIES_LIST[Math.floor(rand() * SPECIES_LIST.length)];
    const buoy = BUOY_LIST[Math.floor(rand() * BUOY_LIST.length)];
    const baseCount = Math.floor(rand() * 480) + 20;

    const waterLayer = layerIndex === 0 ? 'surface' : layerIndex === 1 ? 'middle' : 'deep';

    samples.push({
      id: `sample-${String(i + 1).padStart(3, '0')}`,
      species,
      count: baseCount,
      originalCount: baseCount,
      x,
      y,
      z,
      waterLayer,
      buoyId: buoy,
      status: 'pending',
      riskLevel: 'none',
      sampledAt: `2026-06-${String(Math.floor(rand() * 8) + 5).padStart(2, '0')} ${String(Math.floor(rand() * 12) + 6).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
    });
  }

  // 注入真实边界情况1：浮标离线（连续采样点 BOU-B01 无更新，标记 high 风险）
  const offlineBuoySamples = samples.filter(s => s.buoyId === 'BOU-B01' && s.waterLayer === 'surface').slice(0, 4);
  offlineBuoySamples.forEach(s => {
    s.riskLevel = 'high';
    s.status = 'pending';
    s.count = Math.floor(s.count * 0.65);
    s.notes = '浮标 BOU-B01 通讯中断超过 6 小时，数据完整性存疑';
  });

  // 注入真实边界情况2：计数异常（同一水层同一物种远超均值3倍标准差）
  const anomalySample = samples.find(s => s.species === '夜光藻' && s.waterLayer === 'surface');
  if (anomalySample) {
    anomalySample.count = 1850;
    anomalySample.originalCount = 1850;
    anomalySample.riskLevel = 'low';
    anomalySample.status = 'pending';
    anomalySample.notes = '计数显著高于同水层同期均值，疑似赤潮前兆，需人工复核';
  }

  // 注入真实边界情况3：部分已复核/已确认的数据
  const confirmedSamples = samples.slice(20, 28);
  confirmedSamples.forEach(s => {
    s.status = 'confirmed';
    s.riskLevel = 'none';
  });

  const reviewedSamples = samples.slice(50, 58);
  reviewedSamples.forEach(s => {
    s.status = 'reviewed';
  });

  // 注入真实边界情况4：复核备注改变了判断的样本
  const revisedSample = samples[35];
  if (revisedSample) {
    revisedSample.originalCount = 320;
    revisedSample.count = 110;
    revisedSample.status = 'reviewed';
    revisedSample.notes = '复核发现原始计数混入杂质颗粒，实际有效个体数修正为 110，风险等级由 medium 下调为 low';
    revisedSample.riskLevel = 'low';
  }

  return samples;
}

export function generateMockWaterQualities(samples: PlanktonSample[]): WaterQuality[] {
  const qualities: WaterQuality[] = [];

  samples.forEach((sample, idx) => {
    // 真实边界情况：水质记录缺失（约12%的样本缺少部分或全部水质参数）
    const isMissingCase = (idx % 8 === 3) || (idx % 11 === 5);
    const missingFields: string[] = [];

    if (isMissingCase) {
      if (rand() > 0.5) missingFields.push('temperature');
      if (rand() > 0.4) missingFields.push('salinity');
      if (rand() > 0.6) missingFields.push('ph');
      if (rand() > 0.5) missingFields.push('dissolvedOxygen');
    }

    qualities.push({
      id: `wq-${sample.id}`,
      sampleId: sample.id,
      temperature: missingFields.includes('temperature') ? undefined : Number((randomInRange(18, 28)).toFixed(1)),
      salinity: missingFields.includes('salinity') ? undefined : Number((randomInRange(28, 35)).toFixed(1)),
      ph: missingFields.includes('ph') ? undefined : Number((randomInRange(7.8, 8.6)).toFixed(2)),
      dissolvedOxygen: missingFields.includes('dissolvedOxygen') ? undefined : Number((randomInRange(4.5, 8.5)).toFixed(1)),
      isMissing: missingFields.length > 0,
      missingFields,
    });
  });

  return qualities;
}

export function generateMockRisks(samples: PlanktonSample[], qualities: WaterQuality[]): RiskAlert[] {
  const risks: RiskAlert[] = [];

  // 浮标离线风险
  const offlineBuoySamples = samples.filter(s => s.riskLevel === 'high' && s.buoyId === 'BOU-B01');
  offlineBuoySamples.slice(0, 1).forEach(s => {
    risks.push({
      id: `risk-${generateId()}`,
      sampleId: s.id,
      type: 'buoy_offline',
      level: 'high',
      description: `浮标 ${s.buoyId} 连续 4 个采样周期无数据回传，最后通讯时间 ${s.sampledAt}`,
      suggestion: '建议：1) 检查浮标供电与通讯模块；2) 邻近浮标数据交叉验证；3) 降低该区域计数置信度 35%',
      isResolved: false,
      createdAt: s.sampledAt,
    });
  });

  // 水质缺失风险
  qualities.filter(q => q.isMissing).slice(0, 3).forEach(q => {
    risks.push({
      id: `risk-${generateId()}`,
      sampleId: q.sampleId,
      type: 'water_missing',
      level: 'medium',
      description: `样本 ${q.sampleId} 水质参数缺失：${q.missingFields?.join('、')}`,
      suggestion: '建议：1) 补录缺失水质数据；2) 暂以估算值参与统计，置信度标记为 low',
      isResolved: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  });

  // 计数异常风险
  const anomalySample = samples.find(s => s.notes?.includes('赤潮前兆'));
  if (anomalySample) {
    risks.push({
      id: `risk-${generateId()}`,
      sampleId: anomalySample.id,
      type: 'count_anomaly',
      level: 'low',
      description: `样本 ${anomalySample.id}(${anomalySample.species}) 计数值 ${anomalySample.count}，超过同水层同期均值 3.1 倍标准差`,
      suggestion: '建议：1) 人工镜检复核原始样本；2) 结合周边站点确认是否存在局地聚集；3) 密切关注后续 48 小时趋势',
      isResolved: false,
      createdAt: anomalySample.sampledAt,
    });
  }

  return risks;
}

export function generateMockReviews(samples: PlanktonSample[]): ReviewRecord[] {
  const reviews: ReviewRecord[] = [];

  const revisedSample = samples[35];
  if (revisedSample) {
    reviews.push({
      id: `review-${generateId()}`,
      sampleId: revisedSample.id,
      reviewer: '李教练',
      note: '原始样本照片复核发现约 65% 为悬浮有机颗粒而非活体浮游生物，修正计数值并下调风险等级。',
      originalCount: revisedSample.originalCount || revisedSample.count,
      revisedCount: revisedSample.count,
      judgmentChange: true,
      reviewedAt: '2026-06-11 14:32',
    });
  }

  samples.slice(50, 56).forEach((s, idx) => {
    reviews.push({
      id: `review-${generateId()}`,
      sampleId: s.id,
      reviewer: idx % 2 === 0 ? '王教练' : '张教练',
      note: idx % 3 === 0 ? '复核通过，数据正常' : '镜检确认，与自动计数结果一致',
      originalCount: s.count,
      revisedCount: s.count,
      judgmentChange: false,
      reviewedAt: `2026-06-${String(10 + idx).padStart(2, '0')} ${String(9 + idx).padStart(2, '0')}:15`,
    });
  });

  return reviews;
}

export function generateInitialVersions(samples: PlanktonSample[]): VersionHistory[] {
  const versions: VersionHistory[] = [];

  versions.push({
    id: `v-${generateId()}`,
    action: 'import',
    operator: '系统导入',
    description: '首次导入 2026-06-05 至 2026-06-12 浮游生物采样数据，共 120 条记录',
    snapshot: JSON.parse(JSON.stringify(samples)),
    diff: {},
    createdAt: '2026-06-12 08:00',
  });

  const revisedSamples = JSON.parse(JSON.stringify(samples));
  const target = revisedSamples[35];
  if (target) {
    target.originalCount = 320;
    target.count = 110;
    target.status = 'reviewed';
    target.riskLevel = 'low';
    target.notes = '复核发现原始计数混入杂质颗粒，实际有效个体数修正为 110';
  }

  versions.push({
    id: `v-${generateId()}`,
    action: 'revise',
    operator: '李教练',
    description: `修正样本 sample-036 计数值（320 → 110），调整风险等级（medium → low），复核备注改变了判定结论`,
    snapshot: revisedSamples,
    diff: {
      'sample-036': {
        before: { count: 320, riskLevel: 'medium', status: 'pending' },
        after: { count: 110, riskLevel: 'low', status: 'reviewed', note: '复核发现杂质颗粒' },
      },
    },
    createdAt: '2026-06-11 14:32',
  });

  const confirmedSamples = JSON.parse(JSON.stringify(revisedSamples));
  confirmedSamples.slice(20, 28).forEach((s: PlanktonSample) => {
    s.status = 'confirmed';
  });

  versions.push({
    id: `v-${generateId()}`,
    action: 'confirm',
    operator: '王教练',
    description: '确认 8 条样本数据为最终版本',
    snapshot: confirmedSamples,
    diff: Object.fromEntries(
      confirmedSamples.slice(20, 28).map((s: PlanktonSample) => [
        s.id,
        { before: { status: 'pending' }, after: { status: 'confirmed' } },
      ]),
    ),
    createdAt: '2026-06-12 09:15',
  });

  return versions;
}

export const INITIAL_SAMPLES = generateMockSamples();
export const INITIAL_WATER_QUALITIES = generateMockWaterQualities(INITIAL_SAMPLES);
export const INITIAL_RISKS = generateMockRisks(INITIAL_SAMPLES, INITIAL_WATER_QUALITIES);
export const INITIAL_REVIEWS = generateMockReviews(INITIAL_SAMPLES);
export const INITIAL_VERSIONS = generateInitialVersions(INITIAL_SAMPLES);
