import { HeatmapTooltipProps } from '@/types'
import { cn } from '@/lib/utils'

export default function HeatmapTooltip({
  microbeName,
  sampleName,
  abundance,
  relativeAbundance,
  position,
  visible,
}: HeatmapTooltipProps) {
  if (!visible) return null

  const formatAbundance = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K'
    }
    return value.toFixed(2)
  }

  return (
    <div
      className={cn(
        'absolute z-50 pointer-events-none',
        'glass-card px-3 py-2 min-w-[180px]',
        'transition-opacity duration-150'
      )}
      style={{
        left: position.x + 12,
        top: position.y + 12,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-lab-400 text-xs">微生物</span>
          <span className="font-medium text-white">{microbeName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-lab-400 text-xs">样本</span>
          <span className="font-medium text-white">{sampleName}</span>
        </div>
        <div className="h-px bg-white/10 my-1" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-lab-400 text-xs">丰度值</span>
          <span className="font-mono text-teal-400 font-medium">
            {formatAbundance(abundance)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-lab-400 text-xs">相对丰度</span>
          <span className="font-mono text-lab-200">
            {relativeAbundance.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}
