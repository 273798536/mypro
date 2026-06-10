import type { FormulaMeta, CalculationParams } from '@/types';

export const DEFAULT_PARAMS: CalculationParams = {
  minQualityScore: 20,
  minCoverageDepth: 100,
  mutationFrequencyThreshold: 5,
  targetRegionLength: 500,
};

export const FORMULA_METAS: FormulaMeta[] = [
  {
    name: '突变频率',
    expression: 'MF = (突变读段数 / 总读段数) × 100%',
    variables: [
      { symbol: 'MF', meaning: 'Mutation Frequency 突变频率', unit: '%' },
      { symbol: '突变读段数', meaning: '支持该突变位点的测序读段数量', unit: '条' },
      { symbol: '总读段数', meaning: '覆盖该位点的所有测序读段数', unit: '条' },
    ],
    unit: '%',
    applicableRange: '适用于体细胞突变检测，总读段数 ≥ 100 条时结果可靠',
    failureReasons: [
      '总读段数为 0，无法计算',
      '突变读段数大于总读段数，数据异常',
      '总读段数 < 30，统计效力不足',
    ],
  },
  {
    name: '等位基因频率',
    expression: 'AF = 突变读段数 / (2 × 总读段数) × 100%',
    variables: [
      { symbol: 'AF', meaning: 'Allele Frequency 等位基因频率', unit: '%' },
      { symbol: '2', meaning: '二倍体生物每个位点有两个等位基因', unit: '-' },
    ],
    unit: '%',
    applicableRange: '仅适用于二倍体生物的杂合位点检测，纯合突变需另行校正',
    failureReasons: [
      '总读段数为 0，无法计算',
      '非二倍体样本（如单倍体、多倍体）不适用',
      '样本类型为线粒体或质粒 DNA，不适用',
    ],
  },
  {
    name: '覆盖深度',
    expression: 'CD = 总读段数 / 目标区域长度',
    variables: [
      { symbol: 'CD', meaning: 'Coverage Depth 覆盖深度', unit: '×' },
      { symbol: '目标区域长度', meaning: '测序捕获或扩增的目标 DNA 片段长度', unit: 'bp' },
    ],
    unit: '×',
    applicableRange: '目标区域长度 > 0 时有效，建议 CD ≥ 100× 用于临床级检测',
    failureReasons: [
      '目标区域长度为 0 或负数',
      '总读段数过低（< 50），覆盖深度不足',
      '目标区域未捕获，读段无法比对到目标区',
    ],
  },
];

export function calculateMutationFrequency(
  mutantReads: number,
  totalReads: number
): { value: number; pass: boolean; reason?: string } {
  if (totalReads === 0) {
    return { value: 0, pass: false, reason: '总读段数为 0，无法计算突变频率' };
  }
  if (mutantReads > totalReads) {
    return { value: 0, pass: false, reason: '突变读段数大于总读段数，数据异常' };
  }
  if (totalReads < 30) {
    const value = (mutantReads / totalReads) * 100;
    return { value, pass: false, reason: `总读段数 ${totalReads} < 30，统计效力不足，结果仅供参考` };
  }
  const value = (mutantReads / totalReads) * 100;
  return { value, pass: true };
}

export function calculateAlleleFrequency(
  mutantReads: number,
  totalReads: number
): { value: number; pass: boolean; reason?: string } {
  if (totalReads === 0) {
    return { value: 0, pass: false, reason: '总读段数为 0，无法计算等位基因频率' };
  }
  if (mutantReads > totalReads * 2) {
    return { value: 0, pass: false, reason: '突变读段数异常，超出二倍体理论上限' };
  }
  const value = mutantReads / (2 * totalReads) * 100;
  return { value, pass: true };
}

export function calculateCoverageDepth(
  totalReads: number,
  targetRegionLength: number
): { value: number; pass: boolean; reason?: string } {
  if (targetRegionLength <= 0) {
    return { value: 0, pass: false, reason: '目标区域长度必须大于 0' };
  }
  if (totalReads < 50) {
    const value = totalReads / targetRegionLength;
    return { value, pass: false, reason: `总读段数 ${totalReads} < 50，覆盖深度严重不足` };
  }
  const value = totalReads / targetRegionLength;
  return { value, pass: true };
}

export function determineConclusion(
  mutationFrequency: number,
  coverageDepth: number,
  qualityScore: number,
  params: CalculationParams
): '阳性' | '阴性' | '不确定' {
  if (
    qualityScore < params.minQualityScore ||
    coverageDepth < params.minCoverageDepth
  ) {
    return '不确定';
  }
  if (mutationFrequency >= params.mutationFrequencyThreshold) {
    return '阳性';
  }
  return '阴性';
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
