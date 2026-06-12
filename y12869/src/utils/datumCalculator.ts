export function correctDepth(rawDepth: number, tideCorrection: number, datumCorrection: number): number {
  return +(rawDepth + tideCorrection + datumCorrection).toFixed(3);
}

export function isNegativeDepthAnomaly(correctedDepth: number, sigma = 0.15, threshold = 3): boolean {
  if (correctedDepth >= 0) return false;
  return Math.abs(correctedDepth) > threshold * sigma;
}

export function generateTideCorrection(hour: number, baseHeight = 1.2): number {
  const phase = (hour / 24) * Math.PI * 2;
  return +(baseHeight * Math.sin(phase - Math.PI / 2) + 0.3).toFixed(3);
}

export function calcMismatch(a: number, b: number, ratio = 0.2): { mismatch: boolean; diff: number } {
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2 || 1;
  return { mismatch: diff / avg > ratio, diff: +diff.toFixed(3) };
}

export const DATUM_85 = 2.34;
export const DATUM_LOCAL_OFFSET = -0.12;

export function toLocalDatum(value: number): number {
  return +(value + DATUM_LOCAL_OFFSET).toFixed(3);
}

export const NEGATIVE_DEPTH_EXPLAIN_STEPS = [
  {
    title: '步骤一：原始测深值采集',
    description: '多波束测深仪通过声学换能器向河床发射超声波，记录往返时间 t，声速 c=1500 m/s，原始水深 rawDepth = c × t / 2。测量存在系统不确定度 σ（本报告 σ = 0.15 m）。',
    formula: 'rawDepth = (c × t) / 2',
  },
  {
    title: '步骤二：潮汐动态修正',
    description: '原始测深相对于测量瞬时的水面，需换算至统一基准面（1985 国家高程基准）。修正量为潮汐表中该时刻的潮高 tideCorrection。',
    formula: 'tideCorrection = H_tide(t_measure)',
  },
  {
    title: '步骤三：局部基准面换算',
    description: '项目采用当地理论深度基准面与 1985 国家高程基准之间的固定偏移 datumCorrection（本项目 = -0.12 m）。',
    formula: 'datumCorrection = -0.12 m',
  },
  {
    title: '步骤四：计算修正后深度',
    description: '三者相加得到最终修正深度 correctedDepth。当 correctedDepth < 0 时，表示测量点"高于"当地理论基准面。',
    formula: 'correctedDepth = rawDepth + tideCorrection + datumCorrection',
  },
  {
    title: '步骤五：3σ 异常判别',
    description: '若 correctedDepth < 0 且 |correctedDepth| > 3 × σ（σ=0.15 m，即阈值 = 0.45 m），判定为深度负值异常，予以拦截，不参与淤积统计。',
    formula: '拦截条件：correctedDepth < -0.45 m',
  },
];
