import { useNavigate } from "react-router-dom"
import { useStore } from "@/store/useStore"
import { Activity } from "lucide-react"
import RecordCard from "@/components/RecordCard"
import StatusFilterBar from "@/components/StatusFilterBar"

export default function Workbench() {
  const navigate = useNavigate()
  const { getFilteredRecords, records } = useStore()
  const filtered = getFilteredRecords()

  const stats = {
    total: records.length,
    processed: records.filter((r) => r.status === "processed").length,
    pending: records.filter((r) => r.status === "pending_material").length,
    override: records.filter((r) => r.status === "manual_override").length,
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-surface-100">回放工作台</h2>
          </div>
          <p className="text-sm text-surface-500 ml-11">影子流量异常回放记录管理，支持溯源追踪与状态筛选</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "总记录", value: stats.total, color: "text-amber-400" },
            { label: "已处理", value: stats.processed, color: "text-status-processed" },
            { label: "待补材料", value: stats.pending, color: "text-status-pending" },
            { label: "人工改判", value: stats.override, color: "text-status-override" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-900/80 border border-surface-700/50 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold data-font ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <StatusFilterBar />
        </div>

        <div className="space-y-4">
          {filtered.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onClick={() => navigate(`/compare/${record.id}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-surface-500">
              <p className="text-sm">当前筛选条件下没有记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
