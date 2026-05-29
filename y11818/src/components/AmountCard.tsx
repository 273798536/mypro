import { cn, formatCurrency } from "@/lib/utils"

interface AmountCardProps {
  title: string
  amount: number
  description: string
  theme: "teal" | "blue" | "red"
}

const themeMap = {
  teal: "border-[#0F9B8E]/30 bg-[#0F9B8E]/10",
  blue: "border-blue-500/30 bg-blue-500/10",
  red: "border-red-500/30 bg-red-500/10",
}

const amountTheme = {
  teal: "text-[#0F9B8E]",
  blue: "text-blue-400",
  red: "text-red-400",
}

export default function AmountCard({ title, amount, description, theme }: AmountCardProps) {
  return (
    <div className={cn("rounded-lg border p-4", themeMap[theme])}>
      <p className="text-sm text-[#F5F5F0]/60">{title}</p>
      <p className={cn("font-mono text-2xl font-bold", amountTheme[theme])}>
        {formatCurrency(amount)}
      </p>
      <p className="mt-1 text-xs text-[#F5F5F0]/40">{description}</p>
    </div>
  )
}
