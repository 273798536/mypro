import { useMemo } from 'react'
import Hand3D from '@/components/Hand3D'
import MeasureBar from '@/components/MeasureBar'
import Timeline from '@/components/Timeline'
import ErrorPanel from '@/components/ErrorPanel'
import PracticeHistory from '@/components/PracticeHistory'
import FilterBar from '@/components/FilterBar'
import { usePlaybackStore } from '@/store/usePlaybackStore'
import { FINGER_NAMES } from '@/types'

export default function Home() {
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp)
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const practiceRecords = usePlaybackStore((s) => s.practiceRecords)
  const keypointFrames = usePlaybackStore((s) => s.keypointFrames)
  const measures = usePlaybackStore((s) => s.measures)

  const activePractice = practiceRecords.find((p) => p.id === currentPracticeId)

  const currentMeasures = useMemo(
    () => measures.filter((m) => m.practiceId === currentPracticeId),
    [measures, currentPracticeId]
  )

  const activeMeasure = currentMeasures.find(
    (m) => currentTimestamp >= m.startTimestamp && currentTimestamp < m.endTimestamp
  )

  const currentFrame = useMemo(() => {
    const frames = keypointFrames.filter((f) => f.practiceId === currentPracticeId)
    if (frames.length === 0) return undefined
    let closest = frames[0]
    let minDiff = Math.abs(frames[0].timestamp - currentTimestamp)
    for (const f of frames) {
      const diff = Math.abs(f.timestamp - currentTimestamp)
      if (diff < minDiff) {
        minDiff = diff
        closest = f
      }
    }
    return closest
  }, [keypointFrames, currentPracticeId, currentTimestamp])

  return (
    <div className="w-screen h-screen bg-[#1a1a2e] text-[#e8e8e8] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-[#2a2a4a]">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-tight">
              <span className="text-[#2ed573]">钢琴手型</span>
              <span className="text-[#8888aa] mx-1">·</span>
              <span className="text-[#ccccdd]">3D回放</span>
            </h1>
            {activePractice && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#8888aa]">
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e3a] border border-[#2a2a4a]">
                  {activePractice.studentName}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e3a] border border-[#2a2a4a]">
                  {activePractice.pieceTitle}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e3a] border border-[#2a2a4a]">
                  {activePractice.date}
                </span>
              </div>
            )}
          </div>
          {activeMeasure && (
            <div className="text-[10px] font-mono text-[#8888aa]">
              当前小节: <span className="text-[#2ed573]">第{activeMeasure.measureNumber}小节</span>
              {activeMeasure.isMisaligned && (
                <span className="ml-2 text-[#ff8c00] animate-pulse">⚠ 错位</span>
              )}
            </div>
          )}
        </div>
        <div className="px-4 pb-2">
          <FilterBar />
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
          <div className="flex-1 min-h-0">
            <Hand3D />
          </div>
          <div className="flex-shrink-0">
            <MeasureBar />
          </div>
        </div>

        <div className="w-[320px] flex-shrink-0 flex flex-col p-3 pl-0 gap-3">
          <div className="flex-1 min-h-0">
            <ErrorPanel />
          </div>
          <div className="h-[200px] flex-shrink-0">
            <PracticeHistory />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 p-3 pt-0">
        <Timeline />
        {currentFrame && currentFrame.missingIndices.length > 0 && (
          <div className="mt-2 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#ff4757] font-bold tracking-wide">
              关键点丢失
            </span>
            <span className="text-[10px] text-[#ff8a8a] font-mono">
              {currentFrame.missingIndices.map((i) => FINGER_NAMES[i]).join('、')}
            </span>
            <span className="text-[10px] text-[#ff4757]/60 font-mono ml-auto">
              来源: 关键点数据
            </span>
          </div>
        )}
      </footer>
    </div>
  )
}
