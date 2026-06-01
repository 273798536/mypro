import { X, AlertTriangle } from 'lucide-react';
import { halls, stairways, floors, visitorRecords, dataSources } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function getDensityColor(ratio: number): string {
  if (ratio < 0.5) return '#4CAF50';
  if (ratio < 0.8) return '#FF9800';
  return '#FF5722';
}

export default function DetailPanel() {
  const selectedHall = useMuseumStore((s) => s.selectedHall);
  const selectedStairway = useMuseumStore((s) => s.selectedStairway);
  const setSelectedHall = useMuseumStore((s) => s.setSelectedHall);
  const setSelectedStairway = useMuseumStore((s) => s.setSelectedStairway);
  const showDetailPanel = useMuseumStore((s) => s.showDetailPanel);
  const setShowDetailPanel = useMuseumStore((s) => s.setShowDetailPanel);
  const selectedTimeRange = useMuseumStore((s) => s.selectedTimeRange);
  const validationIssues = useMuseumStore((s) => s.validationIssues);

  if (!showDetailPanel) return null;
  if (!selectedHall && !selectedStairway) return null;

  const handleClose = () => {
    setSelectedHall(null);
    setSelectedStairway(null);
    setShowDetailPanel(false);
  };

  const hall = halls.find((h) => h.id === selectedHall);
  const stairway = stairways.find((s) => s.id === selectedStairway);

  if (hall) {
    const floor = floors.find((f) => f.id === hall.floorId);
    const records = visitorRecords.filter(
      (r) =>
        r.hallId === hall.id &&
        r.timestamp >= selectedTimeRange[0] &&
        r.timestamp <= selectedTimeRange[1]
    );
    const count = records.reduce((sum, r) => sum + r.count, 0);
    const ratio = count / hall.capacity;
    const sources = dataSources.filter((ds) => records.some((r) => r.source === ds.systemName));
    const issues = validationIssues.filter((v) => v.affectedHalls.includes(hall.id));

    return (
      <div className="absolute top-4 right-4 w-72 bg-[#0F1923]/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 z-10">
        <button onClick={handleClose} className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-3 text-xs">
          <div className="text-sm font-semibold text-white">{hall.name}</div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/60">
            <span>楼层</span><span className="text-white/90">{floor?.name ?? hall.floorId}</span>
            <span>类型</span><span className="text-white/90">{hall.type === 'permanent' ? '常设展' : '临时展'}</span>
            <span>容量</span><span className="text-white/90">{hall.capacity}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-white/60">
              <span>当前客流</span>
              <span className="text-white/90">{count} 人</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: getDensityColor(ratio) }}
              />
            </div>
            <div className="text-right text-[10px]" style={{ color: getDensityColor(ratio) }}>
              密度比 {(ratio * 100).toFixed(1)}%
            </div>
          </div>

          {sources.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-white/60">数据来源</div>
              {sources.map((ds) => (
                <div key={ds.id} className="text-white/40 text-[10px]">{ds.systemName} ({ds.version})</div>
              ))}
            </div>
          )}

          {issues.length > 0 && (
            <div className="space-y-1">
              <div className="text-white/60">校验问题</div>
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-1">
                  <AlertTriangle className={`w-3 h-3 shrink-0 mt-0.5 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="text-[10px] text-white/50">{issue.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stairway) {
    const fromFloor = floors.find((f) => f.id === stairway.fromFloorId);
    const toFloor = floors.find((f) => f.id === stairway.toFloorId);
    const issues = validationIssues.filter((v) => v.relatedObjectId === stairway.id);

    return (
      <div className="absolute top-4 right-4 w-72 bg-[#0F1923]/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 z-10">
        <button onClick={handleClose} className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-3 text-xs">
          <div className="text-sm font-semibold text-white">{stairway.name}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/60">
            <span>起始层</span><span className="text-white/90">{fromFloor?.name ?? stairway.fromFloorId}</span>
            <span>目标层</span><span className="text-white/90">{toFloor?.name ?? stairway.toFloorId}</span>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1">
              <div className="text-white/60">校验问题</div>
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-1">
                  <AlertTriangle className={`w-3 h-3 shrink-0 mt-0.5 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="text-[10px] text-white/50">{issue.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
