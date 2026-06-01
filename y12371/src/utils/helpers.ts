import type { ScoreStatus, AnomalyType, TaskType, AnnotationStatus, AnomalyStatus, TaskStatus } from '../types'

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusLabel(status: ScoreStatus): string {
  const labels: Record<ScoreStatus, string> = {
    normal: '正常',
    pending: '待确认',
    anomaly: '异常',
  }
  return labels[status]
}

export function getStatusColor(status: ScoreStatus): string {
  const colors: Record<ScoreStatus, string> = {
    normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    anomaly: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return colors[status]
}

export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    version_mismatch: '版本错用',
    annotation_override: '批注覆盖',
    measure_misalignment: '小节错位',
  }
  return labels[type]
}

export function getAnomalyTypeIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    version_mismatch: 'files',
    annotation_override: 'edit-3',
    measure_misalignment: 'align-justify',
  }
  return icons[type]
}

export function getTaskTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    annotation_merge: '批注合并',
    version_check: '版本校验',
    part_alignment: '声部对齐',
  }
  return labels[type]
}

export function getAnnotationStatusLabel(status: AnnotationStatus): string {
  const labels: Record<AnnotationStatus, string> = {
    merged: '已合并',
    conflict: '有冲突',
    pending: '待处理',
  }
  return labels[status]
}

export function getAnnotationStatusColor(status: AnnotationStatus): string {
  const colors: Record<AnnotationStatus, string> = {
    merged: 'bg-emerald-500/20 text-emerald-400',
    conflict: 'bg-red-500/20 text-red-400',
    pending: 'bg-amber-500/20 text-amber-400',
  }
  return colors[status]
}

export function getAnomalyStatusLabel(status: AnomalyStatus): string {
  const labels: Record<AnomalyStatus, string> = {
    open: '待处理',
    confirmed: '已确认',
    resolved: '已解决',
  }
  return labels[status]
}

export function getAnomalyStatusColor(status: AnomalyStatus): string {
  const colors: Record<AnomalyStatus, string> = {
    open: 'bg-red-500/20 text-red-400',
    confirmed: 'bg-amber-500/20 text-amber-400',
    resolved: 'bg-emerald-500/20 text-emerald-400',
  }
  return colors[status]
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: '等待中',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
  }
  return labels[status]
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-slate-500/20 text-slate-400',
    running: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
  }
  return colors[status]
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
