import { useEffect, useRef, useMemo } from 'react'
import { usePlaybackStore } from '@/store/usePlaybackStore'
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react'
import type { ErrorLabel } from '@/types'

function ErrorCard({ error, isActive, onClick }: {
  error: ErrorLabel
  isActive: boolean
  onClick: () => void
}) {
  const isKeypointLoss = error.type === 'KEYPOINT_LOSS'
  const borderColor = isKeypointLoss ? 'border-[#ff4757]/50' : 'border-[#ff8c00]/50'
  const bgColor = isActive
    ? isKeypointLoss ? 'bg-[#ff4757]/10' : 'bg-[#ff8c00]/10'
    : 'bg-[#0d0d1a]/50'
  const iconColor = isKeypointLoss ? 'text-[#ff4757]' : 'text-[#ff8c00]'
  const sourceBg = isKeypointLoss ? 'bg-[#ff4757]/20 text-[#ff4757]' : 'bg-[#ff8c00]/20 text-[#ff8c00]'
  const severityBadge = error.severity === 'critical'
    ? 'bg-[#ff4757]/15 text-[#ff4757] border-[#ff4757]/30'
    : 'bg-[#ff8c00]/15 text-[#ff8c00] border-[#ff8c00]/30'

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded border ${borderColor} ${bgColor} p-2.5 transition-all duration-150 hover:brightness-110 group`}
    >
      <div className="flex items-start gap-2">
        {isKeypointLoss ? (
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor} ${isActive ? 'animate-pulse' : ''}`} />
        ) : (
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor} ${isActive ? 'animate-pulse' : ''}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${sourceBg}`}>
              {error.sourceMaterial}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${severityBadge}`}>
              {error.severity === 'critical' ? '严重' : '警告'}
            </span>
            <span className="text-[10px] text-[#6666aa] font-mono ml-auto flex-shrink-0">
              {formatTime(error.timestamp)}
            </span>
          </div>
          <p className="text-[11px] text-[#ccccdd] leading-relaxed break-words">
            {error.description}
          </p>
        </div>
        <ChevronRight className="w-3 h-3 text-[#6666aa] flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

export default function ErrorPanel() {
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp)
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const filterConditions = usePlaybackStore((s) => s.filterConditions)
  const errorLabels = usePlaybackStore((s) => s.errorLabels)
  const setCurrentTimestamp = usePlaybackStore((s) => s.setCurrentTimestamp)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredErrors = useMemo(() => {
    return errorLabels
      .filter((e) => {
        if (e.practiceId !== currentPracticeId) return false
        if (filterConditions.errorTypes.length > 0 && !filterConditions.errorTypes.includes(e.type as 'KEYPOINT_LOSS' | 'MEASURE_MISALIGN')) return false
        return true
      })
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [errorLabels, currentPracticeId, filterConditions.errorTypes])

  useEffect(() => {
    if (!containerRef.current || filteredErrors.length === 0) return
    const nearestError = filteredErrors.reduce((prev, curr) =>
      Math.abs(curr.timestamp - currentTimestamp) < Math.abs(prev.timestamp - currentTimestamp) ? curr : prev
    )
    const el = containerRef.current.querySelector(`[data-error-id="${nearestError.id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentTimestamp, filteredErrors])

  const keypointLossCount = filteredErrors.filter((e) => e.type === 'KEYPOINT_LOSS').length
  const measureMisalignCount = filteredErrors.filter((e) => e.type === 'MEASURE_MISALIGN').length

  return (
    <div className="w-full h-full bg-[#12122a] rounded-lg border border-[#2a2a4a] flex flex-col overflow-hidden">
      <div className="p-2.5 border-b border-[#2a2a4a] flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#8888aa] font-mono uppercase tracking-widest">错误诊断</span>
        </div>
        <div className="flex gap-2">
          {keypointLossCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30">
              关键点丢失 ×{keypointLossCount}
            </span>
          )}
          {measureMisalignCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff8c00]/15 text-[#ff8c00] border border-[#ff8c00]/30">
              小节错位 ×{measureMisalignCount}
            </span>
          )}
          {filteredErrors.length === 0 && (
            <span className="text-[10px] text-[#2ed573] font-mono">当前筛选无错误</span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredErrors.map((err) => {
          const isActive = Math.abs(err.timestamp - currentTimestamp) < 2
          return (
            <div key={err.id} data-error-id={err.id}>
              <ErrorCard
                error={err}
                isActive={isActive}
                onClick={() => setCurrentTimestamp(err.timestamp)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
