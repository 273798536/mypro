import { Check, X, CreditCard, Tag } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import StatusBadge from "./StatusBadge"

interface PendingItem {
  id: string
  type: string
  source_name: string
  amount: number
  status: string
}

interface PendingItemsPanelProps {
  items: PendingItem[]
  onConfirm: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export default function PendingItemsPanel({ items, onConfirm, onReject }: PendingItemsPanelProps) {
  const pending = items.filter((i) => i.status === "待确认")
  const iconMap: Record<string, typeof CreditCard> = {
    平台手续费: CreditCard,
    优惠券追回: Tag,
  }

  return (
    <div className="rounded-lg border border-[#F5F5F0]/10 bg-[#1A1A2E] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F5F5F0]">待确认项</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-[#E8813B] px-2.5 py-0.5 text-xs font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#F5F5F0]/30">暂无待确认项</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = iconMap[item.type] ?? CreditCard
            return (
              <div
                key={item.id}
                className="rounded-lg border border-[#F5F5F0]/5 bg-[#F5F5F0]/5 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        item.type === "平台手续费" ? "text-[#0F9B8E]" : "text-[#E8813B]",
                      )}
                    />
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        item.type === "平台手续费"
                          ? "bg-[#0F9B8E]/20 text-[#0F9B8E]"
                          : "bg-[#E8813B]/20 text-[#E8813B]",
                      )}
                    >
                      {item.type}
                    </span>
                    <span className="text-sm text-[#F5F5F0]">{item.source_name}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#F5F5F0]">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <StatusBadge status={item.status} isPendingItem />
                  {item.status === "待确认" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfirm(item.id)}
                        className="flex items-center gap-1 rounded bg-[#0F9B8E]/20 px-2.5 py-1 text-xs text-[#0F9B8E] hover:bg-[#0F9B8E]/30"
                      >
                        <Check className="h-3 w-3" /> 确认
                      </button>
                      <button
                        onClick={() => onReject(item.id)}
                        className="flex items-center gap-1 rounded bg-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/30"
                      >
                        <X className="h-3 w-3" /> 退回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
