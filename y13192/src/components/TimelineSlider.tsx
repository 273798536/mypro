import { Play, Pause } from 'lucide-react'
import { useStore } from '@/store/useStore'

const timestampLabels = ['T1', 'T2', 'T3', 'T4', 'T5'] as const

export default function TimelineSlider() {
  const { currentTimestamp, timestamps, isPlaying, setCurrentTimestamp, togglePlay } = useStore()

  const min = timestamps[0]
  const max = timestamps[timestamps.length - 1]
  const pct = ((currentTimestamp - min) / (max - min)) * 100

  const labelIdx = timestamps.indexOf(currentTimestamp)
  const currentLabel = labelIdx >= 0 ? timestampLabels[labelIdx] : ''

  return (
    <div className="flex items-center gap-4 rounded-xl px-6 py-4" style={{ background: '#1a1a2e' }}>
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 transition-colors hover:bg-amber-500/30"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {currentLabel} — {currentTimestamp}
          </span>
        </div>

        <div className="relative h-2 w-full rounded-full bg-gray-700">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-amber-500"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={(max - min) / (timestamps.length - 1)}
            value={currentTimestamp}
            onChange={(e) => setCurrentTimestamp(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {timestamps.map((t, i) => {
            const tickPct = ((t - min) / (max - min)) * 100
            const isActive = t === currentTimestamp
            return (
              <div key={t} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${tickPct}%` }}>
                <div
                  className={`h-3 w-0.5 -translate-x-1/2 ${isActive ? 'bg-amber-400' : 'bg-gray-500'}`}
                />
                <span
                  className={`mt-1 block -translate-x-1/2 text-[10px] ${isActive ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}
                >
                  {timestampLabels[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
