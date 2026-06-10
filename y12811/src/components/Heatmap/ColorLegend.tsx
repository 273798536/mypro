import { ColorLegendProps } from '@/types'
import { cn } from '@/lib/utils'

const COLOR_STOPS = [
  { offset: 0, color: '#1e3a5f' },
  { offset: 25, color: '#2563eb' },
  { offset: 50, color: '#22d3ee' },
  { offset: 75, color: '#facc15' },
  { offset: 100, color: '#ef4444' },
]

export default function ColorLegend({ minValue, maxValue, title }: ColorLegendProps) {
  const gradientId = 'heatmap-color-gradient'

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k'
    }
    return value.toFixed(1)
  }

  const midValue = (minValue + maxValue) / 2

  return (
    <div className="flex flex-col gap-2">
      {title && (
        <span className="text-xs font-medium text-lab-300">{title}</span>
      )}
      <div className="flex items-center gap-3">
        <svg width="200" height="24" className="rounded-md overflow-hidden">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {COLOR_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={`${stop.offset}%`}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width="200"
            height="24"
            fill={`url(#${gradientId})`}
            rx="4"
          />
        </svg>
        <div className="flex flex-col text-xs text-lab-400 font-mono">
          <span>{formatValue(maxValue)}</span>
          <span className="text-lab-500">{formatValue(midValue)}</span>
          <span>{formatValue(minValue)}</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-lab-500 w-[200px]">
        <span>低丰度</span>
        <span>高丰度</span>
      </div>
    </div>
  )
}
