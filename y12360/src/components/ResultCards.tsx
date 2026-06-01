import { Droplets, ArrowUp, ArrowDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalculationRecord } from "@shared/types"

interface ResultCardsProps {
  record: CalculationRecord
}

function ChangePercent({ value }: { value: number | null }) {
  if (value === null) return null

  const pct = ((value - 1) * 100).toFixed(1)
  const numPct = parseFloat(pct)
  if (numPct === 0) {
    return <span className="text-xs text-slate-400">0%</span>
  }

  const isIncrease = numPct > 0
  const Icon = isIncrease ? ArrowUp : ArrowDown

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isIncrease ? "text-red-500" : "text-emerald-500",
      )}
    >
      <Icon className="h-3 w-3" />
      {isIncrease ? "+" : ""}
      {pct}%
    </span>
  )
}

function isFieldWarned(record: CalculationRecord, field: string): boolean {
  return record.warnings.some((w) => w.affectedFields.includes(field))
}

export default function ResultCards({ record }: ResultCardsProps) {
  const cards = [
    {
      label: "目标流量",
      value: record.targetFlow,
      unit: record.ratedFlowUnit,
      ratio: record.flowRatio,
      icon: Droplets,
      field: "ratedFlow",
      accent: "text-sky-500",
    },
    {
      label: "目标扬程",
      value: record.targetHead,
      unit: record.ratedHeadUnit,
      ratio: record.headRatio,
      icon: ArrowUp,
      field: "ratedHead",
      accent: "text-blue-500",
    },
    {
      label: "目标功率",
      value: record.targetPower,
      unit: record.ratedPowerUnit,
      ratio: record.powerRatio,
      icon: Zap,
      field: "ratedPower",
      accent: "text-amber-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const warned = isFieldWarned(record, card.field)
        const Icon = card.icon

        return (
          <div
            key={card.field}
            className={cn(
              "rounded-lg bg-white p-4 shadow-sm",
              warned && "ring-2 ring-amber-400",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {card.label}
              </span>
              <Icon className={cn("h-4 w-4", card.accent)} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-slate-800">
                {card.value !== null ? card.value.toFixed(2) : "—"}
              </span>
              <span className="text-sm text-slate-400">{card.unit}</span>
            </div>
            <div className="mt-1">
              <ChangePercent value={card.ratio} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
