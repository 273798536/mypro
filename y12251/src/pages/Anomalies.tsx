import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useGameStore, loadAnomaliesFromStorage } from "@/store/gameStore"
import { ArrowLeft, AlertTriangle, Clock, Archive, CheckCircle } from "lucide-react"
import type { AnomalyRecord } from "@/types"

export default function Anomalies() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"pending" | "anomaly" | "archived">("pending")
  const storeAnomalies = useGameStore((s) => s.anomalies)
  const archiveAnomaly = useGameStore((s) => s.archiveAnomaly)

  const allAnomalies = [...storeAnomalies, ...loadAnomaliesFromStorage().filter(
    (sa) => !storeAnomalies.find((a) => a.id === sa.id)
  )]

  const filtered = allAnomalies.filter((a) => a.status === tab)

  const typeLabel: Record<string, string> = {
    direction_misjudgment: "方向反判",
    energy_overflow: "能量超限",
    mass_deficiency: "质量缺失",
  }

  const typeColor: Record<string, string> = {
    direction_misjudgment: "text-amber-400",
    energy_overflow: "text-red-400",
    mass_deficiency: "text-red-400",
  }

  const tabs = [
    { key: "pending" as const, label: "待确认", icon: Clock, color: "text-amber-400 border-amber-600/40" },
    { key: "anomaly" as const, label: "异常", icon: AlertTriangle, color: "text-red-400 border-red-600/40" },
    { key: "archived" as const, label: "已归档", icon: Archive, color: "text-gray-500 border-gray-600/40" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex flex-col">
      <header className="border-b border-cyan-900/30 bg-[#060a14]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded border border-cyan-800/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-bold font-['Orbitron'] text-cyan-300 tracking-wider">异常清单总览</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-6 w-full">
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${
                tab === t.key ? t.color + " bg-opacity-20" : "border-gray-800/30 text-gray-600"
              }`}
            >
              <t.icon size={12} />
              {t.label}
              <span className="ml-1 text-[9px] opacity-60">
                ({allAnomalies.filter((a) => a.status === t.key).length})
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-800/30 bg-[#0d1220] p-8 text-center">
            <CheckCircle size={24} className="text-gray-700 mx-auto mb-2" />
            <div className="text-xs text-gray-600">此分类暂无记录</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-4 transition-all ${
                  a.status === "pending"
                    ? "border-amber-700/40 bg-amber-950/15"
                    : a.status === "anomaly"
                    ? "border-red-700/40 bg-red-950/15"
                    : "border-gray-700/30 bg-gray-900/10"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${typeColor[a.type]}`}>
                      {typeLabel[a.type]}
                    </span>
                    <span className="text-[9px] text-gray-600">[{a.ruleId}]</span>
                    <span className="text-[9px] text-gray-700">赛道 {a.levelId}</span>
                  </div>
                  {a.status !== "archived" && (
                    <button
                      onClick={() => archiveAnomaly(a.id)}
                      className="text-[9px] px-2 py-0.5 rounded border border-gray-600/30 text-gray-400 hover:bg-gray-800/30 transition-colors"
                    >
                      归档
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mb-1">{a.ruleDescription}</div>
                <div className="flex gap-4 text-[10px]">
                  <div>
                    <span className="text-gray-500">期望: </span>
                    <span className="text-gray-300">{a.correctValue}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">实际: </span>
                    <span className={typeColor[a.type]}>{a.playerInput}</span>
                  </div>
                </div>
                <div className="text-[9px] text-gray-700 mt-1.5">
                  {new Date(a.timestamp).toLocaleString("zh-CN")}
                  {a.snapshotId && <span className="ml-2">快照: {a.snapshotId.slice(0, 6)}...</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
