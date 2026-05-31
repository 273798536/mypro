import { useState } from 'react'
import { Save, Trash2, CheckSquare, Square, GitCompare } from 'lucide-react'
import { usePumpStore } from '@/store/usePumpStore'
import { cn } from '@/lib/utils'

const COMPARE_KEYS = [
  { key: 'frictionLoss', label: '沿程损失', unit: 'mH₂O' },
  { key: 'localLoss', label: '局部损失', unit: 'mH₂O' },
  { key: 'totalHeadLoss', label: '总水头损失', unit: 'mH₂O' },
  { key: 'requiredHead', label: '所需扬程', unit: 'mH₂O' },
  { key: 'velocity', label: '流速', unit: 'm/s' },
  { key: 'reynolds', label: '雷诺数', unit: '' },
] as const

type MetricKey = (typeof COMPARE_KEYS)[number]['key']

function formatVal(key: MetricKey, val: number): string {
  if (key === 'reynolds') return val.toFixed(0)
  if (key === 'velocity') return val.toFixed(3)
  return val.toFixed(3)
}

function topPump(snapshot: { matchedPumps: { pumpName: string; isExpired: boolean }[] }): string {
  const first = snapshot.matchedPumps[0]
  if (!first) return '无匹配泵型'
  return first.pumpName + (first.isExpired ? ' (过期)' : '')
}

export default function SchemeCompare() {
  const schemes = usePumpStore((s) => s.schemes)
  const currentSnapshot = usePumpStore((s) => s.currentSnapshot)

  const saveAsScheme = usePumpStore((s) => s.saveAsScheme)
  const removeScheme = usePumpStore((s) => s.removeScheme)

  const [label, setLabel] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function handleSave() {
    const trimmed = label.trim()
    if (!trimmed || !currentSnapshot) return
    saveAsScheme(trimmed)
    setLabel('')
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  function handleDelete(id: string) {
    removeScheme(id)
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  const selectedSchemes = selectedIds
    .map((id) => schemes.find((s) => s.id === id))
    .filter(Boolean) as typeof schemes

  const canCompare = selectedSchemes.length === 2

  function isDiff(key: MetricKey): boolean {
    if (!canCompare) return false
    const [a, b] = selectedSchemes
    return a.snapshot[key] !== b.snapshot[key]
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="方案名称"
          disabled={!currentSnapshot}
          className="flex-1 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-navy-50 placeholder:text-navy-400 focus:border-amber focus:outline-none disabled:opacity-40"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!currentSnapshot || !label.trim()}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          保存方案
        </button>
      </div>

      {schemes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <GitCompare className="h-10 w-10 text-navy-400/40" />
          <p className="text-sm text-navy-200/60">暂无已保存方案</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {schemes.map((scheme) => {
          const isSelected = selectedIds.includes(scheme.id)
          const snap = scheme.snapshot
          return (
            <div
              key={scheme.id}
              className={cn(
                'card flex flex-col gap-3',
                isSelected && 'ring-1 ring-amber/60 card-glow',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelect(scheme.id)}
                    className="text-amber hover:text-amber-light"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span className="label-text text-sm font-medium text-navy-50">
                    {scheme.label}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(scheme.id)}
                  className="text-navy-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[11px] text-navy-400 font-mono">
                {new Date(snap.calculatedAt).toLocaleString('zh-CN')}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="label-text">沿程损失</span>
                  <span className="value-text ml-1.5">{snap.frictionLoss.toFixed(3)}</span>
                  <span className="value-unit ml-0.5">m</span>
                </div>
                <div>
                  <span className="label-text">局部损失</span>
                  <span className="value-text ml-1.5">{snap.localLoss.toFixed(3)}</span>
                  <span className="value-unit ml-0.5">m</span>
                </div>
                <div>
                  <span className="label-text">总损失</span>
                  <span className="value-text ml-1.5 text-amber">{snap.totalHeadLoss.toFixed(3)}</span>
                  <span className="value-unit ml-0.5">m</span>
                </div>
                <div>
                  <span className="label-text">所需扬程</span>
                  <span className="value-text ml-1.5 text-amber">{snap.requiredHead.toFixed(3)}</span>
                  <span className="value-unit ml-0.5">m</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="label-text">推荐泵型</span>
                <span className="value-text">{topPump(snap)}</span>
              </div>

              <button
                onClick={() => toggleSelect(scheme.id)}
                disabled={!isSelected && selectedIds.length >= 2}
                className={cn(
                  'btn-secondary text-xs self-end',
                  isSelected && 'btn-amber',
                  !isSelected && selectedIds.length >= 2 && 'opacity-40 cursor-not-allowed',
                )}
              >
                {isSelected ? '取消选择' : '选择对比'}
              </button>
            </div>
          )
        })}
      </div>

      {canCompare && (
        <div className="card card-glow flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-amber" />
            <span className="label-text text-sm font-medium text-amber">
              方案对比
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600">
                <th className="py-2 text-left label-text font-normal">指标</th>
                <th className="py-2 text-right label-text font-normal">
                  {selectedSchemes[0].label}
                </th>
                <th className="py-2 text-right label-text font-normal">
                  {selectedSchemes[1].label}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_KEYS.map((m) => {
                const diff = isDiff(m.key)
                return (
                  <tr
                    key={m.key}
                    className={cn(
                      'border-b border-navy-700/50',
                      diff && 'bg-amber/10',
                    )}
                  >
                    <td className="py-2 label-text">{m.label}</td>
                    <td
                      className={cn(
                        'py-2 text-right font-mono',
                        diff ? 'text-amber' : 'value-text',
                      )}
                    >
                      {formatVal(m.key, selectedSchemes[0].snapshot[m.key])}
                      {m.unit && (
                        <span className="value-unit ml-0.5">{m.unit}</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'py-2 text-right font-mono',
                        diff ? 'text-amber' : 'value-text',
                      )}
                    >
                      {formatVal(m.key, selectedSchemes[1].snapshot[m.key])}
                      {m.unit && (
                        <span className="value-unit ml-0.5">{m.unit}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr
                className={cn(
                  isDiff('requiredHead') ? 'bg-amber/10' : '',
                )}
              >
                <td className="py-2 label-text">推荐泵型</td>
                <td className={cn('py-2 text-right text-xs', isDiff('requiredHead') ? 'text-amber' : 'value-text')}>
                  {topPump(selectedSchemes[0].snapshot)}
                </td>
                <td className={cn('py-2 text-right text-xs', isDiff('requiredHead') ? 'text-amber' : 'value-text')}>
                  {topPump(selectedSchemes[1].snapshot)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
