import { useMemo } from 'react';
import type { Streamline, FilterConditions, ColorScale } from '@/types';
import { filterStreamlinesByAnomalyType, filterStreamlinesBySpeedRange } from '@/engine/detection';
import { getStreamlineColor } from '@/utils/color';

export function useFilteredStreamlines(
  streamlines: Streamline[],
  filters: FilterConditions
): Streamline[] {
  return useMemo(() => {
    let filtered = [...streamlines];

    if (filters.anomalyTypes.length > 0) {
      filtered = filterStreamlinesByAnomalyType(filtered, filters.anomalyTypes);
    }

    if (filters.showOnlyAnomalies) {
      filtered = filtered.filter((s) => s.anomalies.length > 0);
    }

    if (filters.speedRange[0] > 0 || filters.speedRange[1] < 100) {
      filtered = filterStreamlinesBySpeedRange(filtered, filters.speedRange);
    }

    if (filters.streamlineIds.length > 0) {
      filtered = filtered.filter((s) => filters.streamlineIds.includes(s.id));
    }

    return filtered;
  }, [streamlines, filters]);
}

export function useStreamlineColors(
  streamlines: Streamline[],
  colorScale: ColorScale | null,
  useColorScale: boolean = false
): Map<string, string> {
  return useMemo(() => {
    const colorMap = new Map<string, string>();

    streamlines.forEach((streamline) => {
      const avgSpeed =
        streamline.points.reduce((sum, p) => sum + p.speed, 0) /
        streamline.points.length;
      const color = getStreamlineColor(
        streamline.status,
        avgSpeed,
        colorScale,
        useColorScale
      );
      colorMap.set(streamline.id, color);
    });

    return colorMap;
  }, [streamlines, colorScale, useColorScale]);
}

export function useStreamlineStats(streamlines: Streamline[]) {
  return useMemo(() => {
    const totalPoints = streamlines.reduce(
      (sum, s) => sum + s.points.length,
      0
    );
    const avgSpeed =
      streamlines.reduce(
        (sum, s) =>
          sum +
          s.points.reduce((ps, p) => ps + p.speed, 0) / s.points.length,
        0
      ) / streamlines.length;
    const maxSpeed = Math.max(
      ...streamlines.flatMap((s) => s.points.map((p) => p.speed))
    );

    return {
      totalStreamlines: streamlines.length,
      totalPoints,
      avgSpeed,
      maxSpeed,
    };
  }, [streamlines]);
}
