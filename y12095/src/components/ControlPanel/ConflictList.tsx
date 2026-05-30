import React from 'react';
import { AlertTriangle, Cable, Users, Zap } from 'lucide-react';
import { useStageStore } from '@/store/useStageStore';
import {
  Conflict,
  ConflictType,
  CONFLICT_TYPE_LABELS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '@/types';
import { cn } from '@/utils/cn';

const conflictIcons: Record<ConflictType, React.ReactNode> = {
  cable_crossing: <Cable size={16} />,
  equipment_blocking: <Users size={16} />,
  movement_collision: <Zap size={16} />,
};

interface ConflictCardProps {
  conflict: Conflict;
  isHighlighted: boolean;
  onHighlight: (id: string | null) => void;
}

const ConflictCard: React.FC<ConflictCardProps> = ({
  conflict,
  isHighlighted,
  onHighlight,
}) => {
  return (
    <div
      onClick={() => onHighlight(isHighlighted ? null : conflict.id)}
      className={cn(
        'p-3 rounded cursor-pointer transition-all border',
        isHighlighted
          ? 'bg-gray-700 border-[#e94560]'
          : 'bg-gray-800 border-transparent hover:bg-gray-750 hover:border-gray-600'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="p-1.5 rounded"
          style={{ backgroundColor: SEVERITY_COLORS[conflict.severity] + '33' }}
        >
          <div style={{ color: SEVERITY_COLORS[conflict.severity] }}>
            {conflictIcons[conflict.type]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-300">
              {CONFLICT_TYPE_LABELS[conflict.type]}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: SEVERITY_COLORS[conflict.severity] + '33',
                color: SEVERITY_COLORS[conflict.severity],
              }}
            >
              {SEVERITY_LABELS[conflict.severity]}
            </span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">
            {conflict.description}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            位置: ({conflict.position[0].toFixed(1)}, {conflict.position[2].toFixed(1)})
          </p>
        </div>
      </div>
    </div>
  );
};

export const ConflictList: React.FC = () => {
  const { currentVersion, highlightedConflict, setHighlightedConflict } = useStageStore();

  const conflicts = currentVersion?.conflicts || [];

  const groupedConflicts = {
    critical: conflicts.filter((c) => c.severity === 'critical'),
    error: conflicts.filter((c) => c.severity === 'error'),
    warning: conflicts.filter((c) => c.severity === 'warning'),
  };

  return (
    <div className="p-4 border-b border-gray-700 flex-1 overflow-hidden flex flex-col">
      <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
        <AlertTriangle size={16} />
        冲突检测
        <span className="ml-auto text-xs font-normal text-gray-500">
          共 {conflicts.length} 项
        </span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {Object.entries(groupedConflicts).map(([severity, items]) =>
          items.length > 0 ? (
            <div key={severity} className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {SEVERITY_LABELS[severity as keyof typeof SEVERITY_LABELS]} ({items.length})
              </div>
              <div className="space-y-2">
                {items.map((conflict) => (
                  <ConflictCard
                    key={conflict.id}
                    conflict={conflict}
                    isHighlighted={highlightedConflict === conflict.id}
                    onHighlight={setHighlightedConflict}
                  />
                ))}
              </div>
            </div>
          ) : null
        )}

        {conflicts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无冲突</p>
          </div>
        )}
      </div>
    </div>
  );
};
