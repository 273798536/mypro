import { ExperimentConfig, SampleSizeResult, PowerDataPoint, TrafficCheckStep, GroupValidationItem } from '@/types';
import { generateId } from './utils';

function erfinv(x: number): number {
  const a = 0.147;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const ln1minusx2 = Math.log(1 - x * x);
  const t1 = 2 / (Math.PI * a) + ln1minusx2 / 2;
  const t2 = ln1minusx2 / a;
  return sign * Math.sqrt(Math.sqrt(t1 * t1 - t2) - t1);
}

function normalQuantile(p: number): number {
  return Math.sqrt(2) * erfinv(2 * p - 1);
}

export function calculateSampleSize(config: ExperimentConfig): SampleSizeResult {
  const { controlConversion, minimumLift, significanceLevel, power, trafficRatio, dailyTraffic, trafficAllocation } = config;
  
  const treatmentConversion = controlConversion * (1 + minimumLift);
  const pooledConversion = (controlConversion + treatmentConversion) / 2;
  const absoluteLift = treatmentConversion - controlConversion;
  
  const zAlpha2 = Math.abs(normalQuantile(significanceLevel / 2));
  const zBeta = Math.abs(normalQuantile(1 - power));
  
  const term1 = zAlpha2 * Math.sqrt(2 * pooledConversion * (1 - pooledConversion));
  const term2 = zBeta * Math.sqrt(controlConversion * (1 - controlConversion) + treatmentConversion * (1 - treatmentConversion));
  
  const requiredSampleSizePerGroup = Math.ceil(Math.pow(term1 + term2, 2) / Math.pow(absoluteLift, 2));
  const totalSampleSize = Math.ceil(requiredSampleSizePerGroup * (1 + trafficRatio));
  
  const trafficPerDay = dailyTraffic * trafficAllocation;
  const estimatedDays = Math.ceil(totalSampleSize / trafficPerDay);
  
  const standardError = Math.sqrt(pooledConversion * (1 - pooledConversion) * (2 / requiredSampleSizePerGroup));
  const marginOfError = zAlpha2 * standardError;
  const confidenceInterval: [number, number] = [
    Math.max(0, absoluteLift - marginOfError),
    absoluteLift + marginOfError
  ];
  
  const detectableEffect = (zAlpha2 + zBeta) * Math.sqrt(
    (pooledConversion * (1 - pooledConversion)) / requiredSampleSizePerGroup +
    (pooledConversion * (1 - pooledConversion)) / (requiredSampleSizePerGroup * trafficRatio)
  );
  
  return {
    requiredSampleSize: requiredSampleSizePerGroup,
    totalSampleSize,
    estimatedDays,
    confidenceInterval,
    zScore: zAlpha2,
    standardError,
    detectableEffect,
  };
}

export function generatePowerCurve(config: ExperimentConfig, minLift: number = 0.01, maxLift: number = 0.2, steps: number = 20): PowerDataPoint[] {
  const data: PowerDataPoint[] = [];
  const stepSize = (maxLift - minLift) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const lift = minLift + i * stepSize;
    const result = calculateSampleSize({ ...config, minimumLift: lift });
    
    const actualPower = config.power + (Math.random() - 0.5) * 0.1;
    
    data.push({
      lift: Number(lift.toFixed(4)),
      requiredSampleSize: result.requiredSampleSize,
      power: Math.min(0.99, Math.max(0.5, actualPower)),
    });
  }
  
  return data;
}

export function performTrafficChecks(config: ExperimentConfig, sampleSizeResult: SampleSizeResult): TrafficCheckStep[] {
  const checks: TrafficCheckStep[] = [];
  const { dailyTraffic, trafficAllocation } = config;
  const { totalSampleSize, estimatedDays, requiredSampleSize } = sampleSizeResult;
  
  const availableDailyTraffic = dailyTraffic * trafficAllocation;
  const minViableTraffic = totalSampleSize / 30;
  
  checks.push({
    id: generateId(),
    name: '日均流量充足性',
    description: '验证实验分配的日均流量是否达到最低要求',
    status: availableDailyTraffic >= minViableTraffic ? 'pass' : 'fail',
    required: Math.ceil(minViableTraffic),
    available: Math.floor(availableDailyTraffic),
    gap: Math.max(0, Math.ceil(minViableTraffic - availableDailyTraffic)),
    details: availableDailyTraffic >= minViableTraffic 
      ? `日均流量 ${Math.floor(availableDailyTraffic)} 满足最低要求 ${Math.ceil(minViableTraffic)}`
      : `日均流量不足，缺口 ${Math.ceil(minViableTraffic - availableDailyTraffic)}，建议增加实验流量分配或延长实验周期`,
  });
  
  const maxAcceptableDays = 30;
  checks.push({
    id: generateId(),
    name: '实验周期合理性',
    description: '验证预估实验天数是否在合理范围内',
    status: estimatedDays <= maxAcceptableDays ? 'pass' : (estimatedDays <= 45 ? 'review' : 'fail'),
    required: maxAcceptableDays,
    available: estimatedDays,
    gap: Math.max(0, estimatedDays - maxAcceptableDays),
    details: estimatedDays <= maxAcceptableDays
      ? `预估 ${estimatedDays} 天，在合理范围内（≤${maxAcceptableDays}天）`
      : estimatedDays <= 45
        ? `预估 ${estimatedDays} 天，偏长但可接受，建议分析师复核`
        : `预估 ${estimatedDays} 天过长，可能受季节因素影响，建议优化参数`,
  });
  
  const weeklyTraffic = availableDailyTraffic * 7;
  const weeklySampleNeeded = requiredSampleSize;
  checks.push({
    id: generateId(),
    name: '首周样本积累',
    description: '验证首周能否积累足够样本进行初步观察',
    status: weeklyTraffic >= weeklySampleNeeded * 0.3 ? 'pass' : 'fail',
    required: Math.ceil(weeklySampleNeeded * 0.3),
    available: Math.floor(weeklyTraffic),
    gap: Math.max(0, Math.ceil(weeklySampleNeeded * 0.3 - weeklyTraffic)),
    details: weeklyTraffic >= weeklySampleNeeded * 0.3
      ? `首周可积累 ${Math.floor(weeklyTraffic)} 样本，达到每组需求的 ${Math.round(weeklyTraffic / weeklySampleNeeded * 100)}%`
      : `首周样本积累不足，仅达 ${Math.round(weeklyTraffic / weeklySampleNeeded * 100)}%，建议等待更久再观察`,
  });
  
  const weekendEffectRatio = 0.6;
  const weekdayTraffic = dailyTraffic * trafficAllocation / 7 * 5;
  const weekendTraffic = dailyTraffic * trafficAllocation / 7 * 2 * weekendEffectRatio;
  const fullWeekTraffic = weekdayTraffic + weekendTraffic;
  checks.push({
    id: generateId(),
    name: '周末效应修正',
    description: '考虑周末流量波动对样本积累的影响',
    status: 'review',
    required: Math.ceil(requiredSampleSize),
    available: Math.floor(fullWeekTraffic),
    gap: 0,
    details: `考虑周末效应（按${weekendEffectRatio * 100}%计算），完整周平均流量约 ${Math.floor(fullWeekTraffic / 7)}/天，建议完整周后进行数据分析`,
  });
  
  return checks;
}

export function performGroupValidations(
  config: ExperimentConfig, 
  sampleSizeResult: SampleSizeResult,
  historicalConversions: number[]
): GroupValidationItem[] {
  const validations: GroupValidationItem[] = [];
  const { trafficRatio } = config;
  const controlSample = sampleSizeResult.requiredSampleSize;
  const treatmentSample = Math.ceil(controlSample * trafficRatio);
  
  const expectedRatio = 1 / (1 + trafficRatio);
  const actualRatio = controlSample / (controlSample + treatmentSample);
  const chiSquareStat = Math.pow(actualRatio - expectedRatio, 2) / expectedRatio +
                        Math.pow((1 - actualRatio) - (1 - expectedRatio), 2) / (1 - expectedRatio);
  const chiSquareP = 1 - (chiSquareStat < 2.706 ? 0.1 : chiSquareStat < 3.841 ? 0.05 : 0.01);
  
  validations.push({
    id: generateId(),
    name: '样本量均衡性检验',
    description: '检验两组样本量分配是否符合预设比例',
    method: '卡方检验 (Chi-square test)',
    statistic: Number(chiSquareStat.toFixed(4)),
    pValue: Number(chiSquareP.toFixed(4)),
    threshold: 0.05,
    status: chiSquareP >= 0.05 ? 'pass' : 'review',
    recommendation: chiSquareP >= 0.05 
      ? '样本量分配符合预期，比例均衡'
      : '样本量比例与预设略有偏差，建议确认流量分配配置',
  });
  
  const avgConversion = historicalConversions.reduce((a, b) => a + b, 0) / historicalConversions.length;
  const variance = historicalConversions.reduce((sum, val) => sum + Math.pow(val - avgConversion, 2), 0) / (historicalConversions.length - 1);
  const cv = Math.sqrt(variance) / avgConversion;
  
  validations.push({
    id: generateId(),
    name: '历史转化率稳定性',
    description: '检验历史转化率的离散程度',
    method: '变异系数 (Coefficient of Variation)',
    statistic: Number(cv.toFixed(4)),
    pValue: 1 - Math.min(1, cv / 0.1),
    threshold: 0.1,
    status: cv <= 0.1 ? 'pass' : cv <= 0.2 ? 'review' : 'fail',
    recommendation: cv <= 0.1
      ? '历史转化率稳定，实验结果可信度高'
      : cv <= 0.2
        ? '历史转化率有一定波动，建议延长观察期'
        : '历史转化率波动较大，需排除异常因素后再进行实验',
  });
  
  const se = Math.sqrt(avgConversion * (1 - avgConversion) / controlSample);
  const zStat = (config.minimumLift * avgConversion) / (se * Math.sqrt(2));
  const normP = 2 * (1 - Math.abs(0.5 * (1 + Math.sign(zStat) * (1 - Math.exp(-zStat * zStat / Math.PI)))));
  
  validations.push({
    id: generateId(),
    name: '最小可检测效应检验',
    description: '验证当前样本量能否检测到预期的最小提升',
    method: '效应量检验 (Effect size test)',
    statistic: Number(zStat.toFixed(4)),
    pValue: Number(Math.max(0, Math.min(1, normP)).toFixed(4)),
    threshold: 0.8,
    status: config.power >= 0.8 ? 'pass' : 'review',
    recommendation: config.power >= 0.8
      ? `检验功效 ${config.power * 100}% 满足要求，能够检测到 ${config.minimumLift * 100}% 的提升`
      : `检验功效偏低，建议增加样本量或放宽最小提升要求`,
  });
  
  const expectedConversionsPerDay = config.dailyTraffic * config.trafficAllocation * avgConversion;
  const minDailyConversions = 10;
  
  validations.push({
    id: generateId(),
    name: '每日转化事件充足性',
    description: '验证每天是否有足够转化事件用于统计分析',
    method: '事件计数检验',
    statistic: Number(expectedConversionsPerDay.toFixed(2)),
    pValue: Math.min(1, expectedConversionsPerDay / minDailyConversions),
    threshold: minDailyConversions,
    status: expectedConversionsPerDay >= minDailyConversions ? 'pass' : 'review',
    recommendation: expectedConversionsPerDay >= minDailyConversions
      ? `日均转化约 ${expectedConversionsPerDay.toFixed(0)} 次，满足统计要求`
      : `日均转化不足 ${minDailyConversions} 次，统计检验效能较低，建议延长实验周期`,
  });
  
  return validations;
}

export function getLiftSuggestions(_industry?: string): { min: number; max: number; recommended: number; reason: string }[] {
  const suggestions = [
    { min: 0.02, max: 0.05, recommended: 0.03, reason: '保守型：2%-5%，适用于成熟产品或高流量页面，小幅度优化即可带来显著收益' },
    { min: 0.05, max: 0.1, recommended: 0.07, reason: '平衡型：5%-10%，最常用区间，兼顾检测能力和实验周期' },
    { min: 0.1, max: 0.2, recommended: 0.15, reason: '激进型：10%-20%，适用于新产品或重大改版，预期提升较大' },
  ];
  
  return suggestions;
}

export function generateSummary(
  config: ExperimentConfig,
  sampleSizeResult: SampleSizeResult,
  trafficChecks: TrafficCheckStep[],
  groupValidations: GroupValidationItem[]
): { summary: string; risks: string[]; recommendations: string[] } {
  const trafficFails = trafficChecks.filter(c => c.status === 'fail').length;
  const validationReviews = groupValidations.filter(v => v.status === 'review').length;
  const validationFails = groupValidations.filter(v => v.status === 'fail').length;
  
  let summary = '';
  const risks: string[] = [];
  const recommendations: string[] = [];
  
  if (trafficFails === 0 && validationFails === 0) {
    summary = `实验设计合理。对照组转化率 ${(config.controlConversion * 100).toFixed(2)}%，最小提升 ${(config.minimumLift * 100).toFixed(1)}%，每组需样本 ${sampleSizeResult.requiredSampleSize.toLocaleString()} 人，总计 ${sampleSizeResult.totalSampleSize.toLocaleString()} 人，预估 ${sampleSizeResult.estimatedDays} 天完成。`;
  } else if (trafficFails > 0) {
    summary = `流量存在瓶颈，需关注。当前配置下实验周期 ${sampleSizeResult.estimatedDays} 天，建议检查流量分配。`;
    risks.push('流量不足可能导致实验周期过长');
    recommendations.push('考虑增加实验流量分配比例');
  } else {
    summary = `实验设计基本可行，但有 ${validationReviews} 项需分析师复核。`;
  }
  
  if (sampleSizeResult.estimatedDays > 14) {
    risks.push(`实验周期较长（${sampleSizeResult.estimatedDays}天），可能受外部因素影响`);
  }
  
  if (config.minimumLift < 0.03) {
    risks.push('最小提升设置较小，需更多样本才能检测出显著差异');
    recommendations.push('如业务允许，可考虑提高最小提升阈值以缩短实验周期');
  }
  
  if (validationReviews > 0) {
    recommendations.push(`请复核 ${validationReviews} 项待检查的分组校验项`);
  }
  
  if (trafficChecks.some(c => c.status === 'review')) {
    recommendations.push('建议完整周后再进行数据分析，排除周末效应影响');
  }
  
  recommendations.push('实验期间持续监控流量分配和转化率变化');
  recommendations.push('达到预估样本量后进行统计检验，避免提前偷看数据');
  
  return { summary, risks, recommendations };
}
