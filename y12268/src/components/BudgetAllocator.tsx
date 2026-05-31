import { motion } from 'framer-motion'
import { Building2, TrendingDown, Heart } from 'lucide-react'

interface Props {
  treasury: number
  infraInvestment: number
  interestPayment: number
  welfareSpending: number
  onChange: (infra: number, interest: number, welfare: number) => void
  onConfirm: () => void
  canConfirm: boolean
}

const SLIDERS = [
  { key: 'infra', label: '基建投资', icon: Building2, accent: '#22C55E', field: 'infraInvestment' as const },
  { key: 'interest', label: '利息偿还', icon: TrendingDown, accent: '#F59E0B', field: 'interestPayment' as const },
  { key: 'welfare', label: '民生支出', icon: Heart, accent: '#0EA5E9', field: 'welfareSpending' as const },
]

export default function BudgetAllocator({
  treasury, infraInvestment, interestPayment, welfareSpending, onChange, onConfirm, canConfirm,
}: Props) {
  const total = infraInvestment + interestPayment + welfareSpending
  const remaining = treasury - total

  function handleChange(field: 'infraInvestment' | 'interestPayment' | 'welfareSpending', val: number) {
    const next = { infraInvestment, interestPayment, welfareSpending, [field]: val }
    onChange(next.infraInvestment, next.interestPayment, next.welfareSpending)
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-[#1B2838] p-5">
      <h2
        className="text-center text-sm tracking-widest text-[#D4A843]"
        style={{ fontFamily: '"Noto Serif SC", serif' }}
      >
        预算分配
      </h2>

      <div className="flex flex-col gap-4">
        {SLIDERS.map(({ key, label, icon: Icon, accent, field }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <Icon size={16} style={{ color: accent }} />
                {label}
              </span>
              <span className="font-mono text-sm" style={{ color: accent }}>
                {(field === 'infraInvestment' ? infraInvestment
                  : field === 'interestPayment' ? interestPayment
                  : welfareSpending).toLocaleString()}万
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={treasury}
              step={1}
              value={field === 'infraInvestment' ? infraInvestment
                : field === 'interestPayment' ? interestPayment
                : welfareSpending}
              onChange={e => handleChange(field, Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: accent }}
            />
          </div>
        ))}
      </div>

      <div className="text-center text-sm font-mono">
        剩余可用{' '}
        <span className={remaining >= 0 ? 'text-green-400' : 'text-red-400'}>
          {remaining.toLocaleString()}万
        </span>
      </div>

      <motion.button
        whileHover={canConfirm ? { scale: 1.04 } : {}}
        whileTap={canConfirm ? { scale: 0.97 } : {}}
        onClick={onConfirm}
        disabled={!canConfirm}
        className="rounded-lg bg-[#D4A843] px-4 py-2.5 text-sm font-semibold text-[#0D1B1E] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        确认回合结算
      </motion.button>
    </section>
  )
}
