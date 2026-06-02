import { cn } from '@/lib/utils'
import type { PresetParameter, SnapshotParameter, VersionDiff } from '@/types'

interface ParameterCardProps {
  parameter: PresetParameter | SnapshotParameter | VersionDiff
  showDiff?: boolean
  className?: string
}

export default function ParameterCard({
  parameter,
  showDiff = false,
  className,
}: ParameterCardProps) {
  const isOutOfBounds =
    'isOutOfBounds' in parameter ? parameter.isOutOfBounds : false
  const boundsStatus =
    'boundsStatus' in parameter ? parameter.boundsStatus : 'normal'

  const hasDiff = 'difference' in parameter && parameter.difference !== 0
  const isModified = 'isModified' in parameter ? parameter.isModified : false

  const value = 'value' in parameter ? parameter.value : parameter.comparedValue
  const minValue = 'minValue' in parameter ? parameter.minValue : 0
  const maxValue = 'maxValue' in parameter ? parameter.maxValue : 100

  const paramName = 'name' in parameter ? parameter.name : parameter.parameterName
  const paramPath = 'path' in parameter ? parameter.path : parameter.parameterPath

  const displayValue =
    value !== undefined && value !== null ? value.toFixed(2) : '-'
  const unit = 'unit' in parameter ? parameter.unit : ''

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        isOutOfBounds
          ? 'border-destructive/30 bg-destructive/10'
          : hasDiff || isModified
          ? 'border-warning/30 bg-warning/10'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{paramName}</h4>
            {isOutOfBounds && (
              <span className="text-xs font-medium text-destructive">
                {boundsStatus === 'below_min' ? '低于下限' : '高于上限'}
              </span>
            )}
            {!isOutOfBounds && (hasDiff || isModified) && (
              <span className="text-xs font-medium text-warning">已修改</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{paramPath}</p>
        </div>

        <div className="text-right">
          <div
            className={cn(
              'text-lg font-semibold',
              isOutOfBounds
                ? 'text-destructive'
                : hasDiff || isModified
                ? 'text-warning'
                : 'text-foreground'
            )}
          >
            {displayValue}
            {unit && <span className="ml-0.5 text-sm font-normal">{unit}</span>}
          </div>
          {showDiff && 'baselineValue' in parameter && (
            <div className="text-xs text-muted-foreground">
              基准: {parameter.baselineValue.toFixed(2)}
              {parameter.difference !== undefined && (
                <span
                  className={cn(
                    'ml-1',
                    parameter.difference > 0 ? 'text-red-500' : 'text-green-500'
                  )}
                >
                  ({parameter.difference > 0 ? '+' : ''}
                  {parameter.difference.toFixed(2)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minValue}</span>
          <span>{maxValue}</span>
        </div>
        <div className="relative mt-1 h-2 rounded-full bg-accent">
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full',
              isOutOfBounds
                ? 'bg-red-500'
                : hasDiff || isModified
                ? 'bg-amber-500'
                : 'bg-indigo-500'
            )}
            style={{
              width: `${Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100))}%`,
            }}
          />
          <div
            className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-muted-foreground/70"
            style={{
              left: `${Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100))}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
