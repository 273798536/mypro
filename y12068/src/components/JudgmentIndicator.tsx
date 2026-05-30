import type { ActiveJudgment, PartTrack } from '../types'

interface Props {
  judgments: ActiveJudgment[]
  tracks: PartTrack[]
}

const judgmentLabel: Record<string, string> = {
  perfect: '精准',
  early: '偏早',
  late: '偏晚',
  miss: '遗漏',
}

const judgmentBg: Record<string, string> = {
  perfect: 'bg-perfect/20 text-perfect border-perfect/30',
  early: 'bg-early/20 text-early border-early/30',
  late: 'bg-late/20 text-late border-late/30',
  miss: 'bg-miss/20 text-miss border-miss/30',
}

export default function JudgmentIndicator({ judgments, tracks }: Props) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-gray-500 font-500">实时判定</span>
      <div className="flex items-center gap-2">
        {tracks.map((track) => {
          const j = judgments.find((aj) => aj.partTrackId === track.id)
          if (!j) {
            return (
              <div
                key={track.id}
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: track.color, opacity: 0.3 }}
                />
                <span>{track.shortName}</span>
                <span className="text-gray-700">-</span>
              </div>
            )
          }

          return (
            <div
              key={track.id}
              className={`flex items-center gap-1.5 text-xs font-600 px-2 py-1 rounded border animate-slide-in ${judgmentBg[j.judgment]}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span>{track.shortName}</span>
              <span>{judgmentLabel[j.judgment]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
