import type { DataPoint } from '../types';

interface HoverTooltipProps {
  point: DataPoint | null;
  colorScale: (label: string) => string;
}

export function HoverTooltip({ point, colorScale }: HoverTooltipProps) {
  if (!point) return null;
  
  const labelColor = colorScale(point.trueLabel);
  
  return (
    <div className="fixed pointer-events-none z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-2xl"
      style={{
        transform: 'translate(15px, 15px)',
        maxWidth: '280px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: labelColor, boxShadow: `0 0 8px ${labelColor}` }} />
        <span className="text-white font-semibold">{point.trueLabel}</span>
        {point.predictedLabel && point.predictedLabel !== point.trueLabel && (
          <span className="text-red-400">→ {point.predictedLabel}</span>
        )}
      </div>
      <div className="text-gray-400 text-[11px] space-y-0.5">
        <div>ID: <span className="text-gray-300">{point.id}</span></div>
        <div>分组: <span className="text-gray-300">{point.group}</span></div>
        <div className="flex items-center gap-2">
          置信度: 
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${point.confidence * 100}%`,
                background: `linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)`
              }}
            />
          </div>
          <span className="text-gray-300 w-10 text-right">{(point.confidence * 100).toFixed(0)}%</span>
        </div>
        {point.confidenceUpdatedAt && (
          <div className="text-amber-400">✓ 置信度已补录</div>
        )}
        {point.isOccluded && (
          <div className="text-orange-400">⚠ {point.occlusionReason || '被遮挡'}</div>
        )}
      </div>
    </div>
  );
}
