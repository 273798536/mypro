interface VolumeAnalysisProps {
  deductions: Array<{ beat: number; category: string; description: string; points: number; affectedMusicianId?: string }>
  musicians: Array<{ id: string; name: string; color: string; volume: number }>
  snapshots: Array<{ beat: number; musicianId: string; isPlaying: boolean; volume: number }>
}

interface VolumeIssue {
  beat: number
  category: 'volume_overflow' | 'volume_imbalance'
  description: string
  points: number
  affectedMusicianId?: string
}

export default function VolumeAnalysis({ deductions, musicians, snapshots }: VolumeAnalysisProps) {
  const volumeIssues: VolumeIssue[] = deductions.filter(
    (d): d is VolumeIssue => d.category === 'volume_overflow' || d.category === 'volume_imbalance'
  )

  const overflowIssues = volumeIssues.filter((v) => v.category === 'volume_overflow')
  const imbalanceIssues = volumeIssues.filter((v) => v.category === 'volume_imbalance')

  const totalVolumeDeductions = volumeIssues.reduce((sum, v) => sum + v.points, 0)

  function getSnapshotsAtBeat(beat: number) {
    return snapshots
      .filter((s) => s.beat === beat && s.isPlaying)
      .map((s) => {
        const musician = musicians.find((m) => m.id === s.musicianId)
        return {
          musicianId: s.musicianId,
          name: musician?.name ?? s.musicianId,
          color: musician?.color ?? '#888',
          volume: s.volume,
        }
      })
      .sort((a, b) => b.volume - a.volume)
  }

  const processedBeats = new Set<number>()
  const issuePeriods: Array<{
    beats: number[]
    category: VolumeIssue['category']
    issues: VolumeIssue[]
    volumes: ReturnType<typeof getSnapshotsAtBeat>
  }> = []

  for (const issue of volumeIssues) {
    if (processedBeats.has(issue.beat)) continue
    processedBeats.add(issue.beat)

    const sameBeatIssues = volumeIssues.filter((v) => v.beat === issue.beat)
    const volumes = getSnapshotsAtBeat(issue.beat)

    issuePeriods.push({
      beats: [issue.beat],
      category: issue.category,
      issues: sameBeatIssues,
      volumes,
    })
  }

  issuePeriods.sort((a, b) => a.beats[0] - b.beats[0])

  return (
    <div className="flex flex-col gap-5">
      <div className="font-display text-lg text-white">音量反馈分析</div>

      {issuePeriods.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-8">无音量相关问题</div>
      )}

      {issuePeriods.map((period, idx) => {
        const beatLabel = period.beats.length === 1
          ? `Beat ${period.beats[0]}`
          : `Beat ${period.beats[0]}-${period.beats[period.beats.length - 1]}`

        const categoryLabel = period.category === 'volume_overflow' ? '声部盖过' : '音量失衡'
        const categoryColor = period.category === 'volume_overflow' ? '#ff4444' : '#ff6b35'

        return (
          <div
            key={idx}
            className="rounded-lg p-4"
            style={{ backgroundColor: '#1a1a2e', border: `1px solid ${categoryColor}30` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-display px-2 py-0.5 rounded"
                style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
              >
                {categoryLabel}
              </span>
              <span className="text-xs text-gray-400">{beatLabel}</span>
            </div>

            <div className="flex items-end gap-2 mb-3 h-20">
              {period.volumes.map((v) => (
                <div key={v.musicianId} className="flex flex-col items-center flex-1">
                  <span className="text-[10px] font-display mb-1" style={{ color: v.color }}>
                    {v.volume}%
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${v.volume * 0.7}px`,
                      backgroundColor: v.color,
                      opacity: 0.8,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[9px] text-gray-500 mt-1 truncate w-full text-center">
                    {v.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-300 leading-relaxed">
              {period.issues.map((issue, i) => (
                <div key={i} className="mb-1">
                  {issue.description}，扣 {issue.points} 分
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="font-display text-sm text-gray-300 mb-2">音量扣分汇总</div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>
            声部盖过: <span style={{ color: '#ff4444' }}>{overflowIssues.length} 次</span>
          </span>
          <span>
            音量失衡: <span style={{ color: '#ff6b35' }}>{imbalanceIssues.length} 次</span>
          </span>
          <span>
            总扣分: <span className="text-white font-display">{totalVolumeDeductions}</span> 分
          </span>
        </div>
        <div className="text-[10px] text-gray-500 mt-2">
          音量反馈机制会在伴奏音量盖过主旋律时自动扣分，并在声部间音量差超过20%时记录音量失衡。合理调控各声部音量是获得高分的关键。
        </div>
      </div>
    </div>
  )
}
