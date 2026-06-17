import type { AnomalyPoint, AnomalyType, BuoyDataPoint, DataStatus } from '@/types';

export const anomalyTypeLabels: Record<AnomalyType, string> = {
  extreme: '极端值',
  noise: '噪声',
  drift: '漂移',
  missing: '数据缺失',
};

export const anomalyTypeColors: Record<AnomalyType, string> = {
  extreme: '#FF6B35',
  noise: '#FBBF24',
  drift: '#8884d8',
  missing: '#FF3D57',
};

export const anomalyStatusLabels: Record<AnomalyPoint['status'], string> = {
  pending: '待处理',
  reviewed: '已复核',
  resolved: '已解决',
};

export const dataStatusLabels: Record<BuoyDataPoint['status'], string> = {
  normal: '正常',
  warning: '警告',
  error: '异常',
  processed: '已处理',
};

export const dataStatusColors: Record<BuoyDataPoint['status'], string> = {
  normal: '#00C853',
  warning: '#FF6B35',
  error: '#FF3D57',
  processed: '#00D4FF',
};

export function detectAnomalies(
  data: BuoyDataPoint[],
  threshold: number = 2
): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];
  const waveHeights = data.map((d) => d.waveHeight);
  const mean = waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
  const stdDev = Math.sqrt(
    waveHeights.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / waveHeights.length
  );

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const zScore = Math.abs((point.waveHeight - mean) / stdDev);

    if (point.status === 'error' || point.status === 'warning') {
      let type: AnomalyType = 'extreme';
      let isSuspectedNoise = false;

      if (point.waveHeight < 0.1) {
        type = 'missing';
      } else if (zScore > threshold * 1.5) {
        type = 'extreme';
      } else if (i > 0 && i < data.length - 1) {
        const prev = data[i - 1];
        const next = data[i + 1];
        const diffPrev = Math.abs(point.waveHeight - prev.waveHeight);
        const diffNext = Math.abs(point.waveHeight - next.waveHeight);
        const avgDiff = (Math.abs(prev.waveHeight - next.waveHeight) / 2);

        if (diffPrev > avgDiff * 3 && diffNext > avgDiff * 3) {
          type = 'noise';
          isSuspectedNoise = true;
        } else if (point.errorValue > prev.errorValue && point.errorValue > next.errorValue) {
          type = 'drift';
        }
      }

      if (zScore > threshold) {
        isSuspectedNoise = true;
      }

      anomalies.push({
        id: `anom-auto-${i}`,
        dataId: point.id,
        type,
        description: `自动检测：${anomalyTypeLabels[type]}，z-score=${zScore.toFixed(2)}`,
        isSuspectedNoise,
        status: 'pending',
        attribution: `基于${threshold}σ准则检测`,
      });
    }
  }

  return anomalies;
}

export function filterAnomalies(
  anomalies: AnomalyPoint[],
  buoyData: BuoyDataPoint[],
  types: AnomalyType[],
  dataStatuses: DataStatus[],
  anomalyStatuses: AnomalyPoint['status'][],
  showNoiseOnly: boolean,
  searchKeyword: string
): AnomalyPoint[] {
  return anomalies.filter((a) => {
    if (types.length > 0 && !types.includes(a.type)) return false;
    if (anomalyStatuses.length > 0 && !anomalyStatuses.includes(a.status)) return false;
    if (showNoiseOnly && !a.isSuspectedNoise) return false;
    
    if (dataStatuses.length > 0) {
      const dataPoint = buoyData.find((d) => d.id === a.dataId);
      if (!dataPoint || !dataStatuses.includes(dataPoint.status)) return false;
    }
    
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        a.description.toLowerCase().includes(keyword) ||
        a.attribution.toLowerCase().includes(keyword) ||
        anomalyTypeLabels[a.type].includes(keyword)
      );
    }
    return true;
  });
}
