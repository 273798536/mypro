export type FlagType = 'old_coord' | 'supplementary_note' | 'verbal_note' | 'merge_error';

export type NoteType = 'system' | 'supplementary' | 'verbal';

export interface MonitoringPoint {
  id: string;
  code: string;
  x: number;
  depth: number;
  waterLevel: number;
  coordVersion: 'v1' | 'v2';
  oldCoord?: { x: number; depth: number };
  flags: FlagType[];
  description: string;
}

export interface Note {
  id: string;
  pointId: string;
  type: NoteType;
  content: string;
  author: string;
  createdAt: string;
}

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  filters: FilterState;
  viewport: Viewport;
  selectedPointId: string | null;
  createdAt: string;
}

export interface FilterState {
  codes: string[];
  minDepth: number;
  maxDepth: number;
  flags: FlagType[];
}

export const FLAG_LABELS: Record<FlagType, { label: string; emoji: string; color: string }> = {
  old_coord: { label: '旧版坐标', emoji: '📜', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  supplementary_note: { label: '后补备注', emoji: '📝', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  verbal_note: { label: '口头备注', emoji: '🗣', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  merge_error: { label: '相邻合错', emoji: '⚠', color: 'bg-red-100 text-red-800 border-red-300' },
};

export const NOTE_LABELS: Record<NoteType, { label: string; emoji: string; color: string }> = {
  system: { label: '系统备注', emoji: '💾', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  supplementary: { label: '后补备注', emoji: '📝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  verbal: { label: '口头备注', emoji: '🗣', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};
