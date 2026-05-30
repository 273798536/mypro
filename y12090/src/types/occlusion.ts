import type { Point3D } from './seat';

export type OcclusionType =
  | 'normal'
  | 'subtitle_screen'
  | 'obstacle'
  | 'wall_penetration'
  | 'screen_height_error';

export type OcclusionSeverity = 'info' | 'warning' | 'error';

export type OcclusionSource =
  | 'subtitle_screen'
  | 'other_seat'
  | 'wall'
  | 'parameter_error'
  | 'none';

export interface OcclusionResult {
  id: string;
  seatId: string;
  type: OcclusionType;
  severity: OcclusionSeverity;
  description: string;
  source: OcclusionSource;
  intersectionPoint?: Point3D;
  distance?: number;
}

export interface OcclusionFilter {
  types: OcclusionType[];
  severities: OcclusionSeverity[];
  sources: OcclusionSource[];
}

export interface SeatFilter {
  sections: string[];
  rows: string[];
  seatNumbers: number[];
}

export interface CombinedFilter {
  occlusion: OcclusionFilter;
  seat: SeatFilter;
  showBadRows: boolean;
  showSightLines: boolean;
}

export const OCCLUSION_TYPE_LABELS: Record<OcclusionType, string> = {
  normal: '视线正常',
  subtitle_screen: '字幕屏遮挡',
  obstacle: '障碍物遮挡',
  wall_penetration: '视线穿墙',
  screen_height_error: '屏幕高度错误',
};

export const OCCLUSION_SEVERITY_LABELS: Record<OcclusionSeverity, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
};

export const OCCLUSION_SOURCE_LABELS: Record<OcclusionSource, string> = {
  subtitle_screen: '字幕屏',
  other_seat: '其他座位',
  wall: '墙体',
  parameter_error: '参数错误',
  none: '无',
};

export const OCCLUSION_TYPE_COLORS: Record<OcclusionType, string> = {
  normal: '#06B6D4',
  subtitle_screen: '#EF4444',
  obstacle: '#F59E0B',
  wall_penetration: '#8B5CF6',
  screen_height_error: '#EC4899',
};
