import { useEnvelopeStore } from "@/store"
import { PARAM_LIMITS, DEFAULT_ENVELOPE } from "@/types"
import type { EnvelopeParams } from "@/types"
import { cn } from "@/lib/utils"
import { Save, RotateCcw, AlertTriangle } from "lucide-react"

const ENVELOPE_KEYS: (keyof EnvelopeParams)[] = ["attack", "decay", "sustain", "release"]

function isOutOfBounds(key: keyof EnvelopeParams, value: number) {
  const limit = PARAM_LIMITS[key]
  return value < limit.min || value > limit.max
}

export default function EnvelopeControls() {
  const editingEnvelope = useEnvelopeStore((s) => s.editingEnvelope)
  const updateEnvelope = useEnvelopeStore((s) => s.updateEnvelope)
  const commitVersion = useEnvelopeStore((s) => s.commitVersion)
  const getPendingAnomalies = useEnvelopeStore((s) => s.getPendingAnomalies)
  const pendingCount = useEnvelopeStore((s) => s.anomalies.filter((a) => a.status === "pending").length)

  const handleReset = () => {
    ;(Object.keys(DEFAULT_ENVELOPE) as (keyof EnvelopeParams)[]).forEach((key) => {
      updateEnvelope(key, DEFAULT_ENVELOPE[key])
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/10 bg-[#0d0d1a] shadow-lg shadow-black/40">
      <style>{`
        @keyframes pulse-amber {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input[type=range].synth-slider::-webkit-slider-runnable-track {
          background: #1a1a2e;
          height: 6px;
          border-radius: 3px;
        }
        input[type=range].synth-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00ff88;
          margin-top: -5px;
          cursor: pointer;
          box-shadow: 0 0 6px #00ff8844;
        }
        input[type=range].synth-slider.out-of-bounds::-webkit-slider-runnable-track {
          background: #ff8800;
          animation: pulse-amber 1s ease-in-out infinite;
        }
        input[type=range].synth-slider.out-of-bounds::-webkit-slider-thumb {
          background: #ff8800;
          box-shadow: 0 0 8px #ff880066;
        }
        input[type=range].synth-slider::-moz-range-track {
          background: #1a1a2e;
          height: 6px;
          border-radius: 3px;
        }
        input[type=range].synth-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00ff88;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 6px #00ff8844;
        }
        input[type=range].synth-slider.out-of-bounds::-moz-range-track {
          background: #ff8800;
          animation: pulse-amber 1s ease-in-out infinite;
        }
        input[type=range].synth-slider.out-of-bounds::-moz-range-thumb {
          background: #ff8800;
          box-shadow: 0 0 8px #ff880066;
        }
      `}</style>

      <div className="grid grid-cols-4 gap-3">
        {ENVELOPE_KEYS.map((key) => {
          const limit = PARAM_LIMITS[key]
          const value = editingEnvelope[key]
          const oob = isOutOfBounds(key, value)

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-[#1a1a2e]",
                "transition-all duration-300 hover:border-[#00ff8833] hover:shadow-[0_0_12px_#00ff8815]"
              )}
            >
              <span className={cn(
                "text-xs font-semibold tracking-wider uppercase",
                oob ? "text-[#ff8800]" : "text-[#00ff88]"
              )}>
                {limit.label}
              </span>

              <input
                type="range"
                min={limit.min}
                max={limit.max}
                step={limit.step}
                value={value}
                onChange={(e) => updateEnvelope(key, parseFloat(e.target.value))}
                className={cn(
                  "synth-slider w-full appearance-none bg-transparent cursor-pointer",
                  oob && "out-of-bounds"
                )}
              />

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={limit.min}
                  max={limit.max}
                  step={limit.step}
                  value={parseFloat(value.toFixed(3))}
                  onChange={(e) => updateEnvelope(key, parseFloat(e.target.value) || 0)}
                  className={cn(
                    "w-16 px-1.5 py-0.5 text-xs text-center rounded border bg-[#0d0d1a] outline-none",
                    oob
                      ? "border-[#ff8800] text-[#ff8800]"
                      : "border-white/10 text-[#00ff88]",
                    "focus:border-[#00ff88] focus:shadow-[0_0_4px_#00ff8833] transition-colors"
                  )}
                />
                {limit.unit && (
                  <span className={cn(
                    "text-[10px]",
                    oob ? "text-[#ff8800]/70" : "text-white/40"
                  )}>
                    {limit.unit}
                  </span>
                )}
              </div>

              {oob && (
                <AlertTriangle className="w-3.5 h-3.5 text-[#ff8800] animate-pulse" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-white/10 text-white/60 bg-[#1a1a2e] hover:text-white hover:border-white/20 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>

        <div className="relative">
          <button
            onClick={() => commitVersion()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md border border-[#00ff8833] text-[#00ff88] bg-[#00ff8810] hover:bg-[#00ff8820] hover:shadow-[0_0_12px_#00ff8822] transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            提交版本
          </button>

          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[#ff8800] text-black animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
