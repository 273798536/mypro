import { RiskLevel, SalinityUnit } from '../types/common';
import { RiskFactor, RiskMatrixCell, RiskAlert, RiskAssessmentResult, WaterRecord } from '../types/risk';
import { convertSalinity } from './unitConverter';

let alertIdCounter = 0;

function generateAlertId(): string {
  return `alert_${Date.now()}_${++alertIdCounter}`;
}

export function calculateTideRisk(
  tideLevel: number,
  threshold: { high: number; low: number } = { high: 2.5, low: 0.5 }
): { score: number; level: RiskLevel; description: string; suggestion: string } {
  let score: number;
  let level: RiskLevel;
  let description: string;
  let suggestion: string;

  if (tideLevel >= threshold.high) {
    score = 85;
    level = RiskLevel.HIGH;
    description = `当前潮位${tideLevel.toFixed(2)}米，超过警戒水位${threshold.high}米。高潮位可能导致养殖区进水过多，增加养殖生物逃逸风险。`;
    suggestion = '建议加强巡逻，检查围网和堤坝是否牢固，必要时转移育苗池。';
  } else if (tideLevel <= threshold.low) {
    score = 75;
    level = RiskLevel.MEDIUM;
    description = `当前潮位${tideLevel.toFixed(2)}米，低于正常水位下限${threshold.low}米。低潮位可能导致养殖区水体交换不足，水质恶化风险增加。`;
    suggestion = '建议监测溶解氧变化，必要时开启增氧设备，避免水体缺氧。';
  } else if (tideLevel >= threshold.high - 0.3) {
    score = 50;
    level = RiskLevel.MEDIUM;
    description = `当前潮位${tideLevel.toFixed(2)}米，接近警戒水位。需要密切关注潮汐变化。`;
    suggestion = '建议每2小时监测一次潮位，做好应急准备。';
  } else if (tideLevel <= threshold.low + 0.3) {
    score = 40;
    level = RiskLevel.LOW;
    description = `当前潮位${tideLevel.toFixed(2)}米，接近低位警戒线。水体交换能力有所下降。`;
    suggestion = '建议保持监测，关注水质变化趋势。';
  } else {
    score = 15;
    level = RiskLevel.LOW;
    description = `当前潮位${tideLevel.toFixed(2)}米，处于正常范围[${threshold.low}, ${threshold.high}]米内。`;
    suggestion = '潮位正常，保持常规监测即可。';
  }

  return { score, level, description, suggestion };
}

export function calculateSalinityRisk(
  salinity: number,
  optimalRange: { min: number; max: number } = { min: 20, max: 32 }
): { score: number; level: RiskLevel; description: string; suggestion: string } {
  let score: number;
  let level: RiskLevel;
  let description: string;
  let suggestion: string;

  if (salinity < 15 || salinity > 38) {
    score = 90;
    level = RiskLevel.CRITICAL;
    description = `盐度${salinity.toFixed(1)}PSU严重偏离适宜范围[${optimalRange.min}-${optimalRange.max}]PSU。可能导致养殖生物渗透压失衡，大规模死亡风险极高。`;
    suggestion = '立即调查盐度异常原因，如是进水问题需切换水源，如是降水导致需开启盐度调节设备。';
  } else if (salinity < optimalRange.min - 3 || salinity > optimalRange.max + 3) {
    score = 70;
    level = RiskLevel.HIGH;
    description = `盐度${salinity.toFixed(1)}PSU超出适宜范围。长期暴露可能影响养殖生物的生长和免疫力。`;
    suggestion = '建议分析盐度变化原因，监测每日变化趋势，必要时采取调节措施。';
  } else if (salinity < optimalRange.min || salinity > optimalRange.max) {
    score = 45;
    level = RiskLevel.MEDIUM;
    description = `盐度${salinity.toFixed(1)}PSU略超出适宜范围[${optimalRange.min}-${optimalRange.max}]PSU。`;
    suggestion = '建议增加监测频率，观察养殖生物摄食和活动情况。';
  } else {
    score = 15;
    level = RiskLevel.LOW;
    description = `盐度${salinity.toFixed(1)}PSU处于适宜范围[${optimalRange.min}-${optimalRange.max}]PSU内。`;
    suggestion = '盐度正常，保持常规监测。';
  }

  return { score, level, description, suggestion };
}

export function calculateWaterQualityRisk(
  ph: number | null,
  dissolvedOxygen: number | null,
  temperature: number | null
): { score: number; level: RiskLevel; description: string; suggestion: string; factorScores: { ph: number; do: number; temp: number } } {
  let phScore = 0, doScore = 0, tempScore = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (ph !== null) {
    if (ph < 6.5 || ph > 8.5) {
      phScore = 70;
      issues.push(`pH值${ph.toFixed(1)}超出正常范围[6.5-8.5]`);
      suggestions.push('检查水源pH，必要时使用生石灰或醋酸调节');
    } else if (ph < 7.0 || ph > 8.0) {
      phScore = 30;
      issues.push(`pH值${ph.toFixed(1)}接近边界`);
      suggestions.push('增加pH监测频率');
    }
  }

  if (dissolvedOxygen !== null) {
    if (dissolvedOxygen < 4) {
      doScore = 85;
      issues.push(`溶解氧${dissolvedOxygen.toFixed(1)}mg/L低于安全阈值4mg/L`);
      suggestions.push('立即开启增氧设备，检查是否有水质恶化');
    } else if (dissolvedOxygen < 5) {
      doScore = 40;
      issues.push(`溶解氧${dissolvedOxygen.toFixed(1)}mg/L偏低`);
      suggestions.push('午后开启增氧机2-3小时');
    }
  }

  if (temperature !== null) {
    if (temperature < 10 || temperature > 32) {
      tempScore = 60;
      issues.push(`水温${temperature.toFixed(1)}℃超出适宜范围[10-32]℃`);
      suggestions.push('根据水温变化调整投饵量，高温期加强换水');
    } else if (temperature < 15 || temperature > 28) {
      tempScore = 25;
      issues.push(`水温${temperature.toFixed(1)}℃接近适宜范围边界`);
      suggestions.push('关注水温变化趋势，做好应激预防');
    }
  }

  const totalScore = Math.max(phScore, doScore, tempScore);
  let level: RiskLevel;
  if (totalScore >= 80) level = RiskLevel.CRITICAL;
  else if (totalScore >= 60) level = RiskLevel.HIGH;
  else if (totalScore >= 30) level = RiskLevel.MEDIUM;
  else level = RiskLevel.LOW;

  const description = issues.length > 0
    ? `水质检测发现${issues.length}项问题：${issues.join('；')}。`
    : '水质各项指标均在正常范围内。';

  const suggestion = suggestions.length > 0
    ? suggestions.join('；')
    : '水质良好，保持常规监测。';

  return {
    score: totalScore,
    level,
    description,
    suggestion,
    factorScores: { ph: phScore, do: doScore, temp: tempScore },
  };
}

export function buildRiskMatrix(
  tideLevels: string[],
  salinityLevels: string[],
  zoneNames: string[]
): RiskMatrixCell[][] {
  const matrix: RiskMatrixCell[][] = [];

  for (let i = 0; i < tideLevels.length; i++) {
    const row: RiskMatrixCell[] = [];
    for (let j = 0; j < salinityLevels.length; j++) {
      const combinedScore = (i + j) / (tideLevels.length + salinityLevels.length - 2) * 100;
      let combinedLevel: RiskLevel;
      if (combinedScore >= 75) combinedLevel = RiskLevel.CRITICAL;
      else if (combinedScore >= 50) combinedLevel = RiskLevel.HIGH;
      else if (combinedScore >= 25) combinedLevel = RiskLevel.MEDIUM;
      else combinedLevel = RiskLevel.LOW;

      const zoneIndex = Math.floor((i + j) / 2) % zoneNames.length;
      const affectedZone = zoneNames[zoneIndex];
      const count = Math.floor(Math.random() * 10) + 1;
      const likelihood = i;
      const severity = j;
      const affectedPoints = ['A1', 'A2', 'B1'].slice(0, Math.min(zoneIndex + 1, 3));

      let explanation: string;
      if (combinedLevel === RiskLevel.CRITICAL) {
        explanation = `潮位${tideLevels[i]}且盐度${salinityLevels[j]}，极端组合下${affectedZone}养殖区风险极高，可能出现大规模应激反应。`;
      } else if (combinedLevel === RiskLevel.HIGH) {
        explanation = `潮位${tideLevels[i]}+盐度${salinityLevels[j]}组合下，${affectedZone}区养殖生物应激风险较高，建议加强巡塘。`;
      } else if (combinedLevel === RiskLevel.MEDIUM) {
        explanation = `潮位${tideLevels[i]}、盐度${salinityLevels[j]}，${affectedZone}区需关注水质变化，保持监测频率。`;
      } else {
        explanation = `潮位${tideLevels[i]}、盐度${salinityLevels[j]}处于适宜组合，${affectedZone}区养殖环境良好。`;
      }

      row.push({
        tideLevel: tideLevels[i],
        salinityLevel: salinityLevels[j],
        riskLevel: combinedScore,
        riskScore: Math.round(combinedScore),
        explanation,
        affectedZone,
        count,
        likelihood,
        severity,
        affectedPoints,
      });
    }
    matrix.push(row);
  }

  return matrix;
}

export function assessRisk(
  taskId: string,
  tideRecords: { recordTime: Date; tideLevel: number }[],
  waterRecords: WaterRecord[],
  zoneNames: string[] = ['A区近岸', 'B区深水', 'C区进水渠']
): RiskAssessmentResult {
  const avgTide = tideRecords.reduce((sum, r) => sum + r.tideLevel, 0) / tideRecords.length;
  const avgSalinity = waterRecords
    .filter(r => r.salinity !== null)
    .reduce((sum, r) => {
      const converted = convertSalinity(r.salinity!, r.salinityUnit, SalinityUnit.PSU);
      return sum + converted.value;
    }, 0) / waterRecords.filter(r => r.salinity !== null).length;

  const avgPH = waterRecords.filter(r => r.ph !== null).reduce((sum, r) => sum + r.ph!, 0) / waterRecords.filter(r => r.ph !== null).length;
  const avgDO = waterRecords.filter(r => r.dissolvedOxygen !== null).reduce((sum, r) => sum + r.dissolvedOxygen!, 0) / waterRecords.filter(r => r.dissolvedOxygen !== null).length;
  const avgTemp = waterRecords.filter(r => r.temperature !== null).reduce((sum, r) => sum + parseFloat(String(r.temperature)), 0) / waterRecords.filter(r => r.temperature !== null).length;

  const tideRisk = calculateTideRisk(avgTide);
  const salinityRisk = calculateSalinityRisk(avgSalinity);
  const waterQualityRisk = calculateWaterQualityRisk(avgPH, avgDO, avgTemp);

  const factors: RiskFactor[] = [
    {
      id: 'factor_tide',
      name: '潮汐水位',
      weight: 0.35,
      value: avgTide,
      riskLevel: tideRisk.level,
      riskScore: tideRisk.score,
      description: tideRisk.description,
      dataSource: `近${tideRecords.length}条潮汐观测记录`,
      suggestion: tideRisk.suggestion,
      explanation: `潮汐是影响养殖区水体交换的主要因素，权重35%。平均潮位${avgTide.toFixed(2)}米，${tideRisk.level === RiskLevel.LOW ? '处于安全范围' : '需要关注'}。`,
    },
    {
      id: 'factor_salinity',
      name: '盐度',
      weight: 0.30,
      value: avgSalinity,
      riskLevel: salinityRisk.level,
      riskScore: salinityRisk.score,
      description: salinityRisk.description,
      dataSource: `近${waterRecords.length}条盐度监测记录（已统一为PSU单位）`,
      suggestion: salinityRisk.suggestion,
      explanation: `盐度直接影响养殖生物渗透压调节，权重30%。平均盐度${avgSalinity.toFixed(1)}PSU，${salinityRisk.level === RiskLevel.LOW ? '处于适宜范围' : '超出适宜范围'}。`,
    },
    {
      id: 'factor_ph',
      name: 'pH值',
      weight: 0.12,
      value: avgPH,
      riskLevel: waterQualityRisk.factorScores.ph >= 50 ? RiskLevel.HIGH : waterQualityRisk.factorScores.ph >= 20 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      riskScore: waterQualityRisk.factorScores.ph,
      description: `平均pH值${avgPH.toFixed(1)}`,
      dataSource: '水质监测数据',
      suggestion: '保持pH在7.0-8.5之间',
      explanation: `pH影响养殖生物生理机能和水质化学平衡，权重12%。`,
    },
    {
      id: 'factor_do',
      name: '溶解氧',
      weight: 0.15,
      value: avgDO,
      riskLevel: waterQualityRisk.factorScores.do >= 50 ? RiskLevel.HIGH : waterQualityRisk.factorScores.do >= 20 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      riskScore: waterQualityRisk.factorScores.do,
      description: `平均溶解氧${avgDO.toFixed(1)}mg/L`,
      dataSource: '水质监测数据',
      suggestion: '保持溶解氧在5mg/L以上',
      explanation: `溶解氧是养殖生物生存的必要条件，权重15%。`,
    },
    {
      id: 'factor_temp',
      name: '水温',
      weight: 0.08,
      value: avgTemp,
      riskLevel: waterQualityRisk.factorScores.temp >= 50 ? RiskLevel.HIGH : waterQualityRisk.factorScores.temp >= 20 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      riskScore: waterQualityRisk.factorScores.temp,
      description: `平均水温${avgTemp.toFixed(1)}℃`,
      dataSource: '水质监测数据',
      suggestion: '根据水温调整投饵量',
      explanation: `水温影响养殖生物代谢速率，权重8%。`,
    },
  ];

  const overallScore = Math.round(factors.reduce((sum, f) => sum + f.riskScore * f.weight, 0));
  let overallLevel: RiskLevel;
  if (overallScore >= 75) overallLevel = RiskLevel.CRITICAL;
  else if (overallScore >= 50) overallLevel = RiskLevel.HIGH;
  else if (overallScore >= 25) overallLevel = RiskLevel.MEDIUM;
  else overallLevel = RiskLevel.LOW;

  const tideLabels = ['低', '较低', '中等', '较高', '高'];
  const salinityLabels = ['低', '较低', '适宜', '较高', '高'];
  const matrix = buildRiskMatrix(tideLabels, salinityLabels, zoneNames);

  const alerts: RiskAlert[] = [];
  factors.forEach(factor => {
    if (factor.riskLevel === RiskLevel.HIGH || factor.riskLevel === RiskLevel.CRITICAL) {
      alerts.push({
        id: generateAlertId(),
        taskId,
        type: factor.name,
        level: factor.riskLevel,
        description: factor.description,
        explanation: factor.explanation,
        suggestion: factor.suggestion,
        factors: [factor.id],
        triggeredAt: new Date(),
      });
    }
  });

  const levelText = {
    [RiskLevel.LOW]: '低风险',
    [RiskLevel.MEDIUM]: '中等风险',
    [RiskLevel.HIGH]: '高风险',
    [RiskLevel.CRITICAL]: '极高风险',
  };

  const highRiskFactors = factors.filter(f => f.riskLevel === RiskLevel.HIGH || f.riskLevel === RiskLevel.CRITICAL).map(f => f.name).join('、');
  const explanation = `基于${tideRecords.length}条潮汐记录和${waterRecords.length}条水质记录的综合评估，该批次数据整体为${levelText[overallLevel]}，综合评分${overallScore}/100。${highRiskFactors ? `主要风险因素：${highRiskFactors}。` : '各项指标均处于正常范围。'}建议根据各因素的具体建议采取相应管理措施。`;

  return {
    taskId,
    overallRiskLevel: overallLevel,
    overallRiskScore: overallScore,
    explanation,
    factors,
    matrix,
    alerts,
  };
}
