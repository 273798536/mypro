import { cn } from '@/lib/utils'

interface CompletenessRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

function getColor(score: number) {
  if (score >= 90) return { stroke: '#10b981', text: 'text-emerald-600' }
  if (score >= 60) return { stroke: '#f59e0b', text: 'text-amber-600' }
  return { stroke: '#ef4444', text: 'text-red-600' }
}

export default function CompletenessRing({ score, size = 120, strokeWidth = 10 }: CompletenessRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span
        className={cn('absolute text-xl font-bold', color.text)}
      >
        {score}%
      </span>
    </div>
  )
}
