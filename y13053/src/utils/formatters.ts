import type { RecordStatus } from '@/types';

export function formatWindDir(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return `${dirs[idx]} ${deg}°`;
}

export const statusMeta: Record<RecordStatus, { label: string; className: string; dot: string }> = {
  normal: {
    label: '正常',
    className: 'bg-tealish-light text-tealish-dark border-tealish',
    dot: 'bg-tealish',
  },
  supplement: {
    label: '补录',
    className: 'bg-caution-light text-caution-dark border-caution',
    dot: 'bg-caution',
  },
  anomaly: {
    label: '异常',
    className: 'bg-alert-light text-alert-dark border-alert',
    dot: 'bg-alert',
  },
};

export const sourceTypeMeta: Record<'model' | 'csv' | 'field-photo', { label: string; iconName: string }> = {
  model: { label: '模型文件', iconName: 'Box' },
  csv: { label: 'CSV 备份', iconName: 'FileSpreadsheet' },
  'field-photo': { label: '现场照片', iconName: 'Camera' },
};
