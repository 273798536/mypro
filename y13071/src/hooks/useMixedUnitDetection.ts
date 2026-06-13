import { useMemo } from "react";

const FLOOR_PATTERN = /\b[1-9][0-9]?F\b/i;
const UNIT_PATTERN = /第[一二三四五六七八九十百千0-9]+层/;

export interface MixedDetectionResult {
  hasMixed: boolean;
  hasFloor: boolean;
  hasUnit: boolean;
  matchedFloor?: string;
  matchedUnit?: string;
}

export function detectMixedUnit(text: string): MixedDetectionResult {
  const floorMatch = text.match(FLOOR_PATTERN);
  const unitMatch = text.match(UNIT_PATTERN);
  const hasFloor = !!floorMatch;
  const hasUnit = !!unitMatch;
  return {
    hasMixed: hasFloor && hasUnit,
    hasFloor,
    hasUnit,
    matchedFloor: floorMatch?.[0],
    matchedUnit: unitMatch?.[0],
  };
}

export function useMixedUnitDetection(text: string): MixedDetectionResult {
  return useMemo(() => detectMixedUnit(text), [text]);
}
