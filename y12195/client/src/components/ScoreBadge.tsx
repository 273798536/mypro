import React from 'react'

interface ScoreBadgeProps {
  score: number
  level: string
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, level }) => {
  const getColor = (score: number) => {
    if (score >= 60) return '#dc2626'
    if (score >= 35) return '#f59e0b'
    return '#16a34a'
  }

  const color = getColor(score)
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span
        className="mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {level}
      </span>
    </div>
  )
}

export default ScoreBadge
