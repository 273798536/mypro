import { X } from "lucide-react"
import type { CashFlowItem, RiskFlag } from "@/types"
import { SOURCE_LABELS, RISK_LABELS, RISK_COLORS } from "@/types"
import { DEPARTMENTS } from "@/data/mockData"
import { useStore } from "@/store/useStore"
import { formatCurrency } from "@/utils/currency"

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 0.8 ? "bg-green-400" : value >= 0.6 ? "bg-yellow-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-xs text-white/50">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

function ItemDetail({ item, risks }: { item: CashFlowItem; risks: RiskFlag[] }) {
  const dept = DEPARTMENTS.find((d) => d.id === item.department)
  const sourceColors: Record<string, string> = {
    collection_plan: "bg-green-500/20 text-green-300",
    payment_plan: "bg-red-500/20 text-red-300",
    fund_report: "bg-blue-500/20 text-blue-300",
  }

  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            item.type === "receipt"
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-300"
          }`}
        >
          {item.type === "receipt" ? "收" : "付"}
        </span>
        {dept && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${dept.color}20`,
              color: dept.color,
            }}
          >
            {dept.name}
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded ${sourceColors[item.source] ?? ""}`}
        >
          {SOURCE_LABELS[item.source]}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">金额</span>
          <span className="font-medium">
            {formatCurrency(item.amount, item.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">到期日</span>
          <span>{item.dueDate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">置信度</span>
        </div>
        <ConfidenceBar value={item.confidence} />
      </div>

      {risks.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-white/40 uppercase tracking-wider">
            风险标记
          </span>
          {risks.map((risk) => (
            <div
              key={risk.id}
              className="flex items-start gap-2 text-xs p-2 rounded bg-white/[0.02]"
            >
              <div
                className="w-2 h-2 rounded-full mt-0.5 shrink-0"
                style={{ backgroundColor: RISK_COLORS[risk.type] }}
              />
              <div>
                <span className="text-white/70 font-medium">
                  {RISK_LABELS[risk.type]}
                </span>
                <p className="text-white/40 mt-0.5">{risk.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.auditTrail.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-white/40 uppercase tracking-wider">
            修改记录
          </span>
          <div className="space-y-1">
            {item.auditTrail.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 text-xs text-white/50"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#4fc3f7] shrink-0" />
                <span className="text-white/30">
                  {new Date(entry.timestamp).toLocaleDateString("zh-CN")}
                </span>
                <span>{entry.reason}</span>
                <span className="text-white/30">— {entry.operator}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DetailPanel() {
  const selectedItemIds = useStore((s) => s.selectedItemIds)
  const setSelectedItemIds = useStore((s) => s.setSelectedItemIds)
  const setDetailPanelOpen = useStore((s) => s.setDetailPanelOpen)
  const items = useStore((s) => s.items)
  const getRiskFlagsForItem = useStore((s) => s.getRiskFlagsForItem)

  if (selectedItemIds.length === 0) return null

  const selectedItems = items.filter((i) => selectedItemIds.includes(i.id))

  const handleClose = () => {
    setSelectedItemIds([])
    setDetailPanelOpen(false)
  }

  return (
    <div className="h-full w-80 bg-[#1a1f36] border-l border-white/10 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <span className="text-sm font-medium text-white/90">
          详情 ({selectedItems.length})
        </span>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedItems.map((item) => (
          <ItemDetail
            key={item.id}
            item={item}
            risks={getRiskFlagsForItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
