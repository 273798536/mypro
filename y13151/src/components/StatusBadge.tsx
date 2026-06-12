import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  PauseCircle,
  TrendingUp,
  Wrench,
  User,
  Gauge,
  FileWarning,
  CheckSquare,
  Square,
  XSquare,
  HelpCircle,
} from 'lucide-react'
import type {
  BatchStatus,
  ComputeStatus,
  ResultLevel,
  FailCategory,
  AnomalyStatus,
  JumpCause,
  ManualReason,
  AnomalyType,
} from '@/types'

type BadgeKind =
  | { type: 'batch'; value: BatchStatus }
  | { type: 'compute'; value: ComputeStatus }
  | { type: 'result'; value: ResultLevel }
  | { type: 'fail'; value: FailCategory }
  | { type: 'anomaly'; value: AnomalyStatus }
  | { type: 'jump'; value: JumpCause }
  | { type: 'manual'; value: ManualReason }
  | { type: 'anomalyType'; value: AnomalyType }
  | { type: 'direction'; value: boolean | null | undefined }

const BATCH_META: Record<BatchStatus, { label: string; cls: string; icon?: typeof CheckCircle2 }> = {
  pending: { label: '待处理', cls: 'chip-amber', icon: PauseCircle },
  confirmed: { label: '已确认', cls: 'chip-moss', icon: CheckCircle2 },
  rejected: { label: '已拒绝', cls: 'chip-coral', icon: XCircle },
}

const COMPUTE_META: Record<ComputeStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  success: { label: '计算成功', cls: 'chip-moss', icon: CheckCircle2 },
  failed: { label: '算不出', cls: 'chip-coral', icon: XCircle },
  manual: { label: '人工改判', cls: 'chip-amber', icon: User },
}

const RESULT_META: Record<ResultLevel, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  normal: { label: '正常', cls: 'chip-moss', icon: CheckCircle2 },
  warning: { label: '预警', cls: 'chip-amber', icon: AlertTriangle },
  critical: { label: '临界', cls: 'chip-coral', icon: AlertOctagon },
}

const FAIL_META: Record<FailCategory, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  formula: { label: '公式问题', cls: 'chip-primary', icon: Wrench },
  unit: { label: '单位问题', cls: 'chip-primary', icon: Gauge },
  threshold: { label: '阈值问题', cls: 'chip-primary', icon: FileWarning },
}

const ANOMALY_META: Record<AnomalyStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  open: { label: '待处理', cls: 'chip-coral', icon: AlertTriangle },
  confirmed: { label: '已确认', cls: 'chip-amber', icon: CheckSquare },
  ignored: { label: '已忽略', cls: 'chip-gray', icon: XSquare },
  resolved: { label: '已解决', cls: 'chip-moss', icon: CheckCircle2 },
}

const JUMP_META: Record<JumpCause, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  thresholdChanged: { label: '阈值变更', cls: 'chip-amber', icon: FileWarning },
  unitChanged: { label: '单位变更', cls: 'chip-primary', icon: Gauge },
  manualOverride: { label: '人工改判', cls: 'chip-amber', icon: User },
  rawJump: { label: '原始数据波动', cls: 'chip-coral', icon: TrendingUp },
}

const MANUAL_META: Record<ManualReason, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  formula: { label: '公式调整', cls: 'chip-primary', icon: Wrench },
  unit: { label: '单位调整', cls: 'chip-primary', icon: Gauge },
  threshold: { label: '阈值调整', cls: 'chip-primary', icon: FileWarning },
}

const ANOMALY_TYPE_META: Record<AnomalyType, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  direction: { label: '方向异常', cls: 'chip-amber', icon: AlertTriangle },
  failed: { label: '计算失败', cls: 'chip-coral', icon: XCircle },
  manual: { label: '人工改判', cls: 'chip-amber', icon: User },
  jump: { label: '跳变事件', cls: 'chip-primary', icon: TrendingUp },
}

export interface StatusBadgeProps {
  kind: BadgeKind
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const StatusBadge = ({ kind, size = 'md', showIcon = true }: StatusBadgeProps) => {
  let meta: { label: string; cls: string; icon?: typeof CheckCircle2 }
  if (kind.type === 'batch') meta = BATCH_META[kind.value]
  else if (kind.type === 'compute') meta = COMPUTE_META[kind.value]
  else if (kind.type === 'result') meta = RESULT_META[kind.value]
  else if (kind.type === 'fail') meta = FAIL_META[kind.value]
  else if (kind.type === 'anomaly') meta = ANOMALY_META[kind.value]
  else if (kind.type === 'jump') meta = JUMP_META[kind.value]
  else if (kind.type === 'manual') meta = MANUAL_META[kind.value]
  else if (kind.type === 'anomalyType') meta = ANOMALY_TYPE_META[kind.value]
  else {
    if (kind.value === true) {
      meta = { label: '存在疑点', cls: 'chip-coral', icon: AlertTriangle }
    } else if (kind.value === false) {
      meta = { label: '正常', cls: 'chip-moss', icon: CheckCircle2 }
    } else {
      meta = { label: '—', cls: 'chip-outline', icon: HelpCircle }
    }
  }
  const cls = 'chip ' + meta.cls + (size === 'sm' ? ' chip-sm' : '')
  const Icon = meta.icon
  return (
    <span className={cls}>
      {showIcon && Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {meta.label}
    </span>
  )
}

export default StatusBadge
