import { useState } from 'react';
import { AlertTriangle, MapPin, ChevronDown, ChevronRight, Filter, Zap } from 'lucide-react';
import { useComplaintStore } from '../../store/useComplaintStore';
import { statusLabels, sourceLabels } from '../../types';
import type { ComplaintStatus, ComplaintPoint } from '../../types';
import { cn } from '../../lib/utils';

const statusColors: Record<ComplaintStatus, string> = {
  normal: 'bg-emerald-500',
  overload: 'bg-orange-500',
  pending: 'bg-yellow-500',
  confirmed: 'bg-sky-500',
};

const statusBorderColors: Record<ComplaintStatus, string> = {
  normal: 'border-emerald-500/30 hover:border-emerald-500/60',
  overload: 'border-orange-500/50 hover:border-orange-500/80',
  pending: 'border-yellow-500/30 hover:border-yellow-500/60',
  confirmed: 'border-sky-500/30 hover:border-sky-500/60',
};

const statusBgColors: Record<ComplaintStatus, string> = {
  normal: 'bg-emerald-500/10',
  overload: 'bg-orange-500/10',
  pending: 'bg-yellow-500/10',
  confirmed: 'bg-sky-500/10',
};

interface PointGroupProps {
  title: string;
  points: ComplaintPoint[];
  status: ComplaintStatus;
  selectedPointId: string | null;
  onSelect: (id: string) => void;
  defaultExpanded?: boolean;
  accentColor?: string;
}

function PointGroup({
  title,
  points,
  status,
  selectedPointId,
  onSelect,
  defaultExpanded = true,
}: PointGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (points.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg',
          'bg-slate-800/50 hover:bg-slate-800 transition-colors',
          'border border-slate-700/50'
        )}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className={cn('w-2 h-2 rounded-full', statusColors[status])} />
          <span className="text-sm font-medium text-slate-200">{title}</span>
          <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
            {points.length}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2">
          {points.map((point) => (
            <div
              key={point.id}
              onClick={() => onSelect(point.id)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all duration-200',
                'border backdrop-blur-sm',
                statusBorderColors[status],
                statusBgColors[status],
                selectedPointId === point.id
                  ? 'ring-2 ring-sky-500/50 border-sky-500/50 scale-[1.02]'
                  : 'hover:scale-[1.01] hover:shadow-lg'
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {point.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    来源: {sourceLabels[point.source]}
                  </div>
                  {point.capacity && point.actualLoad && (
                    <div className="text-xs text-slate-500 mt-1">
                      {point.actualLoad} / {point.capacity} 人/时
                      {point.status === 'overload' && (
                        <span className="ml-2 text-orange-400 font-medium">
                          超限 {Math.round(((point.actualLoad - point.capacity) / point.capacity) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {point.address && (
                <div className="text-xs text-slate-500 mt-2 pl-6 truncate">
                  {point.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PointList() {
  const {
    getFilteredPoints,
    selectedPointId,
    selectPoint,
    showOnlyOverload,
    toggleOverloadFilter,
    filterStatus,
    setFilterStatus,
  } = useComplaintStore();

  const allPoints = getFilteredPoints();
  
  const overloadPoints = allPoints.filter((p) => p.status === 'overload');
  const pendingPoints = allPoints.filter((p) => p.status === 'pending');
  const confirmedPoints = allPoints.filter((p) => p.status === 'confirmed');
  const normalPoints = allPoints.filter((p) => p.status === 'normal');

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-400" />
          投诉点位列
          <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {allPoints.length} 条
          </span>
        </h2>
      </div>

      <div className="p-3 border-b border-slate-700/50 space-y-2">
        <button
          onClick={toggleOverloadFilter}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
            showOnlyOverload
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="flex-1 text-left">容量超限单独拎出</span>
          <Zap className={cn('w-4 h-4', showOnlyOverload ? 'text-orange-400' : 'text-slate-500')} />
        </button>

        {!showOnlyOverload && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ComplaintStatus | 'all')}
              className="flex-1 bg-slate-800/50 text-slate-300 text-xs px-2 py-1.5 rounded-md border border-slate-700/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            >
              <option value="all">全部状态</option>
              <option value="normal">正常</option>
              <option value="overload">容量超限</option>
              <option value="pending">待确认</option>
              <option value="confirmed">已确认</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {showOnlyOverload ? (
          <>
            {overloadPoints.length > 0 ? (
              <PointGroup
                title="容量超限"
                points={overloadPoints}
                status="overload"
                selectedPointId={selectedPointId}
                onSelect={selectPoint}
                defaultExpanded={true}
              />
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                暂无超限记录
              </div>
            )}
          </>
        ) : (
          <>
            <PointGroup
              title="容量超限"
              points={overloadPoints}
              status="overload"
              selectedPointId={selectedPointId}
              onSelect={selectPoint}
              defaultExpanded={true}
            />
            <PointGroup
              title="待确认"
              points={pendingPoints}
              status="pending"
              selectedPointId={selectedPointId}
              onSelect={selectPoint}
              defaultExpanded={true}
            />
            <PointGroup
              title="已确认"
              points={confirmedPoints}
              status="confirmed"
              selectedPointId={selectedPointId}
              onSelect={selectPoint}
              defaultExpanded={false}
            />
            <PointGroup
              title="正常"
              points={normalPoints}
              status="normal"
              selectedPointId={selectedPointId}
              onSelect={selectPoint}
              defaultExpanded={false}
            />
          </>
        )}
      </div>

      <div className="p-3 border-t border-slate-700/50 text-xs text-slate-500 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <span>总点位: {allPoints.length}</span>
          <span className="text-orange-400">超限: {overloadPoints.length}</span>
        </div>
      </div>
    </div>
  );
}
