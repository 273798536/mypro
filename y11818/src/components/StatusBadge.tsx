import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; className: string }> = {
  待拆账: { label: "待拆账", className: "bg-gray-500/20 text-gray-300" },
  拆账中: { label: "拆账中", className: "bg-blue-500/20 text-blue-300" },
  待确认: { label: "待确认", className: "bg-orange-500/20 text-orange-300" },
  已完成: { label: "已完成", className: "bg-green-500/20 text-green-300" },
  未结清: { label: "未结清", className: "bg-red-500/20 text-red-300" },
  已结清: { label: "已结清", className: "bg-green-500/20 text-green-300" },
  退款申请中: { label: "退款申请中", className: "bg-orange-500/20 text-orange-300" },
  待确认_item: { label: "待确认", className: "bg-orange-500/20 text-orange-300" },
  已确认: { label: "已确认", className: "bg-green-500/20 text-green-300" },
  已退回: { label: "已退回", className: "bg-gray-500/20 text-gray-300" },
}

interface StatusBadgeProps {
  status: string
  isPendingItem?: boolean
  className?: string
}

export default function StatusBadge({ status, isPendingItem, className }: StatusBadgeProps) {
  const key = isPendingItem && status === "待确认" ? "待确认_item" : status
  const config = statusConfig[key] ?? { label: status, className: "bg-gray-500/20 text-gray-300" }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
