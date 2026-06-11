import { useMemo } from 'react';
import type { WindProfilePoint, HeightUnit } from '@/types';

export interface UnitDetectionResult {
  hasMixedUnits: boolean;
  unitCounts: Record<HeightUnit, number>;
  mixedPointIds: string[];
  suggestedSteps: string[];
}

export function useUnitDetection(points: WindProfilePoint[]): UnitDetectionResult {
  return useMemo(() => {
    const unitCounts: Record<HeightUnit, number> = { m: 0, F: 0, '层': 0 };
    const mixedPointIds: string[] = [];

    points.forEach((p) => {
      unitCounts[p.heightUnit]++;
      mixedPointIds.push(p.id);
    });

    const usedUnits = (Object.keys(unitCounts) as HeightUnit[]).filter(
      (u) => unitCounts[u] > 0
    );
    const hasMixedUnits = usedUnits.length >= 2;

    const suggestedSteps = hasMixedUnits
      ? [
          '第一步：确认各批数据原始采集文档中标注的高度单位基准（m/层/F是否按3m/层换算）。',
          '第二步：在 CSV 明细中按 heightUnit 分列筛选，定位到出现单位切换的那批记录。',
          '第三步：与现场测杆安装记录表核对，优先采信手持激光测距仪的实测米数。',
          '第四步：统一换算为米(m)后重跑剖面，再与当前异常点比对是否消除。',
        ]
      : [];

    return { hasMixedUnits, unitCounts, mixedPointIds, suggestedSteps };
  }, [points]);
}
