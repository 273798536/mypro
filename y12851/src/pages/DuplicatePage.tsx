import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { getRiskLevelLabel, METRIC_DEFS } from '@/utils/calcEngine'
import RiskBadge from '@/components/RiskBadge'
import type { DuplicateGroup, DuplicateType } from '@/types'
import { Copy, CheckCircle, GitMerge, ArrowRightLeft, AlertTriangle } from 'lucide-react'

const TYPE_LABELS: Record<DuplicateType, { label: string; desc: string; icon: typeof Copy }> = {
  same_value: {
    label: '完全重复',
    desc: '同站点、同时间戳、所有指标值完全一致 → 自动去重，保留最新记录',
    icon: Copy,
  },
  diff_value: {
    label: '数值冲突',
    desc: '同站点、同时间戳、指标值不同 → 需科研助理确认保留哪条',
    icon: ArrowRightLeft,
  },
  cross_station: {
    label: '疑似串站',
    desc: '不同站点、同时间戳、数据高度相似 → 需确认站点归属',
    icon: GitMerge,
  },
}

export default function DuplicatePage() {
  const groups = useStore((s) => s.duplicateGroups)
  const records = useStore((s) => s.buoyRecords)
  const resolveDuplicate = useStore((s) => s.resolveDuplicate)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const unresolved = groups.filter((g) => !g.resolved)
  const resolved = groups.filter((g) => g.resolved)

  const getRecord = (id: string) => records.find((r) => r.id === id)

  const handleResolve = (group: DuplicateGroup, action: string, keepId?: string) => {
    resolveDuplicate(group.id, action, keepId)
    setExpandedGroup(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ocean-50">重复上报</h1>
        <p className="text-sm text-ocean-400 mt-1">自动检测重复上报，三种典型场景及处理结果</p>
      </div>

      {unresolved.length === 0 && resolved.length === 0 && (
        <div className="card p-8 text-center text-ocean-500 text-sm">
          未检测到重复上报。加载数据后将自动检测。
        </div>
      )}

      {unresolved.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-warn flex items-center gap-2">
            <AlertTriangle size={16} />
            待处理 ({unresolved.length})
          </h3>
          {unresolved.map((group) => {
            const typeInfo = TYPE_LABELS[group.type]
            const Icon = typeInfo.icon
            const isExpanded = expandedGroup === group.id
            const groupRecords = group.recordIds.map(getRecord).filter(Boolean)

            return (
              <div key={group.id} className="card overflow-hidden">
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-ocean-800/30 transition-colors"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      group.type === 'same_value' ? 'bg-teal/20' :
                      group.type === 'diff_value' ? 'bg-warn/20' : 'bg-danger/20'
                    }`}>
                      <Icon size={16} className={
                        group.type === 'same_value' ? 'text-teal' :
                        group.type === 'diff_value' ? 'text-warn' : 'text-danger'
                      } />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ocean-200">{typeInfo.label}</span>
                        <span className="badge bg-ocean-800 text-ocean-400 border border-ocean-600">
                          {group.recordIds.length} 条记录
                        </span>
                      </div>
                      <p className="text-xs text-ocean-400 mt-0.5">{group.description}</p>
                    </div>
                    <span className="badge bg-warn/20 text-warn">待处理</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-ocean-700/50 px-5 py-4 space-y-4">
                    <p className="text-xs text-ocean-400 bg-ocean-950 rounded p-3">
                      {typeInfo.desc}
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-ocean-700/50">
                            <th className="text-left px-3 py-2 text-ocean-400">记录ID</th>
                            <th className="text-left px-3 py-2 text-ocean-400">来源</th>
                            {METRIC_DEFS.map((d) => (
                              <th key={d.key} className="text-right px-3 py-2 text-ocean-400">
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupRecords.map((r, i) => (
                            <tr key={r!.id} className={i % 2 === 1 ? 'bg-ocean-900/40' : ''}>
                              <td className="px-3 py-2 font-mono text-ocean-300">{r!.id}</td>
                              <td className="px-3 py-2 text-ocean-400">{r!.source}</td>
                              {METRIC_DEFS.map((d) => {
                                const val = r![d.key as keyof typeof r]
                                return (
                                  <td key={d.key} className="px-3 py-2 text-right font-mono text-ocean-200">
                                    {val !== null ? String(val) : '—'}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-xs text-ocean-400">处理方式：</span>
                      {group.type === 'same_value' && (
                        <button
                          onClick={() => handleResolve(group, 'keep_first')}
                          className="btn-primary text-xs"
                        >
                          <CheckCircle size={14} className="inline mr-1" />
                          保留第一条，自动去重
                        </button>
                      )}
                      {group.type === 'diff_value' && (
                        <>
                          <button
                            onClick={() => handleResolve(group, 'keep_first', group.recordIds[0])}
                            className="btn-primary text-xs"
                          >
                            保留 {group.recordIds[0]}
                          </button>
                          <button
                            onClick={() => handleResolve(group, 'keep_second', group.recordIds[1])}
                            className="btn-secondary text-xs"
                          >
                            保留 {group.recordIds[1]}
                          </button>
                        </>
                      )}
                      {group.type === 'cross_station' && (
                        <>
                          {group.recordIds.map((rid) => {
                            const r = getRecord(rid)
                            return (
                              <button
                                key={rid}
                                onClick={() => handleResolve(group, 'keep_specified', rid)}
                                className="btn-secondary text-xs"
                              >
                                确认 {r?.stationName ?? rid} 正确
                              </button>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-teal flex items-center gap-2">
            <CheckCircle size={16} />
            已处理 ({resolved.length})
          </h3>
          {resolved.map((group) => {
            const typeInfo = TYPE_LABELS[group.type]
            const Icon = typeInfo.icon
            return (
              <div key={group.id} className="card px-5 py-3 opacity-60">
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-teal" />
                  <span className="text-sm text-ocean-300">{typeInfo.label}</span>
                  <span className="text-xs text-ocean-500">{group.description}</span>
                  <span className="ml-auto badge bg-teal/20 text-teal">已处理</span>
                  <span className="text-xs text-ocean-500">操作: {group.resolvedAction}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
