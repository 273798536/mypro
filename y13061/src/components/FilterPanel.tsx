import { Filter, X, AlertCircle, Droplets, Waves, Database } from 'lucide-react'
import type { AbnormalType } from '@/data/mockData'
import { ABNORMAL_LABELS, monitoringWells } from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'

import type { LucideIcon } from 'lucide-react'

const ABN_ICONS: Record<AbnormalType, LucideIcon> = {
  water_level: Waves,
  water_quality: Droplets,
  missing_data: Database,
}

export default function FilterPanel() {
  const abnormalFilter = useAppStore((s) => s.abnormalFilter)
  const wellFilter = useAppStore((s) => s.selectedWellIdsForFilter)
  const toggleAbnormal = useAppStore((s) => s.toggleAbnormal)
  const toggleWellFilter = useAppStore((s) => s.toggleWellFilter)
  const clearFilters = useAppStore((s) => s.clearFilters)
  const hasActive = abnormalFilter.length > 0 || wellFilter.length > 0

  return (
    <div className="glass rounded-xl p-4 w-full flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-340px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-tealx" />
          <span className="font-display text-sm text-slate-100">筛选条件</span>
        </div>
        {hasActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-amberx transition"
          >
            <X size={12} />
            清空
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle size={12} className="text-redx" />
          <span className="text-xs font-mono text-slate-400">异常类型</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ABNORMAL_LABELS) as AbnormalType[]).map((type) => {
            const Icon = ABN_ICONS[type]
            const active = abnormalFilter.includes(type)
            return (
              <button
                key={type}
                onClick={() => toggleAbnormal(type)}
                className={`chip ${active ? 'chip-danger' : 'chip-default'}`}
              >
                <Icon size={12} />
                {ABNORMAL_LABELS[type]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-mono text-slate-400">监测井对象</span>
          <span className="text-[10px] text-slate-500 font-mono">
            {wellFilter.length > 0 ? `已选 ${wellFilter.length}` : '不选=全部'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {monitoringWells.map((w) => {
            const active = wellFilter.includes(w.id)
            return (
              <button
                key={w.id}
                onClick={() => toggleWellFilter(w.id)}
                className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-mono border transition ${
                  active
                    ? 'bg-tealx/15 border-tealx/40 text-tealx'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{w.name}</span>
                  {w.baseStatus === 'abnormal' && (
                    <span className="label-tag bg-redx/20 text-redx border border-redx/30">
                      异常
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-60 mt-0.5 truncate">
                  {w.sourcePhoto}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
