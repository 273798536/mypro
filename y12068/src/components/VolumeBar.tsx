import type { PartTrack, JudgmentResult } from '../types'

interface Props {
  tracks: PartTrack[]
  currentTick: number
  judgments: JudgmentResult[]
  msPerBeat: number
}

export default function VolumeBar({ tracks, currentTick, judgments }: Props) {
  const trackVolumes = tracks.map((track) => {
    const trackJudgments = judgments.filter((j) => j.partTrackId === track.id)
    const recentJudgments = trackJudgments.slice(-4)
    const avgVolume = recentJudgments.length > 0
      ? recentJudgments.reduce((sum, j) => sum + j.volume, 0) / recentJudgments.length
      : 0

    return {
      track,
      volume: avgVolume,
      judgments: trackJudgments,
    }
  })

  const allVolumes = trackVolumes.map((tv) => tv.volume).filter((v) => v > 0)
  const avgAll = allVolumes.length > 0
    ? allVolumes.reduce((s, v) => s + v, 0) / allVolumes.length
    : 0

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 font-500">音量反馈</span>
        {currentTick >= 0 && (
          <span className="text-xs text-accent/60">当前拍: {currentTick + 1}</span>
        )}
      </div>
      <div className="flex items-end gap-4">
        {trackVolumes.map(({ track, volume }) => {
          const isImbalanced = avgAll > 0 && Math.abs(volume - avgAll) > 40
          const height = Math.max(4, (volume / 100) * 40)

          return (
            <div key={track.id} className="flex items-end gap-1.5">
              <span
                className="text-xs font-600 w-5 text-right"
                style={{ color: track.color }}
              >
                {track.shortName}
              </span>
              <div
                className={`w-20 rounded-t transition-all duration-200 ${
                  isImbalanced ? 'bg-rest/60' : ''
                }`}
                style={{
                  height: `${height}px`,
                  backgroundColor: isImbalanced ? undefined : track.color,
                  opacity: volume > 0 ? 0.7 : 0.2,
                }}
              />
              <span className={`text-xs ${isImbalanced ? 'text-rest' : 'text-gray-500'}`}>
                {volume > 0 ? Math.round(volume) : '-'}
              </span>
              {isImbalanced && (
                <span className="text-[9px] text-rest/80">失衡</span>
              )}
            </div>
          )
        })}

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
          <span>均值: {avgAll > 0 ? Math.round(avgAll) : '-'}</span>
          <span>·</span>
          <span>失衡阈值: &gt;40%</span>
        </div>
      </div>
    </div>
  )
}
