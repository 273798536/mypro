import type { FuturesData, DetectionResult, MonthGap, VolumeOcclusion } from '../types';

function monthToIndex(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return year * 12 + m;
}

export function detectMonthGaps(
  contracts: FuturesData[],
  timeWindow: string = ''
): { gaps: MonthGap[]; detections: DetectionResult[] } {
  const sorted = [...contracts].sort((a, b) => a.contractMonth.localeCompare(b.contractMonth));
  const gaps: MonthGap[] = [];
  const detections: DetectionResult[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const idxA = monthToIndex(sorted[i].contractMonth);
    const idxB = monthToIndex(sorted[i + 1].contractMonth);
    const gapSize = idxB - idxA;

    if (gapSize > 1) {
      const gap: MonthGap = {
        beforeMonth: sorted[i].contractMonth,
        afterMonth: sorted[i + 1].contractMonth,
        gapSize: gapSize - 1,
        dataIds: [sorted[i].id, sorted[i + 1].id],
      };
      gaps.push(gap);

      const twPrefix = timeWindow ? `${timeWindow}-` : '';
      detections.push({
        id: `det-gap-${twPrefix}${sorted[i].contractMonth}-${sorted[i + 1].contractMonth}`,
        type: 'month_gap',
        severity: 'warning',
        description: `月份缺口: ${sorted[i].contractMonth}→${sorted[i + 1].contractMonth}, 缺失${gapSize - 1}个月, 原始行号: ${sorted[i].originalRow}, ${sorted[i + 1].originalRow}`,
        originalRow: sorted[i].originalRow,
        relatedDataIds: gap.dataIds,
        resolved: false,
      });
    }
  }

  return { gaps, detections };
}

export function detectVolumeOcclusion(
  contracts: FuturesData[],
  threshold: number = 0.6,
  timeWindow: string = ''
): { occlusions: VolumeOcclusion[]; detections: DetectionResult[] } {
  const sorted = [...contracts].sort((a, b) => a.contractMonth.localeCompare(b.contractMonth));
  const occlusions: VolumeOcclusion[] = [];
  const detections: DetectionResult[] = [];

  if (sorted.length < 2) return { occlusions, detections };

  const maxVolume = Math.max(...sorted.map((c) => c.volume));
  if (maxVolume === 0) return { occlusions, detections };

  for (let i = 0; i < sorted.length - 1; i++) {
    const volA = sorted[i].volume / maxVolume;
    const volB = sorted[i + 1].volume / maxVolume;
    const overlapRatio = (volA + volB) / 2;

    if (overlapRatio > threshold) {
      const occlusion: VolumeOcclusion = {
        monthA: sorted[i].contractMonth,
        monthB: sorted[i + 1].contractMonth,
        overlapRatio,
        dataIds: [sorted[i].id, sorted[i + 1].id],
      };
      occlusions.push(occlusion);

      const twPrefix = timeWindow ? `${timeWindow}-` : '';
      detections.push({
        id: `det-vol-${twPrefix}${sorted[i].contractMonth}-${sorted[i + 1].contractMonth}`,
        type: 'volume_occlusion',
        severity: 'warning',
        description: `成交量遮挡: ${sorted[i].contractMonth}与${sorted[i + 1].contractMonth}, 遮挡率${(overlapRatio * 100).toFixed(1)}%, 原始行号: ${sorted[i].originalRow}, ${sorted[i + 1].originalRow}`,
        originalRow: sorted[i].originalRow,
        relatedDataIds: occlusion.dataIds,
        resolved: false,
      });
    }
  }

  return { occlusions, detections };
}

export function detectAllAnomalies(data: FuturesData[]): DetectionResult[] {
  const timeWindows = [...new Set(data.map((d) => d.timeWindow))].sort();
  const allDetections: DetectionResult[] = [];

  for (const tw of timeWindows) {
    const contracts = data.filter((d) => d.timeWindow === tw);
    const { detections: gapDetections } = detectMonthGaps(contracts, tw);
    const { detections: volDetections } = detectVolumeOcclusion(contracts, 0.6, tw);
    allDetections.push(...gapDetections, ...volDetections);
  }

  return allDetections;
}

export function getAnomalyDataIds(detections: DetectionResult[]): Set<string> {
  const ids = new Set<string>();
  detections
    .filter((d) => d.type === 'month_gap' || d.type === 'volume_occlusion')
    .forEach((d) => d.relatedDataIds.forEach((id) => ids.add(id)));
  return ids;
}