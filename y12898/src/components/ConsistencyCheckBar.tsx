import { useEffect } from "react"
import { useOceanStore } from "@/store/useOceanStore"
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  Droplets,
  Copy,
} from "lucide-react"
import type { ConsistencyStatus } from "@/types"

const statusConfig: Record<ConsistencyStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  pass: { icon: CheckCircle2, color: "text-ocean-green", bg: "bg-ocean-green", label: "一致性检查通过" },
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500", label: "存在警告项" },
  inconsistent: { icon: AlertTriangle, color: "text-ocean-coral", bg: "bg-ocean-coral", label: "数据不一致" },
}

export default function ConsistencyCheckBar() {
  const { consistencyCheck, runConsistencyCheck } = useOceanStore()

  useEffect(() => {
    runConsistencyCheck()
  }, [])

  const config = statusConfig[consistencyCheck.status]
  const Icon = config.icon

  return (
    <div
      className={`rounded-xl p-4 flex items-center gap-4 ${
        consistencyCheck.status === "pass"
          ? "bg-ocean-greenLight border border-ocean-green/20"
          : consistencyCheck.status === "warning"
          ? "bg-amber-50 border border-amber-200"
          : "bg-ocean-redLight border border-ocean-coral/20"
      }`}
    >
      <div className={`${config.color}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </div>
        <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
          {consistencyCheck.details.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
      </div>
      <button
        className="text-xs bg-white/60 px-3 py-1.5 rounded-full hover:bg-white transition-colors"
        onClick={runConsistencyCheck}
      >
        重新检查
      </button>
    </div>
  )
}
