import type { Anomaly, SchemeParams } from '@/types';

export function detectAnomalies(params: SchemeParams): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const spikeRatio = params.peakArrivalRate / params.arrivalRate;
  if (spikeRatio >= 2) {
    anomalies.push({
      type: 'arrival_spike',
      severity: spikeRatio >= 3 ? 'critical' : 'warning',
      message: `高峰到达率(${params.peakArrivalRate.toFixed(1)}人/分钟)是常规(${params.arrivalRate.toFixed(1)}人/分钟)的 ${spikeRatio.toFixed(1)} 倍`,
      excludedFromNormal: true,
    });
  }

  const tailRatio = params.maxServiceTime / params.avgServiceTime;
  if (tailRatio >= 3) {
    anomalies.push({
      type: 'long_tail',
      severity: tailRatio >= 5 ? 'critical' : 'warning',
      message: `最长服务时长(${params.maxServiceTime}分钟)是平均(${params.avgServiceTime}分钟)的 ${tailRatio.toFixed(1)} 倍，存在长尾风险`,
      excludedFromNormal: true,
    });
  }

  if (params.switchCost > 0) {
    anomalies.push({
      type: 'switch_cost',
      severity: 'warning',
      message: `柜台切换需 ${params.switchCost} 分钟准备时间，计算结果已考虑此成本`,
      excludedFromNormal: false,
    });
  }

  return anomalies;
}

export function formatAnomalyType(type: string): string {
  const map: Record<string, string> = {
    arrival_spike: '到达率突增',
    long_tail: '服务时长尾',
    switch_cost: '柜台切换成本',
  };
  return map[type] || type;
}
