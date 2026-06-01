import { AlertTriangle, Check, ArrowRightLeft } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function ConflictPanel() {
  const unitConflicts = useBayesianStore(s => s.unitConflicts)
  const calibrationConflicts = useBayesianStore(s => s.calibrationConflicts)
  const resolveUnitConflict = useBayesianStore(s => s.resolveUnitConflict)

  const totalConflicts = unitConflicts.filter(c => !c.resolved).length + calibrationConflicts.length

  if (totalConflicts === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400/70 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
        <Check size={14} /> 无冲突
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unitConflicts.filter(c => !c.resolved).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-red-400 flex items-center gap-1 font-medium">
            <AlertTriangle size={14} /> 单位换算冲突
          </p>
          {unitConflicts.filter(c => !c.resolved).map(c => (
            <div key={c.id} className="bg-red-500/10 border border-red-500/25 rounded p-2 text-xs space-y-1">
              <div className="text-red-300 font-medium">{c.field}</div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="font-mono">{c.existingValue}</span>
                <ArrowRightLeft size={12} className="text-zinc-500" />
                <span className="font-mono">{c.incomingValue}</span>
              </div>
              <div className="text-zinc-500">来源: {c.sourceType} / {c.sourceId.slice(-8)}</div>
              <button
                onClick={() => resolveUnitConflict(c.id)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <Check size={12} /> 标记已确认（不自动修改口径）
              </button>
            </div>
          ))}
        </div>
      )}

      {calibrationConflicts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-yellow-400 flex items-center gap-1 font-medium">
            <AlertTriangle size={14} /> 口径冲突
          </p>
          {calibrationConflicts.map(c => (
            <div key={c.id} className="bg-yellow-500/10 border border-yellow-500/25 rounded p-2 text-xs space-y-1">
              <div className="text-yellow-300 font-medium">{c.field}</div>
              <div className="text-zinc-400">已有: {c.existingCalibration}</div>
              <div className="text-zinc-400">导入: {c.incomingCalibration}</div>
              <div className={cn(
                "text-xs mt-1",
                c.autoModified ? "text-red-400" : "text-emerald-400"
              )}>
                {c.autoModified ? '⚠ 系统已自动修改口径' : '✓ 系统未自动修改口径'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-zinc-500 border-t border-zinc-700/50 pt-2">
        共 {totalConflicts} 项冲突 — 系统不会替业务偷改口径，冲突需人工确认
      </div>
    </div>
  )
}
