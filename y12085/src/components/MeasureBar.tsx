import { useMemo } from 'react'
import { usePlaybackStore } from '@/store/usePlaybackStore'
import { AlertTriangle } from 'lucide-react'

export default function MeasureBar() {
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp)
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const measures = usePlaybackStore((s) => s.measures)
  const setCurrentTimestamp = usePlaybackStore((s) => s.setCurrentTimestamp)

  const currentMeasures = useMemo(
    () => measures.filter((m) => m.practiceId === currentPracticeId),
    [measures, currentPracticeId]
  )

  const activeMeasure = currentMeasures.find(
    (m) => currentTimestamp >= m.startTimestamp && currentTimestamp < m.endTimestamp
  )

  return (
    <div className="w-full bg-[#12122a] rounded-lg p-2 border border-[#2a2a4a]">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[10px] text-[#8888aa] font-mono uppercase tracking-widest">乐谱小节</span>
        {activeMeasure && (
          <span className="text-[10px] text-[#2ed573] font-mono ml-auto">
            第{activeMeasure.measureNumber}小节
          </span>
        )}
      </div>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {currentMeasures.map((m) => {
          const isActive = activeMeasure?.measureNumber === m.measureNumber
          const isMisaligned = m.isMisaligned

          let bg = 'bg-[#1e1e3a]'
          let borderColor = 'border-[#2a2a4a]'
          let textColor = 'text-[#8888aa]'
          let extra = ''

          if (isActive && !isMisaligned) {
            bg = 'bg-[#2ed573]/20'
            borderColor = 'border-[#2ed573]/50'
            textColor = 'text-[#2ed573]'
          } else if (isMisaligned && isActive) {
            bg = 'bg-[#ff8c00]/20'
            borderColor = 'border-[#ff8c00]/60'
            textColor = 'text-[#ff8c00]'
            extra = 'animate-pulse'
          } else if (isMisaligned) {
            bg = 'bg-[#ff8c00]/10'
            borderColor = 'border-[#ff8c00]/30 border-dashed'
            textColor = 'text-[#ff8c00]/80'
          }

          return (
            <button
              key={m.id}
              onClick={() => setCurrentTimestamp(m.startTimestamp)}
              className={`
                flex-shrink-0 w-10 h-8 rounded border flex items-center justify-center
                font-mono text-[11px] transition-all duration-150 hover:brightness-125
                relative ${bg} ${borderColor} ${textColor} ${extra}
              `}
            >
              {m.measureNumber}
              {isMisaligned && (
                <AlertTriangle className="absolute -top-1 -right-1 w-2.5 h-2.5 text-[#ff8c00]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
