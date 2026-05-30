import type { PartTrack, LevelData, ActiveJudgment } from '../types'
import { AlertTriangle } from 'lucide-react'

interface Props {
  track: PartTrack
  level: LevelData
  currentTick: number
  isDelayedEntry: boolean
  activeJudgment?: ActiveJudgment
  restViolationTicks: number[]
  volumeImbalanceTicks: number[]
  isActive: boolean
  onClick: () => void
  msPerBeat: number
}

const judgmentIcons: Record<string, string> = {
  perfect: '●',
  early: '◀',
  late: '▶',
  miss: '✕',
}

const judgmentColors: Record<string, string> = {
  perfect: 'text-perfect',
  early: 'text-early',
  late: 'text-late',
  miss: 'text-miss',
}

export default function TrackLane({
  track,
  level,
  currentTick,
  isDelayedEntry,
  activeJudgment,
  restViolationTicks,
  volumeImbalanceTicks,
  isActive,
  onClick,
  msPerBeat,
}: Props) {
  const totalBeats = level.totalBars * level.beatsPerBar
  const notesByTick = new Map(track.notes.map((n) => [n.tick, n]))

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center rounded-lg border transition-all cursor-pointer select-none
        ${isActive ? 'border-accent/50 bg-accent/5' : 'border-surfaceLight/20 bg-surface/50'}
        ${isDelayedEntry ? 'border-warning/60 animate-pulse-glow' : ''}
        hover:border-accent/30`}
    >
      <div
        className="w-24 shrink-0 px-3 py-3 flex items-center gap-2 border-r border-surfaceLight/20"
        style={{ borderLeftColor: track.color, borderLeftWidth: 3 }}
      >
        <span
          className="font-display text-lg font-700"
          style={{ color: track.color }}
        >
          {track.shortName}
        </span>
        <span className="text-xs text-gray-500 truncate">{track.name}</span>
      </div>

      {isDelayedEntry && (
        <div className="absolute left-28 top-0 bottom-0 flex items-center z-10">
          <span className="bg-warning/20 text-warning text-xs font-600 px-2 py-1 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            延迟进入
          </span>
        </div>
      )}

      {activeJudgment && activeJudgment.partTrackId === track.id && (
        <div className="absolute left-1/2 top-1 z-10">
          <span className={`text-2xl font-700 ${judgmentColors[activeJudgment.judgment]}`}>
            {judgmentIcons[activeJudgment.judgment]}
          </span>
        </div>
      )}

      <div className="flex-1 flex items-stretch py-3 px-2 overflow-x-auto">
        {Array.from({ length: totalBeats }, (_, i) => {
          const note = notesByTick.get(i)
          const beatLine = level.beatLines.find((b) => b.tick === i)
          const isCurrentBeat = currentTick === i
          const isRestBeat = beatLine?.isRest
          const isRestViolation = restViolationTicks.includes(i)
          const isVolumeImbalance = volumeImbalanceTicks.includes(i)
          const barStart = i % level.beatsPerBar === 0

          return (
            <div
              key={i}
              className={`relative flex items-center justify-center min-w-[3.5rem] h-12 mx-0.5 rounded
                ${barStart ? 'ml-2' : ''}
                ${isCurrentBeat ? 'bg-accent/15 ring-1 ring-accent/40' : 'bg-surfaceLight/10'}
                ${isRestBeat ? 'opacity-50' : ''}
                ${isRestViolation ? 'bg-rest/20 ring-1 ring-rest/50' : ''}
                ${isVolumeImbalance ? 'ring-1 ring-rest/40' : ''}
                transition-all duration-150`}
            >
              {note && (
                <div
                  className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-700"
                  style={{
                    backgroundColor: isRestViolation ? '#ffa502' : track.color,
                    opacity: note.isEntry ? 1 : 0.7,
                  }}
                >
                  {note.isEntry ? '▶' : '●'}
                </div>
              )}

              {isRestBeat && !note && (
                <span className="text-rest/40 text-lg font-300">𝄾</span>
              )}

              {isRestViolation && (
                <span className="absolute -top-1 -right-1 text-rest text-xs font-700">✕</span>
              )}

              {isVolumeImbalance && !isRestViolation && (
                <span className="absolute -top-1 -right-1 text-rest/60 text-xs">↑</span>
              )}

              {isCurrentBeat && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
              )}

              <span className="absolute -bottom-0.5 text-[9px] text-gray-600">
                {i + 1}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
