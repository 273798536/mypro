import { PointStatus, ConflictType } from '@/types';

export const statusColors: Record<PointStatus, string> = {
  reachable: '#34c759',
  collision: '#ff3b30',
  singularity: '#af52de',
  joint_limit: '#ff9500',
  out_of_workspace: '#8e8e93',
};

export const conflictTypeColors: Record<ConflictType, string> = {
  joint_limit: '#ff9500',
  collision: '#ff3b30',
  singularity: '#af52de',
};

export const statusLabels: Record<PointStatus, string> = {
  reachable: '可达',
  collision: '碰撞',
  singularity: '奇异位形',
  joint_limit: '关节越界',
  out_of_workspace: '工作空间外',
};

export const conflictTypeLabels: Record<ConflictType, string> = {
  joint_limit: '关节越界',
  collision: '碰撞',
  singularity: '奇异位形',
};

export const diffColors = {
  added: '#30d158',
  removed: '#ff453a',
  changed: '#ffd60a',
};

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 1, 0];
}

export function getStatusColorHex(status: PointStatus): string {
  return statusColors[status] || '#8e8e93';
}

export function getStatusColorRgb(status: PointStatus): [number, number, number] {
  return hexToRgb(getStatusColorHex(status));
}
