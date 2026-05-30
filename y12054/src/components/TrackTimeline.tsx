interface TrackTimelineProps {
  snapshots: Array<{ beat: number; musicianId: string; isPlaying: boolean; volume: number }>
  musicians: Array<{ id: string; name: string; color: string; role: string }>
  totalBeats: number
}

interface Segment {
  startBeat: number
  endBeat: number
  isPlaying: boolean
  volume: number
}

function buildSegments(snapshots: Array<{ beat: number; isPlaying: boolean; volume: number }>): Segment[] {
  if (snapshots.length === 0) return []
  const sorted = [...snapshots].sort((a, b) => a.beat - b.beat)
  const segments: Segment[] = []
  let current: Segment = {
    startBeat: sorted[0].beat,
    endBeat: sorted[0].beat,
    isPlaying: sorted[0].isPlaying,
    volume: sorted[0].volume,
  }

  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i]
    if (s.isPlaying === current.isPlaying && s.beat === current.endBeat + 1) {
      current.endBeat = s.beat
      current.volume = Math.round((current.volume + s.volume) / 2)
    } else {
      segments.push(current)
      current = { startBeat: s.beat, endBeat: s.beat, isPlaying: s.isPlaying, volume: s.volume }
    }
  }
  segments.push(current)
  return segments
}

export default function TrackTimeline({ snapshots, musicians, totalBeats }: TrackTimelineProps) {
  const beatAxisNumbers = []
  for (let b = 1; b <= totalBeats; b += 4) {
    beatAxisNumbers.push(b)
  }

  return (
    <div className="flex flex-col gap-3">
      {musicians.map((musician) => {
        const musicianSnaps = snapshots
          .filter((s) => s.musicianId === musician.id)
          .sort((a, b) => a.beat - b.beat)
        const segments = buildSegments(musicianSnaps)

        return (
          <div key={musician.id} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right">
              <span className="font-display text-xs" style={{ color: musician.color }}>
                {musician.name}
              </span>
            </div>
            <div className="relative h-8 flex-1 rounded bg-[#2a2a3e] overflow-hidden">
              {segments.map((seg, i) => {
                const left = ((seg.startBeat - 1) / totalBeats) * 100
                const width = ((seg.endBeat - seg.startBeat + 1) / totalBeats) * 100
                const opacity = seg.isPlaying ? 0.3 + (seg.volume / 100) * 0.7 : 0
                const showLabel = seg.endBeat - seg.startBeat + 1 >= 3 && seg.isPlaying

                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center justify-center"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: seg.isPlaying ? musician.color : 'transparent',
                      opacity: seg.isPlaying ? 1 : 1,
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded"
                      style={{ backgroundColor: musician.color, opacity }}
                    />
                    {showLabel && (
                      <span className="relative text-[10px] text-white font-display z-10 drop-shadow-sm">
                        {Math.round(seg.volume)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0" />
        <div className="flex-1 relative h-5">
          {beatAxisNumbers.map((b) => {
            const left = ((b - 1) / totalBeats) * 100
            return (
              <span
                key={b}
                className="absolute text-[10px] text-gray-500 font-display"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                {b}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
