import type { Conflict, ConflictType } from '@/types';

const conflictTypeLabels: Record<ConflictType, string> = {
  cable_cross: '线缆穿越',
  equipment_block: '设备遮挡',
  route_conflict: '走位冲突',
};

const severityLabels: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};

const severityColors: Record<string, string> = {
  critical: '#ff0055',
  warning: '#ffaa00',
  info: '#00aaff',
};

export function getConflictTypeLabel(type: ConflictType): string {
  return conflictTypeLabels[type] || type;
}

export function getSeverityLabel(severity: string): string {
  return severityLabels[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  return severityColors[severity] || '#8892b0';
}

export function generateHumanReadableDescription(conflict: Conflict): string {
  if (conflict.humanReadableDesc) {
    return conflict.humanReadableDesc;
  }

  const typeLabel = getConflictTypeLabel(conflict.type);
  const time = conflict.timestamp.toFixed(1);

  switch (conflict.type) {
    case 'cable_cross':
      return `${typeLabel}：第${time}秒时检测到线缆交叉，可能产生信号干扰`;
    case 'equipment_block':
      return `${typeLabel}：第${time}秒时检测到设备遮挡线缆，可能影响信号传输`;
    case 'route_conflict':
      return `${typeLabel}：第${time}秒时检测到乐手走位冲突，可能发生碰撞`;
    default:
      return `${typeLabel}：第${time}秒时检测到异常，请查看详情`;
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getDataSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    main_model: '舞台主模型',
    musician_report: '乐手位置上报',
    equipment_box: '设备箱补证',
  };
  return labels[source] || source;
}

export function getDataSourcePriority(source: string): number {
  const priorities: Record<string, number> = {
    main_model: 1,
    musician_report: 2,
    equipment_box: 3,
  };
  return priorities[source] || 99;
}
