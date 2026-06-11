import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { detectMixedInput } from '@/utils/detectMixed'

export default function TraceRestore() {
  const snapshots = useStore(s => s.traceSnapshots)
  const restoreTrace = useStore(s => s.restoreTrace)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  const handleRestore = () => {
    if (input.trim()) {
      restoreTrace(input.trim())
      setInput('')
      setOpen(false)
    }
  }

  if (snapshots.length === 0 && !open) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-[#6a6a8e] hover:text-[#d4a853] transition-colors"
      >
        还原追溯 ({snapshots.length})
      </button>

      {open && (
        <div className="absolute bottom-6 left-0 w-64 bg-[#1a1a2e] border border-[#2a2a3e] rounded shadow-xl p-3 z-10">
          <p className="text-[10px] text-[#6a6a8e] mb-2">输入追溯码还原筛选状态</p>
          <div className="flex gap-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="如 TR-MXXXXXX"
              className="flex-1 px-2 py-1 text-xs bg-[#0d0d1a] border border-[#2a2a3e] rounded text-[#c8c8d8] placeholder:text-[#4a4a6e] focus:outline-none focus:border-[#d4a853]"
            />
            <button
              onClick={handleRestore}
              className="px-2 py-1 text-xs bg-[#d4a853] text-[#1a1a2e] rounded hover:bg-[#c49a48] transition-colors"
            >
              还原
            </button>
          </div>

          {snapshots.length > 0 && (
            <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
              <p className="text-[9px] text-[#5a5a7e]">历史快照:</p>
              {snapshots.map(s => (
                <button
                  key={s.id}
                  onClick={() => { restoreTrace(s.id); setOpen(false) }}
                  className="w-full text-left px-2 py-1 rounded text-[10px] text-[#8a8aae] hover:bg-[#0d0d1a] font-mono"
                >
                  {s.id} · {s.timestamp.slice(11, 19)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
