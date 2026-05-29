import {
  RawDataRow,
  AnomalyItem,
  AnomalyType,
  AnomalySeverity,
  BadExample,
  CategoryResult,
  AppConfig,
} from '@/types';
import {
  isRowValid,
  calculateDeviation,
  isCovered,
} from './statistics';

const generateAnomalyId = (): string => {
  return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const detectPromotionAnomalies = (rows: RawDataRow[]): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];

  rows.forEach(row => {
    const hasPromotionFlag = row.isPromotion;
    const remarkHasPromotion = row.remark && ['促销', '活动', '大促', '618', '双11', '双十一', '双12', '店庆'].some(
      keyword => row.remark.includes(keyword)
    );

    if (hasPromotionFlag || remarkHasPromotion) {
      anomalies.push({
        id: generateAnomalyId(),
        type: 'promotion',
        severity: 'medium',
        category: row.category || '未分类',
        description: remarkHasPromotion && !hasPromotionFlag
          ? `备注包含促销信息: "${row.remark}"，需要人工确认是否排除`
          : `标记为促销活动，已自动排除在覆盖率计算外`,
        rowData: row,
      });
    }
  });

  return anomalies;
};

export const detectLowSampleAnomalies = (
  categoryResults: CategoryResult[],
  config: AppConfig
): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];

  categoryResults.forEach(cat => {
    if (cat.validSampleSize < config.minCategorySampleSize && cat.validSampleSize > 0) {
      anomalies.push({
        id: generateAnomalyId(),
        type: 'low_sample',
        severity: cat.validSampleSize < 10 ? 'high' : 'medium',
        category: cat.category,
        description: `样本量不足: 有效样本${cat.validSampleSize}个（建议≥${config.minCategorySampleSize}），统计结果可能不可靠`,
        rowData: {
          id: `cat_${cat.category}`,
          rowNumber: 0,
          category: cat.category,
          date: '',
          forecast: cat.avgForecast,
          lowerBound: null,
          upperBound: null,
          actual: cat.avgActual,
          isPromotion: false,
          remark: '',
          _raw: {},
          _errors: [],
          _isDirty: false,
        },
      });
    }
  });

  return anomalies;
};

export const detectUnderCoverageAnomalies = (
  categoryResults: CategoryResult[],
  config: AppConfig
): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];
  const targetThreshold = config.targetCoverage * config.underCoverageRatioThreshold;

  categoryResults.forEach(cat => {
    if (cat.validSampleSize >= config.minCategorySampleSize &&
        cat.coverage < targetThreshold) {
      anomalies.push({
        id: generateAnomalyId(),
        type: 'under_coverage',
        severity: cat.coverage < targetThreshold * 0.7 ? 'high' : 'medium',
        category: cat.category,
        description: `覆盖率严重不足: ${(cat.coverage * 100).toFixed(1)}%（目标≥${(targetThreshold * 100).toFixed(1)}%），低估${cat.underCoverageCount}次，高估${cat.overCoverageCount}次`,
        rowData: {
          id: `cat_${cat.category}`,
          rowNumber: 0,
          category: cat.category,
          date: '',
          forecast: cat.avgForecast,
          lowerBound: null,
          upperBound: null,
          actual: cat.avgActual,
          isPromotion: false,
          remark: '',
          _raw: {},
          _errors: [],
          _isDirty: false,
        },
      });
    }
  });

  return anomalies;
};

export const detectBadForecastAnomalies = (
  rows: RawDataRow[],
  config: AppConfig
): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];
  const validRows = rows.filter(isRowValid);

  validRows.forEach(row => {
    let isBad = false;
    let reason = '';
    let severity: AnomalySeverity = 'high';

    if (row.forecast === 0 && row.actual! > 0) {
      isBad = true;
      reason = `预测值为0但实际销量为${row.actual}，属于明显预测错误`;
      severity = 'high';
    } else if (row.lowerBound! > row.upperBound!) {
      isBad = true;
      reason = `预测下限(${row.lowerBound})大于预测上限(${row.upperBound})，逻辑错误`;
      severity = 'high';
    } else if (row.forecast! < 0) {
      isBad = true;
      reason = `预测值为负数: ${row.forecast}`;
      severity = 'high';
    } else {
      const deviation = calculateDeviation(row.forecast!, row.actual!);
      if (deviation > config.badForecastDeviationThreshold) {
        isBad = true;
        const direction = row.actual! > row.forecast! ? '低估' : '高估';
        reason = `预测偏差过大: ${direction}${(deviation * 100).toFixed(0)}%（预测${row.forecast}，实际${row.actual}）`;
        severity = deviation > 1 ? 'high' : 'medium';
      }
    }

    if (!isCovered(row.actual!, row.lowerBound!, row.upperBound!)) {
      const upperDeviation = row.actual! > row.upperBound!
        ? (row.actual! - row.upperBound!) / row.upperBound!
        : 0;
      const lowerDeviation = row.actual! < row.lowerBound!
        ? (row.lowerBound! - row.actual!) / row.lowerBound!
        : 0;

      if (upperDeviation > config.badForecastDeviationThreshold ||
          lowerDeviation > config.badForecastDeviationThreshold) {
        if (!isBad) {
          isBad = true;
          const direction = row.actual! > row.upperBound! ? '超出上限' : '低于下限';
          const deviation = Math.max(upperDeviation, lowerDeviation);
          reason = `真实值${direction}过多: 偏差${(deviation * 100).toFixed(0)}%`;
          severity = deviation > 1 ? 'high' : 'medium';
        }
      }
    }

    if (isBad) {
      anomalies.push({
        id: generateAnomalyId(),
        type: 'bad_forecast',
        severity,
        category: row.category || '未分类',
        description: reason,
        rowData: row,
      });
    }
  });

  return anomalies;
};

export const detectLogicErrorAnomalies = (rows: RawDataRow[]): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];

  rows.filter(row => row._isDirty).forEach(row => {
    row._errors.forEach(error => {
      if (error.type === 'logic') {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'logic_error',
          severity: 'high',
          category: row.category || '未分类',
          description: `第${row.rowNumber}行: ${error.message}`,
          rowData: row,
        });
      }
    });
  });

  return anomalies;
};

export const detectAllAnomalies = (
  rows: RawDataRow[],
  categoryResults: CategoryResult[],
  config: AppConfig
): AnomalyItem[] => {
  const allAnomalies: AnomalyItem[] = [
    ...detectPromotionAnomalies(rows),
    ...detectLowSampleAnomalies(categoryResults, config),
    ...detectUnderCoverageAnomalies(categoryResults, config),
    ...detectBadForecastAnomalies(rows, config),
    ...detectLogicErrorAnomalies(rows),
  ];

  return allAnomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

export const extractBadExamples = (
  anomalies: AnomalyItem[],
  limit: number = 5
): BadExample[] => {
  const badForecastAnomalies = anomalies
    .filter(a => a.type === 'bad_forecast' && a.severity === 'high')
    .slice(0, limit);

  return badForecastAnomalies.map(anomaly => {
    const row = anomaly.rowData;
    const deviation = row.forecast && row.forecast > 0
      ? calculateDeviation(row.forecast, row.actual || 0)
      : 1;

    return {
      id: anomaly.id,
      category: anomaly.category,
      forecast: row.forecast || 0,
      actual: row.actual || 0,
      lowerBound: row.lowerBound || 0,
      upperBound: row.upperBound || 0,
      deviationPercent: deviation,
      reason: anomaly.description,
    };
  });
};

export const getAnomalyTypeIcon = (type: AnomalyType): string => {
  switch (type) {
    case 'promotion': return 'Tag';
    case 'low_sample': return 'AlertTriangle';
    case 'under_coverage': return 'TrendingDown';
    case 'bad_forecast': return 'XCircle';
    case 'logic_error': return 'Bug';
    default: return 'AlertCircle';
  }
};

export const getSeverityColor = (severity: AnomalySeverity): string => {
  switch (severity) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};

export const getSeverityBgColor = (severity: AnomalySeverity): string => {
  switch (severity) {
    case 'high': return 'bg-red-100';
    case 'medium': return 'bg-yellow-100';
    case 'low': return 'bg-blue-100';
    default: return 'bg-gray-100';
  }
};
