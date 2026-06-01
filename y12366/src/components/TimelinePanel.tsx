import { useSeismicStore } from '@/store/useSeismicStore'

export default function TimelinePanel() {
  const accelerationData = useSeismicStore((s) => s.accelerationData)
  const displacementData = useSeismicStore((s) => s.displacementData)
  const damagePhotos = useSeismicStore((s) => s.damagePhotos)
  const alignmentResult = useSeismicStore((s) => s.alignmentResult)
  const playback = useSeismicStore((s) => s.playback)
  const updateAlignmentOffset = useSeismicStore((s) => s.updateAlignmentOffset)

  const { startTime, endTime, currentTime } = playback
  const duration = endTime - startTime || 1

  const accelOffset = alignmentResult?.accelOffset ?? 0
  const dispOffset = alignmentResult?.dispOffset ?? 0
  const photoOffset = alignmentResult?.photoOffset ?? 0
  const driftMs = alignmentResult?.driftMs ?? 0

  const toPercent = (ts: number) => ((ts - startTime) / duration) * 100

  const accelStart = accelerationData.length > 0 ? accelerationData[0].timestamp + accelOffset : 0
  const accelEnd = accelerationData.length > 0 ? accelerationData[accelerationData.length - 1].timestamp + accelOffset : 0
  const dispStart = displacementData.length > 0 ? displacementData[0].timestamp + dispOffset : 0
  const dispEnd = displacementData.length > 0 ? displacementData[displacementData.length - 1].timestamp + dispOffset : 0

  const photoTimestamps = damagePhotos.filter((p) => p.timestamp !== null)

  const driftMarkers: number[] = []
  if (Math.abs(driftMs) > 50) {
    const step = duration / 10
    for (let t = startTime + step; t < endTime; t += step) {
      driftMarkers.push(t)
    }
  }

  const playheadPercent = ((currentTime - startTime) / duration) * 100

  const tracks = [
    {
      label: 'Acceleration',
      color: 'bg-signal',
      barLeft: toPercent(accelStart),
      barWidth: Math.max(0, toPercent(accelEnd) - toPercent(accelStart)),
      offset: accelOffset,
      channel: 'accelOffset' as const,
    },
    {
      label: 'Displacement',
      color: 'bg-displacement',
      barLeft: toPercent(dispStart),
      barWidth: Math.max(0, toPercent(dispEnd) - toPercent(dispStart)),
      offset: dispOffset,
      channel: 'dispOffset' as const,
    },
    {
      label: 'Photos',
      color: 'bg-photo',
      barLeft: photoTimestamps.length > 0 ? toPercent(photoTimestamps[0].timestamp! + photoOffset) : 0,
      barWidth:
        photoTimestamps.length > 0
          ? Math.max(
              0,
              toPercent(photoTimestamps[photoTimestamps.length - 1].timestamp! + photoOffset) -
                toPercent(photoTimestamps[0].timestamp! + photoOffset),
            )
          : 0,
      offset: photoOffset,
      channel: 'photoOffset' as const,
    },
  ]

  return (
    <div className="rounded-lg border border-steel-700 bg-steel-900 p-4">
      <div className="relative mb-4">
        {tracks.map((track) => (
          <div key={track.label} className="flex items-center gap-3 mb-2">
            <div className="w-24 shrink-0 text-right text-xs font-medium text-steel-500 uppercase tracking-wider font-mono">
              {track.label}
            </div>
            <div className="relative h-8 flex-1 rounded bg-steel-800 overflow-hidden">
              <div
                className={`absolute top-1 bottom-1 rounded ${track.color} opacity-40`}
                style={{ left: `${Math.max(0, track.barLeft)}%`, width: `${Math.min(100, track.barWidth)}%` }}
              />
              {track.label === 'Photos' &&
                damagePhotos.map((photo) => {
                  if (photo.timestamp === null) return null
                  const pct = toPercent(photo.timestamp + photoOffset)
                  return (
                    <div key={photo.id}>
                      {photo.missingPhase ? (
                        <div
                          className="absolute top-0 bottom-0 w-px border-l border-dashed border-saturated"
                          style={{ left: `${pct}%` }}
                        />
                      ) : (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-photo"
                          style={{ left: `${pct}%` }}
                        />
                      )}
                    </div>
                  )
                })}
              {driftMarkers.map((t, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-warn opacity-60"
                  style={{ left: `${toPercent(t)}%` }}
                />
              ))}
              {playheadPercent >= 0 && playheadPercent <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-photo z-10 shadow-[0_0_6px_rgba(255,214,0,0.6)]"
                  style={{ left: `${playheadPercent}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div key={track.channel} className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-steel-500 font-mono">
              {track.label} Offset
            </label>
            <input
              type="range"
              min={-2000}
              max={2000}
              step={1}
              value={track.offset}
              onChange={(e) => updateAlignmentOffset(track.channel, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded bg-steel-700 accent-signal"
            />
            <span className="font-mono text-xs text-steel-500 text-center">
              {track.offset > 0 ? '+' : ''}
              {track.offset} ms
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
