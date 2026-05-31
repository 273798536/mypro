import { MapPin, Ruler, Scale, Route, Clock, ChevronRight } from 'lucide-react';
import { GameSession, OperationRecord, OperationType } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { calculateTrigonometry, getUnitLabel } from '@/utils/geometry';
import { cn } from '@/lib/utils';

interface OperationTimelineProps {
  session: GameSession;
  highlightOperationId?: string | null;
  onOperationClick?: (operationId: string) => void;
}

const operationConfig: Record<OperationType, { icon: typeof MapPin; label: string; color: string }> = {
  point_select: {
    icon: MapPin,
    label: '选择测绘点',
    color: 'text-[#0F3460]',
  },
  angle_measure: {
    icon: Ruler,
    label: '角度测量',
    color: 'text-[#16C79A]',
  },
  distance_input: {
    icon: Scale,
    label: '距离输入',
    color: 'text-[#f59e0b]',
  },
  path_draw: {
    icon: Route,
    label: '路径绘制',
    color: 'text-[#E94560]',
  },
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function OperationCard({
  operation,
  session,
  isHighlighted,
  onClick,
}: {
  operation: OperationRecord;
  session: GameSession;
  isHighlighted: boolean;
  onClick?: () => void;
}) {
  const config = operationConfig[operation.type];
  const Icon = config.icon;
  const point = operation.surveyPointId
    ? session.surveyPoints.find((p) => p.id === operation.surveyPointId)
    : null;

  const renderOperationDetail = () => {
    switch (operation.type) {
      case 'point_select':
        return (
          <div className="text-sm text-[#2C3E50]/70">
            {point?.name || '未知点'}
          </div>
        );
      case 'angle_measure': {
        const angle = operation.data.angle ?? 0;
        const trig = calculateTrigonometry(angle);
        const refPoint = operation.data.referencePoint
          ? session.surveyPoints.find((p) => p.id === operation.data.referencePoint)
          : null;
        return (
          <div className="space-y-1">
            <div className="text-sm text-[#2C3E50]/70">
              {point?.name} → {refPoint?.name}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-[#16C79A]">
                {angle.toFixed(1)}°
              </span>
              <span className="text-[#2C3E50]/50">
                sin:{trig.sin.toFixed(3)} cos:{trig.cos.toFixed(3)}
              </span>
            </div>
          </div>
        );
      }
      case 'distance_input': {
        const distance = operation.data.distance ?? 0;
        const unit = operation.data.unit ?? 'm';
        return (
          <div className="space-y-1">
            <div className="text-sm text-[#2C3E50]/70">
              {point?.name}
            </div>
            <div className="font-mono font-bold text-[#f59e0b]">
              {distance} {unit} ({getUnitLabel(unit)})
            </div>
          </div>
        );
      }
      case 'path_draw': {
        const fromPoint = operation.data.fromPoint
          ? session.surveyPoints.find((p) => p.id === operation.data.fromPoint)
          : null;
        const toPoint = operation.data.toPoint
          ? session.surveyPoints.find((p) => p.id === operation.data.toPoint)
          : null;
        const pathPoints = operation.data.pathPoints ?? [];
        return (
          <div className="space-y-1">
            <div className="text-sm text-[#2C3E50]/70">
              {fromPoint?.name} → {toPoint?.name}
            </div>
            <div className="text-xs text-[#2C3E50]/50">
              路径共 {pathPoints.length} 个点
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'relative pl-8 pb-6 last:pb-0 cursor-pointer transition-all duration-200',
        isHighlighted && 'bg-[#FFD93D]/10 -mx-2 px-2 py-1 rounded-lg'
      )}
      onClick={onClick}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0F3460]/20">
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white transition-all duration-200',
            isHighlighted
              ? 'bg-[#FFD93D] scale-125 shadow-lg shadow-[#FFD93D]/30'
              : 'bg-[#0F3460]'
          )}
          style={{ top: '4px' }}
        />
      </div>

      <div
        className={cn(
          'bg-white border rounded-lg p-3 transition-all duration-200 hover:shadow-md',
          isHighlighted
            ? 'border-[#FFD93D] shadow-md'
            : 'border-[#0F3460]/10'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={14} className={config.color} />
            <span className="font-medium text-sm text-[#2C3E50]">
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#2C3E50]/40">
            <Clock size={12} />
            <span>{formatTime(operation.timestamp)}</span>
          </div>
        </div>

        {renderOperationDetail()}

        {onClick && (
          <div className="mt-2 pt-2 border-t border-[#0F3460]/5 flex items-center justify-end">
            <span className="text-xs text-[#0F3460] flex items-center gap-1">
              在地图上定位 <ChevronRight size={12} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OperationTimeline({
  session,
  highlightOperationId,
  onOperationClick,
}: OperationTimelineProps) {
  const { setHighlightOperation } = useGameStore();
  const operations = [...session.operations].sort((a, b) => a.timestamp - b.timestamp);

  const groupedOperations = operations.reduce((groups, op) => {
    const pointId = op.surveyPointId || op.data.fromPoint || 'general';
    if (!groups[pointId]) {
      groups[pointId] = [];
    }
    groups[pointId].push(op);
    return groups;
  }, {} as Record<string, OperationRecord[]>);

  const handleClick = (operationId: string) => {
    setHighlightOperation(operationId);
    onOperationClick?.(operationId);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#0F3460]/10 rounded-lg">
          <Clock size={20} className="text-[#0F3460]" />
        </div>
        <div>
          <h3 className="font-bold text-[#0F3460] text-lg">操作时间线</h3>
          <p className="text-sm text-[#2C3E50]/60">
            共 {operations.length} 条操作记录
          </p>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="text-center py-12 text-[#2C3E50]/50">
          <Clock size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">暂无操作记录</p>
          <p className="text-sm">开始测绘后，操作将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {Object.entries(groupedOperations).map(([pointId, ops]) => {
            const point = session.surveyPoints.find((p) => p.id === pointId);
            return (
              <div key={pointId}>
                {point && (
                  <div className="flex items-center gap-2 mb-3 ml-1">
                    <div className="w-2 h-2 rounded-full bg-[#0F3460]" />
                    <span className="font-semibold text-sm text-[#0F3460]">
                      {point.name}
                    </span>
                  </div>
                )}
                <div>
                  {ops.map((op) => (
                    <OperationCard
                      key={op.id}
                      operation={op}
                      session={session}
                      isHighlighted={highlightOperationId === op.id}
                      onClick={() => handleClick(op.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
