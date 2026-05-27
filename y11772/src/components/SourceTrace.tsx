import { Database, ArrowDown, AlertTriangle } from "lucide-react"
import type { CashFlowItem } from "@/types"
import { SOURCE_LABELS } from "@/types"
import { useStore } from "@/store/useStore"

interface SourceTraceNode {
  source: CashFlowItem["source"]
  sourceId: string
  confidence: number
  isCurrencyConverted: boolean
  currency: string
}

interface SourceTraceProps {
  item?: CashFlowItem
}

function buildTraceNodes(item: CashFlowItem): SourceTraceNode[] {
  const sources: CashFlowItem["source"][] = [
    "collection_plan",
    "payment_plan",
    "fund_report",
  ]
  const activeIndex = sources.indexOf(item.source)

  return sources.map((source, idx) => ({
    source,
    sourceId: idx === activeIndex ? item.sourceId : `${source}-ref-${item.id}`,
    confidence: idx === activeIndex ? item.confidence : Math.max(0.3, item.confidence - (Math.abs(idx - activeIndex) * 0.15)),
    isCurrencyConverted: idx <= activeIndex ? item.isCurrencyConverted : false,
    currency: item.currency,
  }))
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/60 w-10 text-right">{pct}%</span>
    </div>
  )
}

export function SourceTrace({ item: propItem }: SourceTraceProps) {
  const selectedItemIds = useStore((s) => s.selectedItemIds)
  const items = useStore((s) => s.items)

  const item = propItem ?? (selectedItemIds.length > 0 ? items.find((i) => i.id === selectedItemIds[0]) : undefined)

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <Database className="w-12 h-12 mb-3 opacity-40" />
        <p>请选择一个现金流项目以查看来源追溯</p>
      </div>
    )
  }

  const nodes = buildTraceNodes(item)

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="mb-6 text-center">
        <h3 className="text-white/90 font-medium">{item.id}</h3>
        <p className="text-white/40 text-sm mt-1">
          {item.currency} {item.amount.toLocaleString()}
        </p>
      </div>

      <div className="relative">
        {nodes.map((node, idx) => {
          const isActive = node.source === item.source
          const pct = Math.round(node.confidence * 100)

          return (
            <div key={node.source}>
              <div
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isActive
                    ? "bg-[#4fc3f7]/10 border-[#4fc3f7]/30"
                    : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div
                  className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${
                    isActive ? "bg-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/30" : "bg-white/20"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${isActive ? "text-[#4fc3f7]" : "text-white/70"}`}>
                      {SOURCE_LABELS[node.source]}
                    </span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4fc3f7]/20 text-[#4fc3f7]">
                        当前来源
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 mb-2 font-mono">
                    {node.sourceId}
                  </div>
                  <ConfidenceBar value={node.confidence} />
                  {pct < 60 && (
                    <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      低置信度
                    </p>
                  )}
                </div>
              </div>

              {idx < nodes.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-px h-6 bg-white/15" />
                  {node.isCurrencyConverted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      已换算
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      未换算
                    </span>
                  )}
                  <ArrowDown className="w-3 h-3 text-white/15" />
                  <div className="w-px h-4 bg-white/15" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
