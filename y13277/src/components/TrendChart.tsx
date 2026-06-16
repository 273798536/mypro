import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import type { TrendPoint } from '@/types'

interface TrendChartProps {
  data: TrendPoint[]
  onPointClick?: (date: string) => void
}

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: TrendPoint
  onClick?: () => void
}

export default function TrendChart({ data, onPointClick }: TrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const CustomDot = ({ cx, cy, payload }: CustomDotProps) => {
    if (!payload || !cx || !cy) return null

    const isAbnormal = payload.isAbnormal
    const isHovered = hoveredPoint === payload.date

    const handleClick = () => {
      if (onPointClick) {
        onPointClick(payload.date)
      }
    }

    if (isAbnormal) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill="#f5a623"
            className="animate-pulse-slow"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={isHovered ? 7 : 5}
            fill="#e94560"
            stroke="#f5a623"
            strokeWidth={2}
            onClick={handleClick}
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredPoint(payload.date)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        </g>
      )
    }

    return (
      <Dot
        cx={cx}
        cy={cy}
        r={isHovered ? 5 : 3}
        fill="#e94560"
        stroke="#1a1a2e"
        strokeWidth={2}
        className="cursor-pointer transition-all duration-300"
        onClick={handleClick}
        onMouseEnter={() => setHoveredPoint(payload.date)}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    )
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null

    const pointData = data.find(d => d.date === label)
    const count = payload[0].value

    return (
      <div className="bg-caliber-blue border border-fire-orange/30 rounded-lg p-4 shadow-xl">
        <p className="text-fire-white font-medium mb-1">{label}</p>
        <p className="text-fire-orange font-bold text-lg">投诉数量: {count}</p>
        {pointData?.isAbnormal && (
          <p className="text-duplicate-yellow text-sm mt-1 flex items-center gap-1">
            <span className="w-2 h-2 bg-duplicate-yellow rounded-full animate-pulse" />
            异常峰值
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20 h-full">
      <h3 className="text-fire-white text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-fire-orange rounded-full" />
        投诉趋势
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f3460" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#f5f5f0/60"
              tick={{ fill: '#f5f5f0/60', fontSize: 12 }}
              axisLine={{ stroke: '#0f3460' }}
            />
            <YAxis
              stroke="#f5f5f0/60"
              tick={{ fill: '#f5f5f0/60', fontSize: 12 }}
              axisLine={{ stroke: '#0f3460' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#e94560"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
