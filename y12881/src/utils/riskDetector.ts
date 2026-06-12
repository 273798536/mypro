import { PlanktonSample, RiskLevel, WaterLayer } from '@/types';

export function detectCountAnomaly(samples: PlanktonSample[]): string[] {
  const anomalyIds: string[] = [];
  const groups: Record<string, PlanktonSample[]> = {};

  samples.forEach((s) => {
    const key = `${s.species}-${s.waterLayer}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  Object.entries(groups).forEach(([, group]) => {
    if (group.length < 5) return;
    const counts = group.map((s) => s.count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 3 * stdDev;

    group.forEach((s) => {
      if (s.count > threshold) {
        anomalyIds.push(s.id);
      }
    });
  });

  return anomalyIds;
}

export function groupByBuoy(samples: PlanktonSample[]): Record<string, PlanktonSample[]> {
  const groups: Record<string, PlanktonSample[]> = {};
  samples.forEach((s) => {
    if (!groups[s.buoyId]) groups[s.buoyId] = [];
    groups[s.buoyId].push(s);
  });
  return groups;
}

export function detectBuoyOffline(samples: PlanktonSample[]): string[] {
  const groups = groupByBuoy(samples);
  const offlineBuoyIds: string[] = [];

  Object.entries(groups).forEach(([buoyId, buoySamples]) => {
    const byLayer: Record<WaterLayer, PlanktonSample[]> = { surface: [], middle: [], deep: [] };
    buoySamples.forEach((s) => byLayer[s.waterLayer].push(s));
    Object.values(byLayer).forEach((layerSamples) => {
      if (layerSamples.length >= 3 && layerSamples.every((s) => s.status === 'pending')) {
        if (!offlineBuoyIds.includes(buoyId)) offlineBuoyIds.push(buoyId);
      }
    });
  });

  return offlineBuoyIds;
}

export function aggregateRisk(samples: PlanktonSample[]): { level: RiskLevel; count: number } {
  const counts = { none: 0, low: 0, medium: 0, high: 0 };
  samples.forEach((s) => counts[s.riskLevel]++);

  let level: RiskLevel = 'none';
  if (counts.high > 0) level = 'high';
  else if (counts.medium > 0) level = 'medium';
  else if (counts.low > 0) level = 'low';

  return { level, count: counts.low + counts.medium + counts.high };
}
