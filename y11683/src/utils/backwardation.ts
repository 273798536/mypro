import type { FuturesData, DetectionResult, BackwardationSegment } from '../types';

export function detectBackwardation(
  contracts: FuturesData[],
  timeWindow: string = ''
): { segments: BackwardationSegment[]; detections: DetectionResult[] } {
  const sorted = [...contracts].sort((a, b) => a.contractMonth.localeCompare(b.contractMonth));
  const segments: BackwardationSegment[] = [];
  const detections: DetectionResult[] = [];

  let i = 0;
  while (i < sorted.length - 1) {
    if (sorted[i].price > sorted[i + 1].price) {
      const startIdx = i;
      const dataIds: string[] = [sorted[i].id];
      let endIdx = i + 1;

      while (endIdx < sorted.length - 1 && sorted[endIdx].price > sorted[endIdx + 1].price) {
        dataIds.push(sorted[endIdx].id);
        endIdx++;
      }
      dataIds.push(sorted[endIdx].id);

      const startMonth = sorted[startIdx].contractMonth;
      const endMonth = sorted[endIdx].contractMonth;
      const nearPrice = sorted[startIdx].price;
      const farPrice = sorted[endIdx].price;
      const spread = nearPrice - farPrice;
      const spreadPercent = (spread / farPrice) * 100;

      segments.push({
        startMonth,
        endMonth,
        spread,
        spreadPercent,
        dataIds,
      });

      const twPrefix = timeWindow ? `${timeWindow}-` : '';
      detections.push({
        id: `det-back-${twPrefix}${startMonth}-${endMonth}`,
        type: 'backwardation',
        severity: 'warning',
        description: `倒挂: ${startMonth}→${endMonth}, 价差 ${spread.toFixed(2)} (${spreadPercent.toFixed(2)}%), 原始行号: ${sorted
          .slice(startIdx, endIdx + 1)
          .map((d) => d.originalRow)
          .join(', ')}`,
        originalRow: sorted[startIdx].originalRow,
        relatedDataIds: dataIds,
        resolved: false,
      });

      i = endIdx + 1;
    } else {
      i++;
    }
  }

  return { segments, detections };
}

export function detectAllBackwardation(data: FuturesData[]): DetectionResult[] {
  const timeWindows = [...new Set(data.map((d) => d.timeWindow))].sort();
  const allDetections: DetectionResult[] = [];

  for (const tw of timeWindows) {
    const contracts = data.filter((d) => d.timeWindow === tw);
    const { detections } = detectBackwardation(contracts, tw);
    allDetections.push(...detections);
  }

  return allDetections;
}

export function getBackwardationDataIds(detections: DetectionResult[]): Set<string> {
  const ids = new Set<string>();
  detections
    .filter((d) => d.type === 'backwardation')
    .forEach((d) => d.relatedDataIds.forEach((id) => ids.add(id)));
  return ids;
}