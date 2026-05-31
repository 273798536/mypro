import { useGameStore } from "@/store/gameStore"
import { AlertTriangle, Archive, CheckCircle, Clock } from "lucide-react"

export default function AnomalySidebar() {
  const anomalies = useGameStore((s) => s.anomalies)
  const archiveAnomaly = useGameStore((s) => s.archiveAnomaly)
  const currentLevelId = useGameStore((s) => s.currentLevelId)

  const levelAnomalies = anomalies.filter((a) => a.levelId === currentLevelId)
  const pending = levelAnomalies.filter((a) => a.status === "pending")
  const anomaly = levelAnomalies.filter((a) => a.status === "anomaly")
  const archived = levelAnomalies.filter((a) => a.status === "archived")

  const typeLabel: Record<string, string> = {
    direction_misjudgment: "方向反判",
    energy_overflow: "能量超限",
    mass_deficiency: "质量缺失",
  }

  return (
    <div className="flex flex-col gap-3 w-64 min-w-[256px]">
      <div className="text-xs font-bold tracking-wider text-cyan-400 uppercase mb-1 font-['Orbitron']">异常清单</div>

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300">待确认</span>
          </div>
          {pending.map((a) => (
            <div key={a.id} className="mb-2 last:mb-0 pl-3 border-l-2 border-amber-600/30">
              <div className="text-[10px] text-amber-400 font-bold">{typeLabel[a.type]}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{a.ruleDescription.slice(0, 30)}...</div>
              <div className="text-[10px] text-amber-300">玩家: {a.playerInput}</div>
              <div className="text-[10px] text-gray-500">正确: {a.correctValue}</div>
              <button
                onClick={() => archiveAnomaly(a.id)}
                className="mt-1 text-[9px] px-2 py-0.5 rounded border border-amber-600/30 text-amber-400 hover:bg-amber-900/30 transition-colors"
              >
                确认归档
              </button>
            </div>
          ))}
        </div>
      )}

      {anomaly.length > 0 && (
        <div className="rounded-lg border border-red-600/40 bg-red-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-bold text-red-300">异常</span>
          </div>
          {anomaly.map((a) => (
            <div key={a.id} className="mb-2 last:mb-0 pl-3 border-l-2 border-red-600/30">
              <div className="text-[10px] text-red-400 font-bold">{typeLabel[a.type]}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{a.ruleDescription.slice(0, 30)}...</div>
              <div className="text-[10px] text-red-300">玩家: {a.playerInput}</div>
              <div className="text-[10px] text-gray-500">正确: {a.correctValue}</div>
              <button
                onClick={() => archiveAnomaly(a.id)}
                className="mt-1 text-[9px] px-2 py-0.5 rounded border border-red-600/30 text-red-400 hover:bg-red-900/30 transition-colors"
              >
                确认归档
              </button>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="rounded-lg border border-gray-700/30 bg-gray-900/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-500">已归档</span>
          </div>
          {archived.map((a) => (
            <div key={a.id} className="mb-1 last:mb-0 pl-3 border-l-2 border-gray-700/30">
              <div className="text-[10px] text-gray-500">{typeLabel[a.type]} — 已处理</div>
            </div>
          ))}
        </div>
      )}

      {levelAnomalies.length === 0 && (
        <div className="rounded-lg border border-gray-800/30 bg-gray-900/10 p-4 text-center">
          <CheckCircle size={20} className="text-gray-600 mx-auto mb-1" />
          <div className="text-[10px] text-gray-600">暂无异常</div>
        </div>
      )}

      <div className="text-[9px] text-gray-600 mt-2">
        * 方向反判进入待确认区，能量超限和质量缺失进入异常区
      </div>
    </div>
  )
}
