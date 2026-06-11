import { useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, AlertTriangle } from 'lucide-react'
import { timePoints } from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'

export default function Timeline() {
  const currentId = useAppStore((s) => s.currentTimePointId)
  const setCurrent = useAppStore((s) => s.setCurrentTimePoint)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const nextTP = useAppStore((s) => s.nextTimePoint)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        nextTP()
      }, 1600)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPlaying, nextTP])

  const currentIdx = timePoints.findIndex((t) => t.id === currentId)

  return (
    <div className="glass rounded-xl px-4 py-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="label-tag bg-tealx/15 text-tealx border border-tealx/30">
            时序轴
          </span>
          <span className="font-display text-sm text-slate-200">
            地下水监测井时序回放
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const idx = (currentIdx - 1 + timePoints.length) % timePoints.length
              setCurrent(timePoints[idx].id)
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
            title="上一时段"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={() => setPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg border transition ${
              isPlaying
                ? 'bg-amberx/20 border-amberx/50 text-amberx shadow-glow-amber'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/5'
            }`}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={nextTP}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
            title="下一时段"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-tealx/30 via-white/10 to-tealx/30" />
        <div className="relative flex items-center justify-between">
          {timePoints.map((tp, idx) => {
            const isActive = tp.id === currentId
            const gapMissing =
              idx > 0 &&
              (timePoints[idx - 1].missing || tp.missing)
            return (
              <div key={tp.id} className="relative flex-1 flex flex-col items-center">
                {idx > 0 && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 right-1/2 w-full h-[2px] ${
                      gapMissing
                        ? 'border-t-2 border-dashed border-redx/50'
                        : 'bg-white/10'
                    }`}
                    style={{ width: '100%', transform: 'translate(50%, -50%)' }}
                  />
                )}
                <button
                  onClick={() => {
                    setPlaying(false)
                    setCurrent(tp.id)
                  }}
                  className={`relative z-10 w-5 h-5 rounded-full border-2 transition-all ${
                    isActive
                      ? 'bg-amberx border-amberx scale-125 shadow-glow-amber'
                      : tp.missing
                      ? 'bg-ink-800 border-redx/70'
                      : 'bg-ink-700 border-white/25 hover:border-tealx/60'
                  }`}
                  title={tp.label + (tp.missing ? ' · ' + (tp.missingReason ?? '缺段') : '')}
                >
                  {tp.missing && (
                    <AlertTriangle
                      size={10}
                      className="absolute -top-3 -right-3 text-redx"
                    />
                  )}
                </button>
                <div
                  className={`mt-2 text-[10px] font-mono whitespace-nowrap ${
                    isActive ? 'text-amberx' : tp.missing ? 'text-redx/80' : 'text-slate-400'
                  }`}
                >
                  {tp.label}
                </div>
                {tp.missing && (
                  <div className="mt-0.5 text-[9px] font-mono text-redx/70 whitespace-nowrap">
                    {tp.missingReason}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
