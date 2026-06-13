import { useReplayStore } from '@/store/replayStore'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

export default function NoiseBanner() {
  const { noiseFlags, setNoiseFlag } = useReplayStore()
  const [expanded, setExpanded] = useState(true)

  const activeNoises = noiseFlags.filter((nf) => nf.isNoise)
  const suspectedNoises = noiseFlags.filter((nf) => !nf.isNoise)

  if (noiseFlags.length === 0) return null

  function formatTime(ts: string): string {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">
            检测到 {noiseFlags.length} 条疑似噪声数据
          </span>
        </div>
        <span className="text-amber-400/60 text-xs">{expanded ? '收起' : '展开'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-amber-500/20 pt-2">
          {noiseFlags.map((nf) => (
            <div
              key={nf.id}
              className="bg-slate-800/60 rounded-sm p-3 border border-slate-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs text-amber-300 font-medium mb-1">
                    {formatTime(nf.timestamp)} · {nf.parameterName === 'waveHeight' ? '波高' : nf.parameterName}
                    · {nf.value}m
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    判定依据：超出 {nf.threshold}
                  </div>
                  <div className="text-xs text-sky-300 bg-sky-500/10 rounded-sm px-2 py-1.5 border border-sky-500/20">
                    <span className="font-medium">建议操作：</span>
                    {nf.suggestedAction}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setNoiseFlag(nf.parameterId, true)}
                    className={`text-xs px-2 py-1 rounded-sm flex items-center gap-1 transition-colors ${
                      nf.isNoise
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    标记为噪声
                  </button>
                  <button
                    onClick={() => setNoiseFlag(nf.parameterId, false)}
                    className={`text-xs px-2 py-1 rounded-sm flex items-center gap-1 transition-colors ${
                      !nf.isNoise
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                    确认为有效
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
