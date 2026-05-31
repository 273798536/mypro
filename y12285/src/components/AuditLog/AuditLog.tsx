import { useState } from 'react'
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/index'

function formatTimestamp(ts: number) {
  const d = new Date(ts)
  return d.toTimeString().split(' ')[0]
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function AuditLog() {
  const [open, setOpen] = useState(false)
  const auditLog = useStore((s) => s.auditLog)

  const handleEntryClick = (entry: { id: string; parameter: string }) => {
    console.log('审计日志条目点击:', entry.id, entry.parameter)
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/50 text-amber-400 transition-all hover:bg-amber-400/10 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]"
        title="审计日志"
      >
        {open ? <ChevronDown size={16} /> : <ScrollText size={16} />}
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 w-96 max-h-80 rounded-xl border border-white/10 bg-[#0a0e1a]/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <span className="text-sm font-medium text-amber-400">审计日志</span>
            <span className="text-xs text-white/40">{auditLog.length} 条记录</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {auditLog.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/30">暂无审计记录</div>
            ) : (
              auditLog.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleEntryClick(entry)}
                  className="px-4 py-2.5 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-white/40">{formatTimestamp(entry.timestamp)}</span>
                    <span className="text-xs font-medium text-amber-400">{entry.action}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <span>{entry.parameter}</span>
                    <span className="text-white/25">→</span>
                    <span className="text-white/30 line-through">{formatValue(entry.oldValue)}</span>
                    <span className="text-white/25">→</span>
                    <span className="text-sky-300/70">{formatValue(entry.newValue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
