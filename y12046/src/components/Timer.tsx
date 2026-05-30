import { cn } from '@/lib/utils'

interface TimerProps {
  timeRemaining: number
  timeLimit: number
  timerActive: boolean
}

export default function Timer({ timeRemaining, timeLimit, timerActive }: TimerProps) {
  const radius = 40
  const strokeWidth = 5
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const progress = timeLimit > 0 ? timeRemaining / timeLimit : 0
  const strokeDashoffset = circumference * (1 - progress)
  const isUrgent = timeRemaining <= 5 && timeRemaining > 0
  const isOut = timeRemaining <= 0

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={radius * 2}
        height={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-ink-700"
        />
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-1000 ease-linear',
            isOut && 'text-ink-500',
            isUrgent && timerActive && 'text-danger animate-flash-red',
            !isUrgent && !isOut && 'text-amber',
            isUrgent && !timerActive && 'text-danger'
          )}
          style={{ stroke: isUrgent || isOut ? undefined : undefined }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-mono text-2xl font-bold tabular-nums',
            isUrgent && 'text-danger',
            isOut && 'text-ink-500',
            !isUrgent && !isOut && 'text-parchment-100'
          )}
        >
          {timeRemaining}
        </span>
        <span className="text-ink-400 text-[10px] uppercase tracking-widest">
          秒
        </span>
      </div>
    </div>
  )
}
