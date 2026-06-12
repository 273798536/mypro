import type { SamplingRecord, RiskAssessmentResult, AffectedConclusion, RiskLevel } from '../../shared/types';

const ANOMALY_KEYWORDS = ['禁航区越界', '禁航', '越界', '超标', '异常', '6级', '7级', '8级', '浪高2', '浪高3', 'pH 7.4', 'DO 4.1', 'DO 3', 'DO 4'];
const WIND_WAVE_KEYWORDS = ['风', '浪', '风力', '浪高'];
const WATER_QUALITY_NORMAL_PATTERNS = ['pH 8', 'pH 7.8', 'pH 8.0', 'pH 8.1', 'pH 8.2', 'DO 7', 'DO 6', 'DO 8'];

export interface RiskFactor {
  factor: string;
  severity: 'anomaly' | 'pending' | 'info';
}

export const detectRiskFactors = (record: Partial<SamplingRecord>): RiskFactor[] => {
  const factors: RiskFactor[] = [];

  if (!record.wind_wave_forecast) {
    factors.push({ factor: '风浪预报晚到', severity: 'pending' });
  } else {
    const forecast = record.wind_wave_forecast;
    for (const kw of ANOMALY_KEYWORDS) {
      if (forecast.includes(kw)) {
        if (kw.includes('禁航') || kw.includes('越界')) {
          factors.push({ factor: '禁航区越界', severity: 'anomaly' });
        } else if (kw.includes('级') || kw.includes('浪高')) {
          factors.push({ factor: '风浪超标', severity: 'anomaly' });
        }
        break;
      }
    }
  }

  if (!record.tide_data) {
    factors.push({ factor: '潮汐数据缺失', severity: 'pending' });
  }

  if (!record.water_quality) {
    factors.push({ factor: '水质记录缺失', severity: 'pending' });
  } else {
    const wq = record.water_quality;
    const isNormal = WATER_QUALITY_NORMAL_PATTERNS.some(p => wq.includes(p));
    if (!isNormal) {
      factors.push({ factor: '水质异常', severity: 'anomaly' });
    }
  }

  return factors;
};

export const determineRiskLevel = (factors: RiskFactor[]): RiskLevel => {
  if (factors.some(f => f.severity === 'anomaly')) {
    return 'anomaly';
  }
  if (factors.some(f => f.severity === 'pending')) {
    return 'pending';
  }
  return 'normal';
};

export const generateAffectedConclusions = (record: Partial<SamplingRecord>, factors: RiskFactor[]): AffectedConclusion[] => {
  const conclusions: AffectedConclusion[] = [];

  if (!record.wind_wave_forecast) {
    conclusions.push({
      conclusion: '采样航行安全评估',
      missing_data: '风浪预报',
      impact: '风浪条件缺失，无法评估航行安全，本结论暂按无风无浪保守评估，可能导致采样时间窗口判断偏误'
    });
    conclusions.push({
      conclusion: '贝类样品污染风险评估',
      missing_data: '风浪预报',
      impact: '风浪过大可能导致底泥再悬浮影响样品代表性，暂按低风浪评估，可能低估污染风险'
    });
  }

  if (!record.tide_data) {
    conclusions.push({
      conclusion: '采样点位选择依据',
      missing_data: '潮汐数据',
      impact: '潮位信息缺失，无法确认采样时机是否符合低潮位规范，样品代表性存疑'
    });
  }

  if (!record.water_quality) {
    conclusions.push({
      conclusion: '贝类生存环境质量评估',
      missing_data: '水质记录',
      impact: 'pH、溶解氧等关键参数缺失，无法评估贝类生存环境是否达标，本结论暂按历史均值推算，可能偏离实际情况'
    });
    conclusions.push({
      conclusion: '样品重金属含量预估',
      missing_data: '水质记录',
      impact: '水质参数与重金属富集程度相关，缺失水质数据可能导致含量预估偏差'
    });
  }

  const anomalyFactors = factors.filter(f => f.severity === 'anomaly');
  if (anomalyFactors.length > 0) {
    conclusions.push({
      conclusion: '本次采样有效性判定',
      missing_data: anomalyFactors.map(f => f.factor).join('、'),
      impact: `存在${anomalyFactors.length}项异常风险因素：${anomalyFactors.map(f => f.factor).join('、')}，采样计划需暂停并重新评估`
    });
  }

  return conclusions;
};

export const assessRisk = (record: Partial<SamplingRecord>): RiskAssessmentResult => {
  const riskFactors = detectRiskFactors(record);
  const riskLevel = determineRiskLevel(riskFactors);
  const affectedConclusions = generateAffectedConclusions(record, riskFactors);

  return {
    record_id: record.id || 0,
    risk_level: riskLevel,
    risk_factors: riskFactors.map(f => f.factor),
    affected_conclusions: affectedConclusions
  };
};

export const generateConclusion = (record: SamplingRecord): { conclusion: string; data_sources: string[]; risk_note: string } => {
  const dataSources: string[] = [];
  const missingData: string[] = [];

  if (record.wind_wave_forecast) dataSources.push('风浪预报');
  else missingData.push('风浪预报');

  if (record.tide_data) dataSources.push('潮汐数据');
  else missingData.push('潮汐数据');

  if (record.water_quality) dataSources.push('水质记录');
  else missingData.push('水质记录');

  let conclusion = '';
  let riskNote = '';

  if (record.risk_level === 'anomaly') {
    conclusion = `采样计划异常：${record.risk_factors.join('、')}，建议暂停执行并重新规划`;
    riskNote = `存在异常风险因素：${record.risk_factors.join('、')}。如需提交海事处审批，请先完成风险排查与整改。`;
  } else if (record.risk_level === 'pending') {
    const pendingFactors = record.risk_factors.join('、');
    conclusion = `采样计划待确认：${pendingFactors}，数据完备后可确认执行`;
    riskNote = `以下数据项尚未补录：${missingData.join('、')}。本结论暂按已有数据评估，待${missingData.join('、')}补录后将自动更新。`;
    if (missingData.includes('风浪预报')) {
      riskNote += ' 风浪预报晚到期间，采样航行安全、贝类污染风险评估结论为暂定值，可能存在偏差。';
    }
  } else {
    conclusion = `采样计划可正常执行：${record.date} ${record.area} ${record.species}采样，各项条件符合规范`;
    riskNote = '各项数据完备，风险评估通过，可按计划执行采样。';
  }

  return {
    conclusion,
    data_sources: dataSources,
    risk_note: riskNote
  };
};
