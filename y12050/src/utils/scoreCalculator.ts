import type { ScanParams, Level, ParamConflict, SettlementResult, ScoreItem, ImageQuality } from '@/types';
import { getImageQuality } from './conflictDetector';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function calcSNRScore(
  params: ScanParams,
  opt: ScanParams,
  ranges: Level['paramRanges'],
  conflicts: ParamConflict[]
): ScoreItem {
  const hasConflict = conflicts.some(
    (c) => c.params.includes('TR') || c.params.includes('NEX')
  );
  if (hasConflict) {
    return {
      name: '信噪比',
      score: 0,
      maxScore: 25,
      weight: 0.25,
      explanation: `参数冲突导致信噪比得分为0：${conflicts
        .filter((c) => c.params.includes('TR') || c.params.includes('NEX'))
        .map((c) => c.message)
        .join('；')}`,
      relatedParams: ['TR', 'NEX'],
    };
  }
  const trDev = Math.abs(opt.TR - params.TR) / (ranges.TR.max - ranges.TR.min);
  const nexDev = Math.abs(opt.NEX - params.NEX) / (ranges.NEX.max - ranges.NEX.min);
  const raw = (1 - trDev) * (1 - nexDev);
  const score = Math.round(clamp(raw, 0, 1) * 25);
  const trPct = ((params.TR - opt.TR) / opt.TR * 100).toFixed(0);
  const nexPct = ((params.NEX - opt.NEX) / opt.NEX * 100).toFixed(0);
  return {
    name: '信噪比',
    score,
    maxScore: 25,
    weight: 0.25,
    explanation: `TR=${params.TR}ms(最优${opt.TR}ms，偏差${trPct}%)，NEX=${params.NEX}(最优${opt.NEX}，偏差${nexPct}%)，信噪比得分${score}/25`,
    relatedParams: ['TR', 'NEX'],
  };
}

function calcContrastScore(
  params: ScanParams,
  opt: ScanParams,
  ranges: Level['paramRanges'],
  conflicts: ParamConflict[]
): ScoreItem {
  const hasConflict = conflicts.some(
    (c) => c.params.includes('TE') || c.params.includes('TR')
  );
  if (hasConflict) {
    return {
      name: '对比度',
      score: 0,
      maxScore: 25,
      weight: 0.25,
      explanation: `参数冲突导致对比度得分为0：${conflicts
        .filter((c) => c.params.includes('TE') || c.params.includes('TR'))
        .map((c) => c.message)
        .join('；')}`,
      relatedParams: ['TE', 'TR'],
    };
  }
  const teDev = Math.abs(opt.TE - params.TE) / (ranges.TE.max - ranges.TE.min);
  const trDev = Math.abs(opt.TR - params.TR) / (ranges.TR.max - ranges.TR.min);
  const raw = (1 - teDev) * (1 - trDev);
  const score = Math.round(clamp(raw, 0, 1) * 25);
  const tePct = ((params.TE - opt.TE) / opt.TE * 100).toFixed(0);
  return {
    name: '对比度',
    score,
    maxScore: 25,
    weight: 0.25,
    explanation: `TE=${params.TE}ms(最优${opt.TE}ms，偏差${tePct}%)，对比度得分${score}/25`,
    relatedParams: ['TE', 'TR'],
  };
}

function calcResolutionScore(
  params: ScanParams,
  opt: ScanParams,
  ranges: Level['paramRanges'],
  conflicts: ParamConflict[]
): ScoreItem {
  const hasConflict = conflicts.some(
    (c) => c.params.includes('matrix') || c.params.includes('sliceThickness')
  );
  if (hasConflict) {
    return {
      name: '空间分辨率',
      score: 0,
      maxScore: 20,
      weight: 0.2,
      explanation: `参数冲突导致空间分辨率得分为0：${conflicts
        .filter((c) => c.params.includes('matrix') || c.params.includes('sliceThickness'))
        .map((c) => c.message)
        .join('；')}`,
      relatedParams: ['matrix', 'sliceThickness'],
    };
  }
  const matDev = Math.abs(opt.matrix - params.matrix) / (ranges.matrix.max - ranges.matrix.min);
  const slcDev = Math.abs(opt.sliceThickness - params.sliceThickness) / (ranges.sliceThickness.max - ranges.sliceThickness.min);
  const raw = (1 - matDev) * (1 - slcDev);
  const score = Math.round(clamp(raw, 0, 1) * 20);
  return {
    name: '空间分辨率',
    score,
    maxScore: 20,
    weight: 0.2,
    explanation: `矩阵=${params.matrix}(最优${opt.matrix})，层厚=${params.sliceThickness}mm(最优${opt.sliceThickness}mm)，分辨率得分${score}/20`,
    relatedParams: ['matrix', 'sliceThickness'],
  };
}

function calcEfficiencyScore(
  scanTime: number,
  timeBudget: number,
  isTimeExceeded: boolean
): ScoreItem {
  if (isTimeExceeded) {
    return {
      name: '扫描效率',
      score: 0,
      maxScore: 20,
      weight: 0.2,
      explanation: `扫描时间${scanTime.toFixed(1)}s超出时间预算${timeBudget}s，扫描效率得分为0`,
      relatedParams: ['TR', 'matrix', 'NEX'],
    };
  }
  const ratio = scanTime / timeBudget;
  const score = Math.round((1 - ratio) * 20);
  return {
    name: '扫描效率',
    score: Math.max(0, score),
    maxScore: 20,
    weight: 0.2,
    explanation: `扫描时间${scanTime.toFixed(1)}s/预算${timeBudget}s(使用率${(ratio * 100).toFixed(0)}%)，效率得分${Math.max(0, score)}/20`,
    relatedParams: ['TR', 'matrix', 'NEX'],
  };
}

function calcArtifactScore(imageQuality: ImageQuality): ScoreItem {
  const artifactCount = imageQuality.artifacts.length;
  const maxArtifacts = 7;
  const score = Math.round((1 - artifactCount / maxArtifacts) * 10);
  const artifactNames: Record<string, string> = {
    noise: '噪声伪影',
    pixelation: '像素化',
    partial_volume: '部分容积效应',
    susceptibility: '磁化率伪影',
    motion: '运动伪影',
    aliasing: '卷折伪影',
    chemical_shift: '化学位移伪影',
  };
  const detected = imageQuality.artifacts.map((a) => artifactNames[a] || a);
  return {
    name: '伪影抑制',
    score: Math.max(0, score),
    maxScore: 10,
    weight: 0.1,
    explanation:
      detected.length > 0
        ? `检测到${detected.length}种伪影(${detected.join('、')})，伪影抑制得分${Math.max(0, score)}/10`
        : `未检测到明显伪影，伪影抑制得分10/10`,
    relatedParams: ['NEX', 'matrix', 'sliceThickness', 'TE', 'FOV'],
  };
}

export function calculateSettlement(
  params: ScanParams,
  level: Level,
  conflicts: ParamConflict[],
  scanTime: number,
  isTimeExceeded: boolean,
  badRows: SettlementResult['badRows']
): SettlementResult {
  const imageQuality = getImageQuality(params, level);

  const scoreItems: ScoreItem[] = [
    calcSNRScore(params, level.optimalParams, level.paramRanges, conflicts),
    calcContrastScore(params, level.optimalParams, level.paramRanges, conflicts),
    calcResolutionScore(params, level.optimalParams, level.paramRanges, conflicts),
    calcEfficiencyScore(scanTime, level.timeBudget, isTimeExceeded),
    calcArtifactScore(imageQuality),
  ];

  const totalScore = scoreItems.reduce((sum, item) => sum + item.score, 0);
  const maxScore = scoreItems.reduce((sum, item) => sum + item.maxScore, 0);

  return {
    totalScore,
    maxScore,
    scoreItems,
    scanTime,
    timeBudget: level.timeBudget,
    isTimeExceeded,
    conflicts,
    badRows,
    artifactTypes: imageQuality.artifacts,
    params: { ...params },
    timestamp: Date.now(),
    imageQuality,
  };
}
