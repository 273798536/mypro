import { useRobotStore } from '@/store/useRobotStore'
import type { HistoryEntry } from '@/utils/kinematics'

const sourceLabels: Record<HistoryEntry['source'], { text: string; color: string }> = {
  manual: { text: '手动', color: 'text-cyan-400 bg-cyan-900/30' },
  load: { text: '加载', color: 'text-blue-400 bg-blue-900/30' },
  correction: { text: '修正', color: 'text-amber-400 bg-amber-900/30' },
  reset: { text: '重置', color: 'text-red-400 bg-red-900/30' },
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function HistoryPanel() {
  const history = useRobotStore(s => s.history)
  const restoreFromHistory = useRobotStore(s => s.restoreFromHistory)

  const reversed = [...history].reverse()

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-cyan-300 mb-2">操作历史</h3>
      {reversed.length === 0 && (
        <p className="text-[10px] text-slate-600">暂无历史记录</p>
      )}
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
        {reversed.map(entry => {
          const label = sourceLabels[entry.source]
          return (
            <button
              key={entry.id}
              onClick={() => restoreFromHistory(entry.id)}
              className="w-full text-left p-2 rounded border border-slate-700/30 bg-slate-800/20
                hover:bg-slate-700/30 hover:border-cyan-700/40 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${label.color}`}>
                  {label.text}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{formatTime(entry.timestamp)}</span>
              </div>
              <p className="text-[11px] text-slate-400 group-hover:text-slate-300 truncate">
                {entry.description}
              </p>
              {entry.warnings.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.warnings.slice(0, 2).map((w, i) => (
                    <span
                      key={i}
                      className={`text-[8px] px-1 py-0.5 rounded ${
                        w.severity === 'danger'
                          ? 'text-red-400 bg-red-900/30'
                          : w.severity === 'warning'
                          ? 'text-amber-400 bg-amber-900/30'
                          : 'text-yellow-400 bg-yellow-900/30'
                      }`}
                    >
                      {w.type === 'angle_limit' ? '越界' : w.type === 'singularity' ? '奇异' : w.type === 'collision' ? '碰撞' : '安全区'}
                    </span>
                  ))}
                  {entry.warnings.length > 2 && (
                    <span className="text-[8px] text-slate-600">+{entry.warnings.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
