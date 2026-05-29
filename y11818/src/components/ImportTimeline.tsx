import { FileText, Tag, CreditCard } from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"

interface TimelineEntry {
  id: string
  type: "contract" | "treatment" | "coupon"
  label: string
  importOrder: number
  importedAt: string
  isLateEntry?: boolean
}

interface ImportTimelineProps {
  contracts: { id: string; platform_name: string; import_order: number; imported_at: string }[]
  treatments: { id: string; treatment_name: string; import_order: number; imported_at: string }[]
  coupons: {
    id: string
    coupon_name: string
    import_order: number
    imported_at: string
    is_late_entry: number
  }[]
}

const typeIcon: Record<string, typeof FileText> = {
  contract: CreditCard,
  treatment: FileText,
  coupon: Tag,
}

const typeColor: Record<string, string> = {
  contract: "text-[#0F9B8E]",
  treatment: "text-red-400",
  coupon: "text-[#E8813B]",
}

export default function ImportTimeline({ contracts, treatments, coupons }: ImportTimelineProps) {
  const entries: TimelineEntry[] = [
    ...contracts.map((c) => ({
      id: c.id,
      type: "contract" as const,
      label: c.platform_name,
      importOrder: c.import_order,
      importedAt: c.imported_at,
    })),
    ...treatments.map((t) => ({
      id: t.id,
      type: "treatment" as const,
      label: t.treatment_name,
      importOrder: t.import_order,
      importedAt: t.imported_at,
    })),
    ...coupons.map((c) => ({
      id: c.id,
      type: "coupon" as const,
      label: c.coupon_name,
      importOrder: c.import_order,
      importedAt: c.imported_at,
      isLateEntry: c.is_late_entry === 1,
    })),
  ]

  const sorted = [...entries].sort((a, b) => a.importOrder - b.importOrder)

  return (
    <div className="rounded-lg border border-[#F5F5F0]/10 bg-[#1A1A2E] p-6">
      <h2 className="mb-4 text-lg font-bold text-[#F5F5F0]">导入时序</h2>
      <div className="relative ml-3">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-[#F5F5F0]/10" />
        <div className="space-y-4">
          {sorted.map((entry) => {
            const Icon = typeIcon[entry.type]
            return (
              <div key={entry.id} className="relative flex items-start gap-3 pl-6">
                <div className="absolute left-0 top-1 h-2 w-2 -translate-x-[3.5px] rounded-full bg-[#0F9B8E]" />
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", typeColor[entry.type])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#F5F5F0]">{entry.label}</span>
                    {entry.isLateEntry && (
                      <span className="rounded-full bg-[#E8813B]/20 px-2 py-0.5 text-xs font-medium text-[#E8813B]">
                        后补
                      </span>
                    )}
                    <span className="text-xs text-[#F5F5F0]/30">#{entry.importOrder}</span>
                  </div>
                  <p className="text-xs text-[#F5F5F0]/40">{formatDateTime(entry.importedAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
