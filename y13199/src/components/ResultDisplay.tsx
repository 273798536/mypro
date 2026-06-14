import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { BoundaryStatus } from '../types'
import { BOUNDARY_STATUS_LABELS } from '../types'
import { calculateTension, determineBoundary } from '../utils/tensionCalc'

interface Props {
  equipmentId: string
  loadWeight: string
  pulleyCount: string
  gravity: string
  onResult: (tensionValue: number, boundaryStatus: BoundaryStatus) => void
}

const STATUS_CONFIG: Record<BoundaryStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  normal: { icon: CheckCircle2, color: 'text-[#2D9B83]', bg: 'bg-[#2D9B83]/10 border-[#2D9B83]/30', label: BOUNDARY_STATUS_LABELS.normal },
  critical: { icon: AlertTriangle, color: 'text-[#E8A838]', bg: 'bg-[#E8A838]/10 border-[#E8A838]/30', label: BOUNDARY_STATUS_LABELS.critical },
  exceeded: { icon: XCircle, color: 'text-[#C44D3F]', bg: 'bg-[#C44D3F]/10 border-[#C44D3F]/30', label: BOUNDARY_STATUS_LABELS.exceeded },
}

export default function ResultDisplay({ equipmentId, loadWeight, pulleyCount, gravity, onResult }: Props) {
  const [tensionValue, setTensionValue] = useState<number | null>(null)
  const [boundaryStatus, setBoundaryStatus] = useState<BoundaryStatus | null>(null)

  useEffect(() => {
    const w = parseFloat(loadWeight)
    const n = parseInt(pulleyCount)
    const g = parseFloat(gravity)

    if (!w || !n || !g || n <= 0) {
      setTensionValue(null)
      setBoundaryStatus(null)
      onResult(0, 'normal')
      return
    }

    const tension = calculateTension(w, n, g)
    const status = determineBoundary(tension)
    setTensionValue(tension)
    setBoundaryStatus(status)
    onResult(tension, status)
  }, [loadWeight, pulleyCount, gravity, onResult])

  if (tensionValue === null || boundaryStatus === null) {
    return (
      <div className="rounded-xl border border-dashed border-[#1B3A5C]/20 bg-[#F8FAFB] p-8 text-center">
        <p className="text-sm text-[#8BA3BF]">输入测量值后自动计算</p>
      </div>
    )
  }

  const config = STATUS_CONFIG[boundaryStatus]
  const Icon = config.icon

  return (
    <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1B3A5C]" />
        计算结果
      </h3>

      <div className={`mb-4 rounded-lg border p-4 ${config.bg} transition-all duration-500`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${config.color}`} />
          <div>
            <p className="text-xs text-[#5A7A9A]">张力值</p>
            <p className={`font-mono text-3xl font-bold ${config.color}`}>
              {tensionValue.toFixed(2)}
              <span className="ml-1 text-base font-medium">kN</span>
            </p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${config.color} ${config.bg}`}>
            {config.label}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-[#0F2640]/5 p-4">
        <p className="mb-1 text-xs font-semibold text-[#1B3A5C]">计算过程</p>
        <div className="space-y-1 font-mono text-xs text-[#3A5A7A]">
          <p>F = (W &times; g) / n</p>
          <p>F = ({loadWeight} kg &times; {gravity} m/s&sup2;) / {pulleyCount}</p>
          <p>
            F = {((parseFloat(loadWeight) || 0) * (parseFloat(gravity) || 0)).toFixed(2)} N / {pulleyCount}
          </p>
          <p className="font-bold text-[#1B3A5C]">
            F = {(tensionValue * 1000).toFixed(2)} N = {tensionValue.toFixed(2)} kN
          </p>
        </div>
      </div>

      {equipmentId && (
        <div className="mt-4 rounded-lg border border-[#1B3A5C]/5 bg-[#F8FAFB] px-4 py-2">
          <p className="text-xs text-[#5A7A9A]">
            设备编号：<span className="font-mono font-bold text-[#1B3A5C]">{equipmentId}</span>
          </p>
        </div>
      )}
    </div>
  )
}
