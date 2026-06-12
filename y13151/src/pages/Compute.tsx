import { useState, useMemo } from 'react'
import {
  Play,
  Settings2,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  User,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import EventDrawer from '@/components/EventDrawer'
import {
  useConfig,
  useComputes,
  useRows,
  useActions,
  useHasPendingDirection,
  useSelectedBatchId,
  useAnomaliesByRowId,
} from '@/hooks/useAppStore'
import type {
  ComputeRecord,
  SensorRow,
  FailCategory,
  ManualReason,
  ResultLevel,
  TimeRangeThreshold,
} from '@/types'
import { formatTimestamp } from '@/utils/exporter'

const FAIL_OPTIONS: { value: FailCategory; label: string; desc: string }[] = [
  { value: 'formula', label: '公式问题', desc: '公式版本缺失、解析错误' },
  { value: 'unit', label: '单位问题', desc: '单位未知、换算失败' },
  { value: 'threshold', label: '阈值问题', desc: '阈值缺失、时段越界' },
]

const MANUAL_REASON_OPTIONS: { value: ManualReason; label: string }[] = [
  { value: 'formula', label: '公式调整' },
  { value: 'unit', label: '单位调整' },
  { value: 'threshold', label: '阈值调整' },
]

const Compute = () => {
  const config = useConfig()
  const computes = useComputes()
  const rows = useRows()
  const { setConfig, runCompute, markFail, manualOverride } = useActions()
  const selectedBatchId = useSelectedBatchId()
  const hasPending = useHasPendingDirection(selectedBatchId)

  const [failDialog, setFailDialog] = useState<{ computeId: string; category: FailCategory; note: string } | null>(null)
  const [manualDialog, setManualDialog] = useState<{
    computeId: string
    result: ResultLevel
    reason: ManualReason
    note: string
    by: string
  } | null>(null)
  const [drawerCompute, setDrawerCompute] = useState<ComputeRecord | null>(null)

  const computeTargetRows = useMemo(() => {
    const base = selectedBatchId ? rows.filter((r) => r.batchId === selectedBatchId) : rows
    return base.filter((r) => !r.dirtyFlag && (!r.directionSuspicious || r.directionConfirmed))
  }, [rows, selectedBatchId])

  const rowMap = useMemo(() => {
    const m = new Map<string, SensorRow>()
    rows.forEach((r) => m.set(r.id, r))
    return m
  }, [rows])

  const targetAnomalies = drawerCompute ? useAnomaliesByRowId(drawerCompute.rowId) : []
  const drawerRow = drawerCompute ? rowMap.get(drawerCompute.rowId) : undefined

  const updateThreshold = (val: string) => {
    const n = parseFloat(val)
    if (!isNaN(n)) setConfig({ threshold: n })
  }
  const updateWarningRatio = (val: string) => {
    let n = parseFloat(val)
    if (isNaN(n)) return
    n = Math.max(0.1, Math.min(1, n))
    setConfig({ warningRatio: n })
  }
  const addTimeRange = () => {
    const existing = config.timeRangeThresholds
    const last = existing[existing.length - 1]
    const start = last ? Math.min(24, last.endHour) : 0
    const end = Math.min(24, start + 2)
    if (start >= 24) return
    setConfig({
      timeRangeThresholds: [...existing, { startHour: start, endHour: end, value: config.threshold }],
    })
  }
  const removeTimeRange = (idx: number) => {
    const list = config.timeRangeThresholds.filter((_, i) => i !== idx)
    setConfig({ timeRangeThresholds: list })
  }
  const updateTimeRange = (idx: number, patch: Partial<TimeRangeThreshold>) => {
    const list = config.timeRangeThresholds.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    setConfig({ timeRangeThresholds: list })
  }

  const execute = () => {
    const r = runCompute()
    if (r.skipped > 0) {
      alert(`完成：新计算 ${r.ok} 条，已存在跳过 ${r.skipped} 条`)
    } else {
      alert(`完成：新计算 ${r.ok} 条`)
    }
  }

  return (
    <div>
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-semibold text-primary flex items-center gap-2">
            <Settings2 size={18} /> 阈值与公式配置
          </h3>
          <span className="chip chip-sm chip-outline">公式版本 {config.formulaVersion}</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="form-row">
            <label className="label">主阈值</label>
            <input
              type="number"
              className="input"
              value={config.threshold}
              onChange={(e) => updateThreshold(e.target.value)}
              step={0.1}
            />
            <div className="form-help">超过此值记为临界（critical）</div>
          </div>
          <div className="form-row">
            <label className="label">预警比例 (0-1)</label>
            <input
              type="number"
              className="input"
              value={config.warningRatio}
              onChange={(e) => updateWarningRatio(e.target.value)}
              step={0.05}
              min={0.1}
              max={1}
            />
            <div className="form-help">阈值 × 比例 = 预警线</div>
          </div>
          <div className="form-row">
            <label className="label">单位</label>
            <select
              className="select"
              value={config.unit}
              onChange={(e) => setConfig({ unit: e.target.value })}
            >
              {['dB/s', 'dB', 's', 'Hz'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="form-help">计算时的目标单位</div>
          </div>
          <div className="form-row">
            <label className="label">公式版本</label>
            <input
              className="input"
              value={config.formulaVersion}
              onChange={(e) => setConfig({ formulaVersion: e.target.value })}
            />
            <div className="form-help">变更会记录在计算链中</div>
          </div>
        </div>
        <div className="form-row">
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">阈值模式：
              <span className="chip chip-sm chip-primary ml-2">
                {config.thresholdType === 'absolute' ? '单值阈值' : '分时段阈值'}
              </span>
            </label>
            <div className="flex gap-2">
              <button
                className={'btn btn-sm ' + (config.thresholdType === 'absolute' ? 'btn-primary' : 'btn-outline')}
                onClick={() => setConfig({ thresholdType: 'absolute' })}
              >单值</button>
              <button
                className={'btn btn-sm ' + (config.thresholdType === 'timeRange' ? 'btn-primary' : 'btn-outline')}
                onClick={() => setConfig({ thresholdType: 'timeRange' })}
              >分时段</button>
            </div>
          </div>
          {config.thresholdType === 'timeRange' && (
            <div className="border border-gray-200 rounded p-3 bg-gray-50">
              {config.timeRangeThresholds.map((t, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="text-xs text-gray-500 w-20">时段 #{i + 1}</span>
                  <input
                    type="number"
                    className="input input-sm"
                    style={{ width: 70 }}
                    min={0}
                    max={24}
                    value={t.startHour}
                    onChange={(e) => updateTimeRange(i, { startHour: Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)) })}
                  />
                  <span className="text-gray-400">至</span>
                  <input
                    type="number"
                    className="input input-sm"
                    style={{ width: 70 }}
                    min={0}
                    max={24}
                    value={t.endHour}
                    onChange={(e) => updateTimeRange(i, { endHour: Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)) })}
                  />
                  <span className="text-gray-500 text-xs">点</span>
                  <span className="text-gray-400 mx-2">阈值</span>
                  <input
                    type="number"
                    className="input input-sm"
                    style={{ width: 90 }}
                    value={t.value}
                    onChange={(e) => updateTimeRange(i, { value: parseFloat(e.target.value) || 0 })}
                    step={0.1}
                  />
                  <span className="chip chip-sm chip-gray">{config.unit}</span>
                  <button
                    className="btn btn-sm btn-ghost ml-auto text-coral"
                    onClick={() => removeTimeRange(i)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                <button className="btn btn-sm btn-outline" onClick={addTimeRange}>
                  <Plus size={12} /> 添加时段
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            className="btn btn-primary btn-lg"
            onClick={execute}
            disabled={hasPending || computeTargetRows.length === 0}
          >
            <Play size={16} /> 执行计算
          </button>
          <div className="text-sm text-gray-600">
            候选行：<span className="font-mono font-semibold">{computeTargetRows.length}</span> 条
            <span className="mx-2 text-gray-400">·</span>
            已计算：<span className="font-mono font-semibold">{computes.length}</span> 条
          </div>
          {hasPending && (
            <span className="chip chip-coral ml-auto">
              <AlertCircle size={12} />
              存在未处理方向疑点，请先到日志工作台确认
            </span>
          )}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{ minWidth: 1300 }}>
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th style={{ width: 140 }}>原始值 → 计算值</th>
                <th style={{ width: 80 }}>单位</th>
                <th style={{ width: 90 }}>阈值</th>
                <th style={{ width: 90 }}>结果等级</th>
                <th style={{ width: 100 }}>状态</th>
                <th style={{ width: 110 }}>卡壳原因</th>
                <th style={{ width: 110 }}>改判原因</th>
                <th style={{ width: 120 }}>跳变原因</th>
                <th style={{ width: 260 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {computes.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state py-12">
                      <div className="empty-state-title">暂无计算记录</div>
                      <div className="empty-state-desc">点击上方「执行计算」开始</div>
                    </div>
                  </td>
                </tr>
              ) : (
                [...computes].reverse().map((c) => {
                  const row = rowMap.get(c.rowId)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="font-mono text-xs text-primary">{c.id.slice(-6)}</div>
                        {row && (
                          <div className="text-xs text-gray-400 mt-0.5">{formatTimestamp(row.timestamp).slice(5, 16)}</div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 font-mono text-sm">
                          <span className="text-gray-600">{isNaN(c.rawValue) ? '—' : c.rawValue.toFixed(2)}</span>
                          <span className="text-gray-400">→</span>
                          <span className={
                            c.result === 'critical' ? 'text-coral font-semibold'
                              : c.result === 'warning' ? 'text-amber font-semibold'
                              : 'text-moss font-semibold'
                          }>
                            {isNaN(c.computedValue) ? '算不出' : c.computedValue.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="chip chip-sm chip-gray">{c.unit}</span>
                      </td>
                      <td className="font-mono text-sm">{c.threshold}</td>
                      <td>
                        <StatusBadge kind={{ type: 'result', value: c.result }} size="sm" />
                      </td>
                      <td>
                        <StatusBadge kind={{ type: 'compute', value: c.status }} size="sm" />
                      </td>
                      <td>
                        {c.failCategory
                          ? <StatusBadge kind={{ type: 'fail', value: c.failCategory }} size="sm" />
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </td>
                      <td>
                        {c.manualReason
                          ? <StatusBadge kind={{ type: 'manual', value: c.manualReason }} size="sm" />
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </td>
                      <td>
                        {c.jumpCause
                          ? <StatusBadge kind={{ type: 'jump', value: c.jumpCause }} size="sm" />
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {c.status === 'success' && (
                            <>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setFailDialog({ computeId: c.id, category: 'formula', note: '' })}
                              >
                                <AlertTriangle size={12} /> 标记失败
                              </button>
                              <button
                                className="btn btn-sm btn-amber"
                                onClick={() => setManualDialog({
                                  computeId: c.id,
                                  result: c.result === 'normal' ? 'warning' : c.result,
                                  reason: 'threshold',
                                  note: '',
                                  by: '小宋',
                                })}
                              >
                                <User size={12} /> 人工改判
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setDrawerCompute(c)}
                          >
                            <Eye size={12} /> 解释
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {failDialog && (
        <div className="dialog-overlay" onClick={() => setFailDialog(null)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header flex items-center justify-between">
              <div className="dialog-title flex items-center gap-2">
                <AlertTriangle size={18} className="text-coral" /> 标记为失败
              </div>
              <div className="drawer-close" onClick={() => setFailDialog(null)}>
                <X size={16} />
              </div>
            </div>
            <div className="dialog-body">
              <div className="form-row">
                <label className="label">卡壳原因（三选一）</label>
                <div className="radio-group">
                  {FAIL_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={'radio-item' + (failDialog.category === opt.value ? ' selected' : '')}
                    >
                      <input
                        type="radio"
                        name="failCat"
                        checked={failDialog.category === opt.value}
                        onChange={() => setFailDialog({ ...failDialog, category: opt.value })}
                      />
                      <div>
                        <div className="font-medium text-gray-800">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="label">备注</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="详细说明卡壳原因..."
                  value={failDialog.note}
                  onChange={(e) => setFailDialog({ ...failDialog, note: e.target.value })}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-outline" onClick={() => setFailDialog(null)}>取消</button>
              <button
                className="btn btn-coral"
                onClick={() => {
                  markFail(failDialog.computeId, failDialog.category, failDialog.note)
                  setFailDialog(null)
                }}
              >
                确认标记失败
              </button>
            </div>
          </div>
        </div>
      )}
      {manualDialog && (
        <div className="dialog-overlay" onClick={() => setManualDialog(null)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header flex items-center justify-between">
              <div className="dialog-title flex items-center gap-2">
                <User size={18} className="text-amber" /> 人工改判
              </div>
              <div className="drawer-close" onClick={() => setManualDialog(null)}>
                <X size={16} />
              </div>
            </div>
            <div className="dialog-body">
              <div className="form-row">
                <label className="label">新结果等级</label>
                <div className="flex gap-2">
                  {(['normal', 'warning', 'critical'] as ResultLevel[]).map((r) => (
                    <button
                      key={r}
                      className={
                        'btn flex-1 ' +
                        (manualDialog.result === r
                          ? (r === 'normal' ? 'btn-moss' : r === 'warning' ? 'btn-amber' : 'btn-coral')
                          : 'btn-outline')
                      }
                      onClick={() => setManualDialog({ ...manualDialog, result: r })}
                    >
                      {r === 'normal' ? '正常' : r === 'warning' ? '预警' : '临界'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="label">改判理由（三选一）</label>
                <div className="radio-group">
                  {MANUAL_REASON_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={'radio-item' + (manualDialog.reason === opt.value ? ' selected' : '')}
                    >
                      <input
                        type="radio"
                        name="manualReason"
                        checked={manualDialog.reason === opt.value}
                        onChange={() => setManualDialog({ ...manualDialog, reason: opt.value })}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="label">改判备注</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="说明具体改判原因..."
                  value={manualDialog.note}
                  onChange={(e) => setManualDialog({ ...manualDialog, note: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label className="label">操作人</label>
                <input
                  className="input"
                  value={manualDialog.by}
                  onChange={(e) => setManualDialog({ ...manualDialog, by: e.target.value })}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-outline" onClick={() => setManualDialog(null)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  manualOverride(
                    manualDialog.computeId,
                    manualDialog.result,
                    manualDialog.reason,
                    manualDialog.note,
                    manualDialog.by,
                  )
                  setManualDialog(null)
                }}
              >
                <Save size={14} /> 确认改判
              </button>
            </div>
          </div>
        </div>
      )}
      <EventDrawer
        open={drawerCompute !== null}
        onClose={() => setDrawerCompute(null)}
        row={drawerRow}
        compute={drawerCompute || undefined}
        anomaly={targetAnomalies[0]}
      />
    </div>
  )
}

export default Compute
