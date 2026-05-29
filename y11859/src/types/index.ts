export type NoiseSourceType = "road" | "construction" | "commercial";

export interface Building {
  id: string;
  name: string;
  position: [number, number, number];
  floors: number;
  floorHeight: number;
  width: number;
  depth: number;
}

export interface TimeRange {
  startHour: number;
  endHour: number;
  level: number;
}

export interface NoiseSource {
  id: string;
  type: NoiseSourceType;
  name: string;
  position: [number, number, number];
  baseLevel: number;
  timeRanges: TimeRange[];
  importedAt: number;
}

export interface NoiseContribution {
  sourceId: string;
  sourceType: NoiseSourceType;
  sourceName: string;
  level: number;
  percentage: number;
  distance: number;
  attenuationNote: string;
}

export interface FloorNoise {
  buildingId: string;
  floor: number;
  totalLevel: number;
  contributions: NoiseContribution[];
  occlusionNote?: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: number;
  type: "building" | "road" | "construction" | "commercial";
  timeCoverage: TimeRange[];
  status: "success" | "conflict" | "duplicate";
  conflictDetail?: string;
}

export interface ConflictItem {
  type: "time_mismatch" | "floor_occlusion" | "source_duplicate";
  sources: string[];
  timeRange?: TimeRange;
  suggestion: string;
}

export const SOURCE_TYPE_COLORS: Record<NoiseSourceType, string> = {
  road: "#4a9eff",
  construction: "#ffc107",
  commercial: "#e040fb",
};

export const SOURCE_TYPE_LABELS: Record<NoiseSourceType, string> = {
  road: "道路",
  construction: "工地",
  commercial: "商业街",
};

export const NOISE_STANDARD = 55;

export function getNoiseLevel(totalLevel: number): { label: string; color: string } {
  if (totalLevel >= 70) return { label: "严重超标", color: "#ff2d2d" };
  if (totalLevel >= 65) return { label: "中度超标", color: "#ff6b35" };
  if (totalLevel >= 55) return { label: "轻度超标", color: "#ffc107" };
  return { label: "达标", color: "#4caf50" };
}
