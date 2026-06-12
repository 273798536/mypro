import { useEffect, useState } from 'react'
import {
  X,
  FileText,
  Navigation,
  Calculator,
  CheckCircle2,
  User,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Save,
  ArrowRightLeft,
  Clock,
} from 'lucide-react'
import type {
  SensorRow,
  ComputeRecord,
  AnomalyQueue,
  AnomalyStatus,
} from '@/types'
import StatusBadge from './StatusBadge'
import {
  useAnomaliesByRowId,
  useComputeByRowId,
  useActions,
  useUINotes,
} from '@/hooks/useAppStore'
import { formatTimestamp } from '@/utils/exporter'

export interface EventDrawerProps {
  open: boolean
  onClose: () => void
  row?: SensorRow
  compute?: ComputeRecord
  anomaly?: AnomalyQueue
}

const ANOMALY_STATUS_OPTIONS: AnomalyStatus[] = ['open', 'confirmed', 'ignored', 'resolved']

const EventDrawer = ({ open, onClose, row: rowProp, compute: computeProp, anomaly: anomalyProp }: EventDrawerProps) => {
  const effectiveRowId = rowProp?.id || computeProp?.rowId || anomalyProp?.rowId || ''
  const row = rowProp
  const compute = computeProp || (effectiveRowId ? undefined : undefined)
    || (effectiveRowId ? undefined : undefined)
  const liveCompute = useComputeByRowId(effectiveRowId)
  const liveAnomalies = useAnomaliesByRowId(effectiveRowId)
  const notes = useUINotes()
  const { updateAnomalyStatus, updateAnomalyNote, setRowNote } = useActions()

  const activeCompute = compute || liveCompute
  const targetAnomaly = anomalyProp || liveAnomalies[0]
  const [localNote, setLocalNote] = useState(notes[effectiveRowId] || '')
  const [anomalyNote, setAnomalyNote] = useState(targetAnomaly?.note || '')

  useEffect(() => {
    setLocalNote(notes[effectiveRowId] || '')
  }, [effectiveRowId, notes])

  useEffect(() => {
    setAnomalyNote(targetAnomaly?.note || '')
  }, [targetAnomaly?.id, targetAnomaly?.note])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const headerTitle = row ? `记录 ${row.id.slice(-6)}` : activeCompute ? `计算记录 ${activeCompute.id.slice(-6)}` : targetAnomaly ? `异常事件` : '详情'

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">{headerTitle}</div>
          <div className="drawer-close" onClick={onClose} title="关闭 (ESC)">
            <X size={18} />
          </div>
        </div>
        <div className="drawer-body">
          {row && (
            <div className="drawer-section">
              <div className="drawer-section-title"><FileText size={13} /> 原始行原文</div>
              <div className="drawer-block mono">{row.rawLine}</div>
            </div>
          )}
          {row && (
            <div className="drawer-section">
              <div className="drawer-section-title"><Navigation size={13} /> 方向疑点与确认</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="chip chip-outline font-mono">方向 {row.direction}</span>
                  <StatusBadge kind={{ type: 'direction', value: row.directionSuspicious }} />
                  {row.directionConfirmed && <span className="chip chip-moss chip-sm">已确认方向</span>}
                  {row.directionIgnored && <span className="chip chip-gray chip-sm">已忽略</span>}
                  {row.dirtyFlag && <StatusBadge kind={{ type: 'direction', value: true }} size="sm" />}
                </div>
                {row.directionImpact && (
                  <div className="text-sm mt-2" style={{ color: 'var(--coral)' }}>
                    <AlertTriangle size={13} className="mr-1" style={{ verticalAlign: '-2px' }} />
                    {row.directionImpact}
                  </div>
                )}
                {row.dirtyFlag && row.dirtyReasons.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">脏数据原因：</div>
                    <div className="flex flex-wrap gap-1">
                      {row.dirtyReasons.map((r, i) => (
                        <span key={i} className="chip chip-amber chip-sm">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600">
                  <Clock size={13} className="mr-1" style={{ verticalAlign: '-2px' }} />
                  采集时间：{formatTimestamp(row.timestamp)}
                </div>
              </div>
            </div>
          )}
          {activeCompute && (
            <div className="drawer-section">
              <div className="drawer-section-title"><Calculator size={13} /> 计算链路</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="chip chip-outline">公式 {activeCompute.formulaVersion}</span>
                  <span className="chip chip-outline">阈值 {activeCompute.threshold}</span>
                  <span className="chip chip-outline">单位 {activeCompute.unit}</span>
                </div>
                {activeCompute.computeSteps?.map((step, i) => (
                  <div key={i} className="chain-step">
                    <div className="chain-step-num">{i + 1}</div>
                    <div className="chain-step-content">
                      <div className="chain-step-label">{step.label}</div>
                      <div className="chain-step-value">{step.value}</div>
                      {step.detail && <div className="text-xs text-gray-500 mt-1">{step.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeCompute && (
            <div className="drawer-section">
              <div className="drawer-section-title"><CheckCircle2 size={13} /> 判定结果</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StatusBadge kind={{ type: 'compute', value: activeCompute.status }} />
                  <StatusBadge kind={{ type: 'result', value: activeCompute.result }} />
                  <span className="chip chip-outline font-mono">
                    {isNaN(activeCompute.rawValue) ? '—' : activeCompute.rawValue} → {isNaN(activeCompute.computedValue) ? '算不出' : activeCompute.computedValue.toFixed(2)}
                  </span>
                </div>
                {activeCompute.originalResult && (
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                    <ArrowRightLeft size={13} className="text-amber" />
                    原始判定：
                    <StatusBadge kind={{ type: 'result', value: activeCompute.originalResult }} size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}
          {activeCompute?.manualAt && (
            <div className="drawer-section">
              <div className="drawer-section-title"><User size={13} /> 人工改判</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {activeCompute.manualReason && <StatusBadge kind={{ type: 'manual', value: activeCompute.manualReason }} />}
                  <span className="chip chip-outline">操作人：{activeCompute.manualBy}</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(activeCompute.manualAt)}</span>
                </div>
                {activeCompute.manualNote && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-700">
                    <div className="text-xs text-gray-500 mb-1">改判理由：</div>
                    {activeCompute.manualNote}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeCompute?.failCategory && (
            <div className="drawer-section">
              <div className="drawer-section-title"><AlertTriangle size={13} /> 卡壳原因</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StatusBadge kind={{ type: 'fail', value: activeCompute.failCategory }} />
                </div>
                {activeCompute.failNote && (
                  <div className="text-sm text-gray-700 mt-2">{activeCompute.failNote}</div>
                )}
              </div>
            </div>
          )}
          {activeCompute?.jumpCause && (
            <div className="drawer-section">
              <div className="drawer-section-title"><TrendingUp size={13} /> 跳变分析</div>
              <div className="drawer-block">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StatusBadge kind={{ type: 'jump', value: activeCompute.jumpCause }} />
                </div>
                {activeCompute.jumpNote && (
                  <div className="text-sm text-gray-700 mt-2">{activeCompute.jumpNote}</div>
                )}
              </div>
            </div>
          )}
          {liveAnomalies.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title"><AlertTriangle size={13} /> 异常队列项 ({liveAnomalies.length})</div>
              {liveAnomalies.map((a) => (
                <div key={a.id} className="drawer-block mb-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge kind={{ type: 'anomalyType', value: a.type }} size="sm" />
                      <StatusBadge kind={{ type: 'anomaly', value: a.status }} size="sm" />
                    </div>
                    <select
                      className="input input-sm"
                      style={{ width: 'auto', minWidth: 100 }}
                      value={a.status}
                      onChange={(e) => updateAnomalyStatus(a.id, e.target.value as AnomalyStatus)}
                    >
                      {ANOMALY_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s === 'open' ? '待处理' : s === 'confirmed' ? '已确认' : s === 'ignored' ? '已忽略' : '已解决'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm text-gray-700 mb-1"><strong>原因：</strong>{a.reason}</div>
                  {a.impact && <div className="text-xs text-gray-500 mb-2">影响：{a.impact}</div>}
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">备注：</div>
                    <textarea
                      className="textarea"
                      rows={2}
                      placeholder="填写备注..."
                      value={a.id === targetAnomaly?.id ? anomalyNote : a.note}
                      onChange={(e) => {
                        if (a.id === targetAnomaly?.id) setAnomalyNote(e.target.value)
                      }}
                      onBlur={() => updateAnomalyNote(a.id, a.id === targetAnomaly?.id ? anomalyNote : a.note)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {effectiveRowId && (
            <div className="drawer-section">
              <div className="drawer-section-title"><MessageSquare size={13} /> 记录备注</div>
              <textarea
                className="textarea"
                rows={3}
                placeholder="为此记录添加备注（仅本地保存）..."
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setRowNote(effectiveRowId, localNote)
                  }}
                >
                  <Save size={13} /> 保存备注
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn btn-outline" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

export default EventDrawer
