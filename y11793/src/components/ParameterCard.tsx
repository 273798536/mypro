import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ParameterCardProps {
  name: string
  value: number
  lowerBound: number
  upperBound: number
  stdError: number
  isWithinBound: boolean
  unit: string
  className?: string
}

export default function ParameterCard({
  name,
  value,
  lowerBound,
  upperBound,
  stdError,
  isWithinBound,
  unit,
  className,
}: ParameterCardProps) {
  const paramLabels: Record<string, string> = {
    ocv: '开路电压 (OCV)',
    R0: '欧姆内阻 (R₀)',
    R1: '极化内阻 (R₁)',
    C1: '极化电容 (C₁)',
  }

  const displayName = paramLabels[name] || name
  const deviationPercent = ((value - lowerBound) / (upperBound - lowerBound)) * 100

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all duration-300',
        isWithinBound
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
          : 'bg-red-950/30 border-red-500/70 hover:border-red-400',
        className
      )}
    >
      <div className="absolute top-3 right-3 group">
        <Info className="w-4 h-4 text-gray-500 cursor-help" />
        <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
          <div className="text-sm font-medium text-gray-200 mb-2">{displayName}</div>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>参数标识:</span>
              <span className="text-gray-300 font-mono">{name}</span>
            </div>
            <div className="flex justify-between">
              <span>当前值:</span>
              <span className="text-gray-300 font-mono">
                {value.toExponential(4)} {unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span>标准误差:</span>
              <span className="text-gray-300 font-mono">
                ±{stdError.toExponential(2)} {unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span>边界范围:</span>
              <span className="text-gray-300 font-mono">
                [{lowerBound.toExponential(2)}, {upperBound.toExponential(2)}] {unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span>边界内位置:</span>
              <span className="text-gray-300 font-mono">{deviationPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>越界状态:</span>
              <span className={cn('font-medium', isWithinBound ? 'text-emerald-400' : 'text-red-400')}>
                {isWithinBound ? '正常' : '越界'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-3">
        {!isWithinBound && (
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
        )}
        <div>
          <div className="text-sm font-medium text-gray-300">{displayName}</div>
          <div className="text-xs text-gray-500 font-mono">{name}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono',
              isWithinBound ? 'text-gray-100' : 'text-red-400'
            )}
          >
            {value.toExponential(4)}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          ±{stdError.toExponential(2)} {unit}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {lowerBound.toExponential(2)} {unit}
          </span>
          <span className={cn('font-medium', isWithinBound ? 'text-emerald-400' : 'text-red-400')}>
            {isWithinBound ? '边界内' : '越界'}
          </span>
          <span className="text-gray-500">
            {upperBound.toExponential(2)} {unit}
          </span>
        </div>

        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute top-0 h-full rounded-full transition-all duration-500',
              isWithinBound ? 'bg-emerald-500' : 'bg-red-500'
            )}
            style={{
              left: '0%',
              width: `${Math.min(Math.max(deviationPercent, 0), 100)}%`,
            }}
          />
          <div
            className="absolute top-0 w-0.5 h-full bg-white/80 transform -translate-x-1/2"
            style={{ left: `${Math.min(Math.max(deviationPercent, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
