import { DollarSign } from "lucide-react"
import { CURRENCIES } from "@/data/mockData"
import { useStore } from "@/store/useStore"

export function CurrencySwitcher() {
  const selectedCurrency = useStore((s) => s.selectedCurrency)
  const setSelectedCurrency = useStore((s) => s.setSelectedCurrency)
  const items = useStore((s) => s.items)
  const riskFlags = useStore((s) => s.riskFlags)

  const unconvertedItemIds = new Set(
    riskFlags
      .filter((f) => f.type === "currency_unconverted")
      .map((f) => f.itemId)
  )

  return (
    <div className="flex items-center gap-2">
      <DollarSign className="w-4 h-4 text-white/60" />
      <div className="flex gap-1">
        {CURRENCIES.map((currency) => {
          const isActive = selectedCurrency === currency
          const unconvertedCount = items.filter(
            (item) =>
              item.currency === currency && unconvertedItemIds.has(item.id)
          ).length
          const hasUnconvertedRisk =
            currency !== "CNY" && unconvertedCount > 0

          return (
            <button
              key={currency}
              onClick={() => setSelectedCurrency(currency)}
              className={`
                relative px-3 py-1 rounded-full text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-[#4fc3f7] text-[#1a1f36]"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }
                ${hasUnconvertedRisk ? "border border-orange-400" : "border border-transparent"}
              `}
            >
              {currency}
              {currency !== "CNY" && unconvertedCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-orange-400 text-[#1a1f36] font-bold leading-none">
                  {unconvertedCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
