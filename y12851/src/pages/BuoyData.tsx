import { useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { METRIC_DEFS, assessRecord } from '@/utils/calcEngine'
import FormulaPanel from '@/components/FormulaPanel'
import VerifyModal from '@/components/VerifyModal'
import RiskBadge from '@/components/RiskBadge'
import type { BuoyRecord, RiskAssessment } from '@/types'
import { Search, Edit3, AlertTriangle } from 'lucide-react'

export default function BuoyData() {
  const records = useStore((s) => s.buoyRecords)
  const [search, setSearch] = useState('')
  const [verifyTarget, setVerifyTarget] = useState<BuoyRecord | null>(null)
  const [filterAbnormal, setFilterAbnormal] = useState(false)

  const perRecordAssessments = useMemo<Map<string, RiskAssessment>>(() => {
    const m = new Map<string, RiskAssessment>()
    for (const r of records) {
      m.set(r.id, assessRecord(r))
    }
    return m
  }, [records])

  const filtered = records.filter((r) => {
    if (search && !r.stationName.includes(search) && !r.stationId.includes(search)) return false
    if (filterAbnormal) {
      const assess = perRecordAssessments.get(r.id)
      if (!assess || assess.level === 'normal') return false
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ocean-50">浮标数据</h1>
          <p className="text-sm text-ocean-400 mt-1">查看、筛选、逐条复核浮标监测数据</p>
        </div>
      </div>

      <FormulaPanel />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-500" />
          <input
            type="text"
            className="input-field w-full pl-9 text-sm"
            placeholder="搜索站点名称或编号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setFilterAbnormal(!filterAbnormal)}
          className={`btn-secondary text-sm flex items-center gap-2 ${filterAbnormal ? '!border-warn !text-warn' : ''}`}
        >
          <AlertTriangle size={14} />
          {filterAbnormal ? '仅异常' : '显示全部'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-700/50">
                <th className="text-left px-4 py-3 text-ocean-400 font-medium">站点</th>
                <th className="text-left px-4 py-3 text-ocean-400 font-medium">时间</th>
                {METRIC_DEFS.map((d) => (
                  <th key={d.key} className="text-right px-4 py-3 text-ocean-400 font-medium">
                    {d.label}
                    <span className="text-ocean-600 ml-0.5">{d.unit && `(${d.unit})`}</span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-ocean-400 font-medium">来源</th>
                <th className="text-center px-4 py-3 text-ocean-400 font-medium">风险</th>
                <th className="text-center px-4 py-3 text-ocean-400 font-medium">照片</th>
                <th className="text-center px-4 py-3 text-ocean-400 font-medium">复核</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const assess = perRecordAssessments.get(r.id)
                const isAbnormalRow = assess && assess.level !== 'normal'
                const hasFault = assess?.metrics.some((m) => m.fail)

                return (
                  <tr
                    key={r.id}
                    className={`border-b border-ocean-700/30 ${
                      hasFault
                        ? 'bg-danger/5'
                        : isAbnormalRow
                        ? 'bg-warn/5'
                        : idx % 2 === 1
                        ? 'bg-ocean-900/40'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-ocean-200">{r.stationName}</div>
                      <div className="text-xs text-ocean-500">{r.stationId}</div>
                    </td>
                    <td className="px-4 py-3 text-ocean-300 font-mono text-xs">
                      {new Date(r.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {METRIC_DEFS.map((d) => {
                      const val = r[d.key as keyof BuoyRecord] as number | null
                      const metric = assess?.metrics.find((m) => m.key === d.key)
                      const isFault = metric?.fail
                      const isAbn = metric?.isAbnormal

                      return (
                        <td
                          key={d.key}
                          className={`px-4 py-3 text-right font-mono ${
                            isFault
                              ? 'text-danger font-semibold'
                              : isAbn
                              ? 'text-warn'
                              : 'text-ocean-200'
                          }`}
                        >
                          {val !== null ? String(val) : '—'}
                          {isFault && <span className="text-xs ml-1">⚠</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-ocean-400 text-xs">{r.source}</td>
                    <td className="px-4 py-3 text-center">
                      {assess ? <RiskBadge level={assess.adjustedLevel} /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.hasPhoto ? (
                        <span className="text-xs text-teal">已关联</span>
                      ) : (
                        <span className="text-xs text-watch-dark">缺失</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.verified ? (
                        <span className="text-xs text-teal">已复核</span>
                      ) : (
                        <button
                          onClick={() => setVerifyTarget(r)}
                          className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal-light transition-colors"
                        >
                          <Edit3 size={12} />
                          复核
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-ocean-500 text-sm">无匹配数据</div>
        )}
      </div>

      {verifyTarget && (
        <VerifyModal record={verifyTarget} onClose={() => setVerifyTarget(null)} />
      )}
    </div>
  )
}
