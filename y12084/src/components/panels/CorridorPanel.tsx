import { useAppStore } from '@/store/useAppStore';
import { WindCorridor } from '@/types';
import { Wind, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function CorridorPanel() {
  const corridors = useAppStore(state => state.corridors);
  const activeCorridorIds = useAppStore(state => state.activeCorridorIds);
  const conflicts = useAppStore(state => state.conflicts);
  const { toggleCorridor } = useAppStore(state => state.actions);
  const [expanded, setExpanded] = useState(true);

  const getCorridorGaps = (corridor: WindCorridor) => {
    return conflicts.filter(c =>
      c.type === 'wind_gap' &&
      c.details.corridorId === corridor.id &&
      !c.resolved
    ).length;
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wind size={18} className="text-cyan-400" />
          <span className="text-sm font-medium text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            风廊高亮
          </span>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
            {activeCorridorIds.length}/{corridors.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 max-h-64 overflow-y-auto">
          {corridors.map(corridor => {
            const isActive = activeCorridorIds.includes(corridor.id);
            const gaps = getCorridorGaps(corridor);

            return (
              <div
                key={corridor.id}
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isActive
                    ? 'border-cyan-500/50 bg-slate-800/80'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                }`}
                onClick={() => toggleCorridor(corridor.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: corridor.color, boxShadow: isActive ? `0 0 8px ${corridor.color}` : 'none' }}
                    />
                    <span className="text-sm text-white font-medium">{corridor.name}</span>
                  </div>
                  {isActive ? (
                    <Eye size={14} className="text-cyan-400" />
                  ) : (
                    <EyeOff size={14} className="text-slate-500" />
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                  {corridor.description}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <span className={`${getPriorityColor(corridor.priority)}`}>
                    优先级: {getPriorityLabel(corridor.priority)}
                  </span>
                  {gaps > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                      {gaps}处缺口
                    </span>
                  )}
                </div>

                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(corridor.width / 40) * 100}%`,
                      backgroundColor: corridor.color
                    }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-slate-500">
                  宽度: {corridor.width}m
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
