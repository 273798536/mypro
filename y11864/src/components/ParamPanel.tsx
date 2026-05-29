import { useState, useCallback } from 'react'
import { useSimStore } from '@/store/useSimStore'
import { validateParams } from '@/utils/validation'
import type { LaunchParams, Anomaly } from '@/types'
import { Rocket, AlertTriangle, RotateCcw } from 'lucide-react'

export default function ParamPanel() {
  const launch = useSimStore(s => s.launch)
  const startComparison = useSimStore(s => s.startComparison)
  const trajectories = useSimStore(s => s.trajectories)
  const validationErrors = useSimStore(s => s.validationErrors)

  const [velocity, setVelocity] = useState(30)
  const [angle, setAngle] = useState(45)
  const [dragCoeff, setDragCoeff] = useState(0.1)
  const [originX, setOriginX] = useState(0)
  const [originY, setOriginY] = useState(0)
  const [originZ, setOriginZ] = useState(0)
  const [localErrors, setLocalErrors] = useState<Anomaly[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null)

  const handleLaunch = useCallback(() => {
    const params: LaunchParams = {
      id: '',
      name: `v=${velocity} θ=${angle}° k=${dragCoeff}`,
      origin: [originX, originY, originZ],
      velocity,
      angle,
      dragCoefficient: dragCoeff,
      timestamp: Date.now(),
    }

    const validation = validateParams(params)
    if (!validation.valid) {
      setLocalErrors(validation.anomalies)
      return
    }

    setLocalErrors([])

    if (compareMode && compareTargetId) {
      const oldResult = trajectories.find(t => t.id === compareTargetId)
      if (oldResult) {
        startComparison(oldResult, params)
        return
      }
    }

    launch(params)
  }, [velocity, angle, dragCoeff, originX, originY, originZ, compareMode, compareTargetId, trajectories, launch, startComparison])

  const allErrors = [...localErrors, ...validationErrors]

  return (
    <div className="w-[280px] min-w-[280px] h-full bg-[#0d1117] border-r border-[#1e2a3a] flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-[#1e2a3a]">
        <h2 className="text-sm font-bold text-[#00d4ff] tracking-wider uppercase flex items-center gap-2">
          <Rocket size={14} />
          发射参数
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        <ParamField label="初速度 (m/s)" value={velocity} onChange={setVelocity} min={1} max={200} step={1} />
        <ParamField label="发射角度 (°)" value={angle} onChange={setAngle} min={0.1} max={90} step={0.5} />
        <ParamField label="阻力系数 k" value={dragCoeff} onChange={setDragCoeff} min={0} max={5} step={0.01} />

        <div className="border-t border-[#1e2a3a] pt-3 mt-1">
          <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-2">发射点坐标</p>
          <div className="grid grid-cols-3 gap-2">
            <CoordField label="X" value={originX} onChange={setOriginX} />
            <CoordField label="Y" value={originY} onChange={setOriginY} />
            <CoordField label="Z" value={originZ} onChange={setOriginZ} />
          </div>
        </div>

        {trajectories.length > 0 && (
          <div className="border-t border-[#1e2a3a] pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={e => setCompareMode(e.target.checked)}
                className="accent-[#00d4ff]"
              />
              <span className="text-xs text-[#8892a4]">修正对比模式</span>
            </label>
            {compareMode && (
              <select
                value={compareTargetId || ''}
                onChange={e => setCompareTargetId(e.target.value)}
                className="mt-2 w-full bg-[#1a1f2e] text-[#c8d0dc] text-xs rounded px-2 py-1.5 border border-[#2a3040]"
              >
                <option value="">选择基准轨迹...</option>
                {trajectories.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.params.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {allErrors.length > 0 && (
          <div className="bg-[#2a1010] border border-[#ff3366]/30 rounded-lg p-3">
            {allErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#ff6b35]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{err.message}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleLaunch}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-[#0a0e17] font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Rocket size={14} />
          {compareMode ? '修正发射' : '发射'}
        </button>

        {trajectories.length > 0 && (
          <button
            onClick={() => useSimStore.getState().clearAll()}
            className="w-full bg-[#1a1f2e] hover:bg-[#2a3040] text-[#8892a4] text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={12} />
            清空全部
          </button>
        )}
      </div>
    </div>
  )
}

function ParamField({ label, value, onChange, min, max, step }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  const isInvalid = value < min || value > max

  return (
    <div>
      <label className="text-[10px] text-[#8892a4] uppercase tracking-wider block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className={`w-full bg-[#1a1f2e] text-[#c8d0dc] text-sm font-mono rounded px-3 py-1.5 border transition-colors ${isInvalid ? 'border-[#ff3366]' : 'border-[#2a3040] focus:border-[#00d4ff]'} outline-none`}
      />
      <input
        type="range"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full mt-1 accent-[#00d4ff] h-1"
      />
    </div>
  )
}

function CoordField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-[#8892a4] block mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={0.5}
        className="w-full bg-[#1a1f2e] text-[#c8d0dc] text-xs font-mono rounded px-2 py-1 border border-[#2a3040] focus:border-[#00d4ff] outline-none"
      />
    </div>
  )
}
