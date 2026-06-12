import type { WaterQualityRecord } from '../types';

export interface WaterQualityStandard {
  ph: [number, number];
  dissolvedOxygen: [number, number];
  turbidity: [number, number];
  ammoniaNitrogen: [number, number];
  totalPhosphorus: [number, number];
  cod: [number, number];
}

export const WATER_QUALITY_LEVELS: Record<'normal' | 'attention' | 'warning' | 'danger', WaterQualityStandard> = {
  normal: {
    ph: [7.0, 8.5],
    dissolvedOxygen: [6, 100],
    turbidity: [0, 20],
    ammoniaNitrogen: [0, 0.5],
    totalPhosphorus: [0, 0.1],
    cod: [0, 3],
  },
  attention: {
    ph: [6.5, 9.0],
    dissolvedOxygen: [5, 100],
    turbidity: [0, 30],
    ammoniaNitrogen: [0, 0.8],
    totalPhosphorus: [0, 0.15],
    cod: [0, 5],
  },
  warning: {
    ph: [6.0, 9.5],
    dissolvedOxygen: [4, 100],
    turbidity: [0, 50],
    ammoniaNitrogen: [0, 1.0],
    totalPhosphorus: [0, 0.2],
    cod: [0, 6],
  },
  danger: {
    ph: [0, 14],
    dissolvedOxygen: [0, 100],
    turbidity: [0, 200],
    ammoniaNitrogen: [0, 5],
    totalPhosphorus: [0, 0.5],
    cod: [0, 10],
  },
};

export function evaluateWaterQuality(record: WaterQualityRecord): {
  level: 'normal' | 'attention' | 'warning' | 'danger';
  exceededItems: Array<{
    item: string;
    value: number;
    standard: number;
    description: string;
  }>;
} {
  const { ph, dissolvedOxygen, turbidity, ammoniaNitrogen, totalPhosphorus, cod } = record;

  const exceededItems: Array<{
    item: string;
    value: number;
    standard: number;
    description: string;
  }> = [];

  const normal = WATER_QUALITY_LEVELS.normal;

  if (ph < normal.ph[0] || ph > normal.ph[1]) {
    exceededItems.push({
      item: 'pH值',
      value: ph,
      standard: normal.ph[0],
      description: `pH值${ph}超出正常范围(${normal.ph[0]}-${normal.ph[1]}`,
    });
  }

  if (dissolvedOxygen < normal.dissolvedOxygen[0]) {
    exceededItems.push({
      item: '溶解氧',
      value: dissolvedOxygen,
      standard: normal.dissolvedOxygen[0],
      description: `溶解氧${dissolvedOxygen}mg/L低于正常标准(≥${normal.dissolvedOxygen[0]}mg/L)`,
    });
  }

  if (turbidity > normal.turbidity[1]) {
    exceededItems.push({
      item: '浊度',
      value: turbidity,
      standard: normal.turbidity[1],
      description: `浊度${turbidity}NTU超过正常标准(≤${normal.turbidity[1]}NTU)`,
    });
  }

  if (ammoniaNitrogen > normal.ammoniaNitrogen[1]) {
    exceededItems.push({
      item: '氨氮',
      value: ammoniaNitrogen,
      standard: normal.ammoniaNitrogen[1],
      description: `氨氮${ammoniaNitrogen}mg/L超过正常标准(≤${normal.ammoniaNitrogen[1]}mg/L)`,
    });
  }

  if (totalPhosphorus > normal.totalPhosphorus[1]) {
    exceededItems.push({
      item: '总磷',
      value: totalPhosphorus,
      standard: normal.totalPhosphorus[1],
      description: `总磷${totalPhosphorus}mg/L超过正常标准(≤${normal.totalPhosphorus[1]}mg/L)`,
    });
  }

  if (cod > normal.cod[1]) {
    exceededItems.push({
      item: '化学需氧量',
      value: cod,
      standard: normal.cod[1],
      description: `COD${cod}mg/L超过正常标准(≤${normal.cod[1]}mg/L)`,
    });
  }

  let level: 'normal' | 'attention' | 'warning' | 'danger' = 'normal';
  
  if (exceededItems.length === 0) {
    level = 'normal';
  } else {
      const warning = WATER_QUALITY_LEVELS.warning;
      const attention = WATER_QUALITY_LEVELS.attention;

      let isDanger = false;
      let isWarning = false;

      if (dissolvedOxygen < attention.dissolvedOxygen[0] || turbidity > warning.turbidity[1] ||
          ammoniaNitrogen > warning.ammoniaNitrogen[1]) {
        if (dissolvedOxygen < 3 || turbidity > 50 || ammoniaNitrogen > 1) {
          isDanger = true;
        } else {
          isWarning = true;
        }
      }

      if (cod > warning.cod[1] || totalPhosphorus > warning.totalPhosphorus[1]) {
        isWarning = true;
      }

      if (isDanger) {
        level = 'danger';
      } else if (isWarning) {
        level = 'warning';
      } else {
        level = 'attention';
      }
    }

  return { level, exceededItems };
}

export function getWaterQualityLevelInfo(level: 'normal' | 'attention' | 'warning' | 'danger') {
  switch (level) {
    case 'normal':
      return { label: '正常', color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500' };
    case 'attention':
      return { label: '关注', color: 'text-blue-600', bg: 'bg-blue-100', dot: 'bg-blue-500' };
    case 'warning':
      return { label: '预警', color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' };
    case 'danger':
      return { label: '危险', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
  }
}

export function getReviewStatusInfo(status: 'pending' | 'reviewed' | 'rejected') {
  switch (status) {
    case 'pending':
      return { label: '待复核', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    case 'reviewed':
      return { label: '已复核', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    case 'rejected':
      return { label: '已驳回', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  }
}

export function updateReviewRecord(
  record: WaterQualityRecord,
  status: 'reviewed' | 'rejected',
  remark: string,
  reviewer: string
): WaterQualityRecord {
  return {
    ...record,
    reviewStatus: status,
    reviewRemark: remark,
    reviewer,
    reviewTime: new Date().toLocaleString('zh-CN'),
  };
}

export function addSupplementRecord(
  baseRecord: Partial<WaterQualityRecord>,
  supplementData: Partial<WaterQualityRecord>
): WaterQualityRecord {
  return {
    ...baseRecord,
    ...supplementData,
    id: `wq-supp-${Date.now()}`,
    isSupplement: true,
    supplementTime: new Date().toLocaleString('zh-CN'),
    reviewStatus: 'pending',
  } as WaterQualityRecord;
}

export function analyzeTrend(records: WaterQualityRecord[]): {
  trend: 'improving' | 'stable' | 'declining';
  description: string;
} {
  if (records.length < 2) {
    return { trend: 'stable', description: '数据不足，无法判断趋势' };
  }

  const sorted = [...records].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const severity = (r: WaterQualityRecord) => {
    switch (r.warningLevel) {
      case 'normal': return 0;
      case 'attention': return 1;
      case 'warning': return 2;
      case 'danger': return 3;
    }
  };

  const firstAvg = firstHalf.reduce((sum, r) => sum + severity(r), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, r) => sum + severity(r), 0) / secondHalf.length;

  if (secondAvg < firstAvg - 0.3) {
    return { trend: 'improving', description: '水质整体呈改善趋势' };
  } else if (secondAvg > firstAvg + 0.3) {
    return { trend: 'declining', description: '水质整体呈下降趋势，需加强关注' };
  } else {
    return { trend: 'stable', description: '水质整体保持稳定' };
  }
}
