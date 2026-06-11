import { useState, useEffect } from 'react'
import { useReviewStore } from '@/store'

function AnimatedNumber({ target, decimals = 0 }: { target: number; decimals?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const duration = 800
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [target])

  return <>{value.toFixed(decimals)}</>
}

export default function StatsPanel() {
  const { getRoundStats } = useReviewStore()
  const stats = getRoundStats()

  const cards = [
    { label: '总点位数', value: stats.total, color: 'text-white', decimals: 0 },
    { label: '正常数', value: stats.normal, color: 'text-emerald-400', decimals: 0 },
    { label: '异常数', value: stats.warning + stats.error, color: 'text-orange-400', decimals: 0 },
    { label: '处理率', value: stats.processRate, color: 'text-blue-400', suffix: '%', decimals: 1 },
  ]

  const maxDist = Math.max(...Object.values(stats.coordSystemDist), 1)

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{card.label}</div>
            <div className={`text-xl font-bold ${card.color}`}>
              <AnimatedNumber target={card.value} decimals={card.decimals} />
              {card.suffix}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">坐标系分布</div>
        <div className="space-y-1.5">
          {Object.entries(stats.coordSystemDist).map(([name, count]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0 truncate">{name}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-[#60a5fa] rounded-full transition-all duration-700"
                  style={{ width: `${(count / maxDist) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-300 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
