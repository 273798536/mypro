import { Gauge, AlertTriangle, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RiskGaugeProps {
  durationGap: number
  varValue: number
  isInverted: boolean
  lowRatingPct: number
  spreadWidening: number
  portfolioDuration: number
  portfolioEffDuration: number
}

function getGapColor(gap: number): string {
  const abs = Math.abs(gap)
  if (abs < 2) return '#43A047'
  if (abs <= 4) return '#FFC107'
  return '#E53935'
}

export default function RiskGauge({
  durationGap,
  varValue,
  isInverted,
  lowRatingPct,
  spreadWidening,
  portfolioDuration,
  portfolioEffDuration,
}: RiskGaugeProps) {
  const maxGap = 5
  const ratio = Math.min(Math.abs(durationGap) / maxGap, 1)
  const circumference = 2 * Math.PI * 60
  const dashOffset = circumference * (1 - ratio)
  const gapColor = getGapColor(durationGap)

  return (
    <div className="flex flex-col h-full">
      {isInverted && (
        <div className="risk-flash flex items-center justify-center gap-2 rounded-lg px-3 py-2 mb-3 bg-[#E53935]/20 border border-[#E53935]/50 text-[#E53935] text-sm font-bold">
          <AlertTriangle size={16} />
          ⚠ 收益率曲线反向
        </div>
      )}

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-[#D4A017]" />
        <span className="text-[#D4A017]">风险仪表</span>
        <Gauge size={18} className="text-[#D4A017]" />
      </h2>

      <div className="flex flex-col items-center mb-5">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="10"
          />
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke={gapColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 80 80)"
            className="transition-all duration-700"
          />
          <text
            x="80"
            y="76"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="28"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {durationGap.toFixed(2)}
          </text>
          <text
            x="80"
            y="100"
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize="12"
          >
            久期缺口
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1F3A] p-3">
          <div className="text-xs text-gray-400 mb-1">组合久期</div>
          <div className="font-mono text-white text-sm font-semibold">
            {portfolioDuration.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1F3A] p-3">
          <div className="text-xs text-gray-400 mb-1">有效久期</div>
          <div className="font-mono text-white text-sm font-semibold">
            {portfolioEffDuration.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1F3A] p-3">
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <TrendingDown size={12} />
            VaR
          </div>
          <div className="font-mono text-white text-sm font-semibold">
            {varValue.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1F3A] p-3">
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            低评级占比
          </div>
          <div
            className={cn(
              'font-mono text-sm font-semibold',
              lowRatingPct > 20 ? 'text-[#E53935]' : 'text-[#43A047]'
            )}
          >
            {lowRatingPct.toFixed(1)}%
          </div>
        </div>

        <div className="col-span-2 rounded-lg border border-[#1E3A5F] bg-[#0F1F3A] p-3">
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Gauge size={12} />
            信用利差
          </div>
          <div
            className={cn(
              'font-mono text-sm font-semibold',
              spreadWidening > 0 ? 'text-[#E53935]' : 'text-[#43A047]'
            )}
          >
            +{spreadWidening.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  )
}
