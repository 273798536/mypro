import { useMemo, useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { detectAliasDuplicates, getDuplicateReason, getDuplicateNextStep } from '@/utils/alias'

export default function AliasDuplicateCheck() {
  const records = useStore((s) => s.records)
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  const duplicateGroups = useMemo(() => detectAliasDuplicates(records), [records])

  const toggleReviewed = (alias: string) => {
    setReviewed((prev) => {
      const next = new Set(prev)
      if (next.has(alias)) next.delete(alias)
      else next.add(alias)
      return next
    })
  }

  if (duplicateGroups.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-700 bg-green-900/20 px-4 py-3 text-sm text-green-400">
        <Check size={18} />
        没有发现别名重复
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {duplicateGroups.map((group) => {
        const isReviewed = reviewed.has(group.alias)
        return (
          <div
            key={group.alias}
            className={`rounded-lg border p-4 transition ${
              isReviewed
                ? 'border-green-700 bg-green-900/10'
                : 'border-[#3a3a55] bg-[#252540]'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f0a500]" />
                <span className="text-sm font-semibold text-[#f0a500]">
                  别名：{group.alias}
                </span>
                {isReviewed && (
                  <span className="rounded-full bg-green-800 px-2 py-0.5 text-xs text-green-300">
                    已确认
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleReviewed(group.alias)}
                className={`rounded-lg border px-3 py-1 text-xs transition ${
                  isReviewed
                    ? 'border-green-600 text-green-400 hover:bg-green-900/30'
                    : 'border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500]/10'
                }`}
              >
                {isReviewed ? '取消确认' : '确认已处理'}
              </button>
            </div>

            <div className="mb-3 space-y-1">
              {group.records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-sm text-[#b0b0b0]">
                  <span className="text-[#e8e8e8]">{r.songName}</span>
                  <span className="text-[#888]">
                    {r.timecodeStart} ~ {r.timecodeEnd}
                  </span>
                </div>
              ))}
            </div>

            <p className="mb-1 text-xs text-[#b0b0b0]">{getDuplicateReason(group)}</p>
            <p className="text-xs text-[#f0a500]/80">{getDuplicateNextStep(group)}</p>
          </div>
        )
      })}
    </div>
  )
}
