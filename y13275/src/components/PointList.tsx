import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import StatusBadge from './StatusBadge';
import { getRelativeTime } from '@/utils/format';

export default function PointList() {
  const {
    points,
    selectedPointId,
    setSelectedPointId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getFilteredPoints,
  } = useFirePointStore();

  const filteredPoints = getFilteredPoints();

  const statusOptions = [
    { value: 'all', label: '全部' },
    { value: 'abnormal', label: '有异常' },
    { value: 'pending', label: '待归并' },
    { value: 'merged', label: '已归并' },
  ];

  const abnormalCount = points.filter((p) => p.status === 'abnormal').length;

  return (
    <div className="flex flex-col h-full bg-surface border-r border-primary-100">
      <div className="p-4 border-b border-primary-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-primary">
            消防点位列表
          </h2>
          {abnormalCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 bg-accent-500 text-white text-xs font-bold rounded-full animate-pulse-dot">
              {abnormalCount}
            </span>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索点位名称、地址..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-secondary border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as any)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-all',
                statusFilter === opt.value
                  ? 'bg-primary-800 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-primary-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredPoints.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            暂无匹配的点位
          </div>
        ) : (
          filteredPoints.map((point, index) => (
            <div
              key={point.id}
              onClick={() => setSelectedPointId(point.id)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all duration-200 opacity-0 animate-fade-in-stagger',
                selectedPointId === point.id
                  ? 'bg-primary-50 border-2 border-primary-400 shadow-card'
                  : 'bg-surface border border-transparent hover:bg-surface-secondary hover:shadow-card'
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span className="font-mono text-xs font-semibold text-primary-700 flex-shrink-0">
                    {point.id}
                  </span>
                </div>
                <StatusBadge status={point.status} />
              </div>

              <h3 className="font-medium text-text-primary text-sm mb-1 truncate">
                {point.name}
              </h3>

              <p className="text-xs text-text-muted mb-2 line-clamp-1">
                {point.address}
              </p>

              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-mono">{getRelativeTime(point.updatedAt)}</span>
                {point.remark && (
                  <span className="text-primary-600 truncate max-w-[120px]">
                    有备注
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
