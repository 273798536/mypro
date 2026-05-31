import { Eye, RotateCcw, Grid3x3, Thermometer } from 'lucide-react'
import type { ViewMode } from '@/types'

interface ViewToolbarProps {
  viewMode: ViewMode
  showHeatmap: boolean
  onViewModeChange: (mode: ViewMode) => void
  onToggleHeatmap: () => void
  onResetView: () => void
}

const viewModes: { mode: ViewMode; label: string }[] = [
  { mode: 'free', label: '自由' },
  { mode: 'upperTop', label: '上颌俯视' },
  { mode: 'lowerBottom', label: '下颌仰视' },
  { mode: 'side', label: '侧面' },
]

export default function ViewToolbar({ viewMode, showHeatmap, onViewModeChange, onToggleHeatmap, onResetView }: ViewToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-bg-surface/90 backdrop-blur-sm rounded-xl px-2 py-1.5 border border-mono-dim/20 shadow-lg">
      <div className="flex items-center gap-0.5 pr-2 border-r border-mono-dim/20">
        <Eye className="w-3.5 h-3.5 text-mono-muted mr-1" />
        {viewModes.map(({ mode, label }) => (
          <button
            key={mode}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              viewMode === mode
                ? 'bg-upper/20 text-upper'
                : 'text-mono-muted hover:text-mono hover:bg-bg-elevated'
            }`}
            onClick={() => onViewModeChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
          showHeatmap
            ? 'bg-lower/20 text-lower'
            : 'text-mono-muted hover:text-mono hover:bg-bg-elevated'
        }`}
        onClick={onToggleHeatmap}
      >
        <Thermometer className="w-3.5 h-3.5" />
        热力图
      </button>

      <button
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-mono-muted hover:text-mono hover:bg-bg-elevated transition-colors"
        onClick={onResetView}
      >
        <Grid3x3 className="w-3.5 h-3.5" />
      </button>

      <button
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-mono-muted hover:text-mono hover:bg-bg-elevated transition-colors"
        onClick={onResetView}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
