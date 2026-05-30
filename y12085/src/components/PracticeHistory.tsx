import { useMemo } from 'react'
import { usePlaybackStore } from '@/store/usePlaybackStore'
import { Clock, Music } from 'lucide-react'

export default function PracticeHistory() {
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const setCurrentPractice = usePlaybackStore((s) => s.setCurrentPractice)
  const filterConditions = usePlaybackStore((s) => s.filterConditions)
  const practiceRecords = usePlaybackStore((s) => s.practiceRecords)
  const errorLabels = usePlaybackStore((s) => s.errorLabels)

  const filteredPractices = useMemo(
    () => practiceRecords.filter((p) => {
      if (filterConditions.studentName && p.studentName !== filterConditions.studentName) return false
      if (filterConditions.pieceTitle && p.pieceTitle !== filterConditions.pieceTitle) return false
      return true
    }),
    [practiceRecords, filterConditions.studentName, filterConditions.pieceTitle]
  )

  return (
    <div className="w-full bg-[#12122a] rounded-lg border border-[#2a2a4a] flex flex-col overflow-hidden">
      <div className="p-2.5 border-b border-[#2a2a4a] flex-shrink-0">
        <span className="text-[10px] text-[#8888aa] font-mono uppercase tracking-widest">练习历史</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredPractices.map((p) => {
          const isSelected = currentPracticeId === p.id
          const errorCount = errorLabels.filter((e) => e.practiceId === p.id).length
          const criticalCount = errorLabels.filter(
            (e) => e.practiceId === p.id && e.severity === 'critical'
          ).length

          return (
            <button
              key={p.id}
              onClick={() => setCurrentPractice(p.id)}
              className={`w-full text-left rounded border p-2 transition-all duration-150 hover:brightness-110 ${
                isSelected
                  ? 'bg-[#2ed573]/10 border-[#2ed573]/40'
                  : 'bg-[#0d0d1a]/50 border-[#2a2a4a] hover:border-[#3a3a5a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${isSelected ? 'text-[#2ed573]' : 'text-[#ccccdd]'}`}>
                  {p.studentName}
                </span>
                <span className="text-[9px] text-[#6666aa] font-mono">{p.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Music className="w-2.5 h-2.5 text-[#6666aa]" />
                  <span className="text-[10px] text-[#8888aa] truncate max-w-[120px]">{p.pieceTitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-[#6666aa]" />
                  <span className="text-[10px] text-[#6666aa] font-mono">{p.duration}s</span>
                </div>
                {errorCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/20">
                    {criticalCount > 0 && `${criticalCount}严重 `}{errorCount}错误
                  </span>
                )}
                {errorCount === 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#2ed573]/15 text-[#2ed573]">
                    无错误
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
