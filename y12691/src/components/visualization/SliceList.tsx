import { Layers, AlertCircle, FileWarning } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { PointCloudSlice } from '../../types';

export function SliceList() {
  const { slices, selectedSliceId, selectSlice, measurements } = useAppStore();

  const getSliceStats = (slice: PointCloudSlice) => {
    const sliceMeasurements = measurements.filter(m => slice.measurementIds.includes(m.id));
    const outliers = sliceMeasurements.filter(m => m.isOutlier && m.outlierReviewStatus !== 'rejected');
    const pendingReviews = outliers.filter(m => m.outlierReviewStatus === 'pending' || !m.outlierReviewStatus);
    return {
      total: sliceMeasurements.length,
      outliers: outliers.length,
      pending: pendingReviews.length,
    };
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    reviewed: '已复核',
    finalized: '已定稿',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-warning/20 text-warning border-warning/30',
    reviewed: 'bg-info/20 text-info border-info/30',
    finalized: 'bg-success/20 text-success border-success/30',
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <Layers size={18} className="text-ice-blue" />
        <h3 className="font-display text-lg text-gradient">点云切片</h3>
        <span className="ml-auto text-xs text-text-muted">{slices.length} 个切片</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {slices.map(slice => {
          const stats = getSliceStats(slice);
          const isSelected = selectedSliceId === slice.id;

          return (
            <div
              key={slice.id}
              onClick={() => selectSlice(slice.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-ice-blue/20 border border-ice-blue/50 ring-1 ring-ice-blue/30'
                  : 'bg-bg-tertiary/40 border border-transparent hover:bg-bg-tertiary/70 hover:border-ice-blue/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm text-text-primary">{slice.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{slice.id}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[slice.status]}`}>
                  {statusLabels[slice.status]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-bg-primary/40 rounded p-1.5 text-center">
                  <div className="text-text-muted">测点</div>
                  <div className="text-text-primary font-medium">{stats.total}</div>
                </div>
                <div className="bg-danger/10 rounded p-1.5 text-center">
                  <div className="text-danger">离群点</div>
                  <div className="text-danger font-medium">{stats.outliers}</div>
                </div>
                <div className="bg-warning/10 rounded p-1.5 text-center">
                  <div className="text-warning">待复核</div>
                  <div className="text-warning font-medium">{stats.pending}</div>
                </div>
              </div>

              {slice.hasOldAnnotations && (
                <div className="mt-2 flex items-center gap-1 text-xs text-modified bg-modified/10 rounded px-2 py-1">
                  <FileWarning size={12} />
                  <span>含 {slice.oldAnnotations?.length || 0} 条旧版本备注</span>
                </div>
              )}

              {stats.pending > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-warning animate-pulse-slow">
                  <AlertCircle size={12} />
                  <span>有 {stats.pending} 个离群点等待复核</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
