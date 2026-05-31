import { useFeedbackStore } from '../store/useFeedbackStore';
import { SeatPosition } from '../types';

interface SeatHeatmapProps {
  onAreaClick?: (areaId: string) => void;
}

export function SeatHeatmap({ onAreaClick }: SeatHeatmapProps) {
  const { seatAreas, getAreaFeedbackStats } = useFeedbackStore();
  const stats = getAreaFeedbackStats();

  const getHeatColor = (count: number, maxCount: number) => {
    if (maxCount === 0) return 'bg-slate-200';
    const ratio = count / maxCount;
    if (ratio === 0) return 'bg-slate-200';
    if (ratio < 0.3) return 'bg-green-200';
    if (ratio < 0.6) return 'bg-yellow-300';
    if (ratio < 0.8) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const maxCount = Math.max(...stats.map(s => s.feedbackCount), 1);

  const getAreaPosition = (position: SeatPosition) => {
    switch (position) {
      case 'front': return { x: 50, y: 20 };
      case 'middle': return { x: 50, y: 45 };
      case 'back': return { x: 50, y: 70 };
      case 'left': return { x: 20, y: 45 };
      case 'right': return { x: 80, y: 45 };
      default: return { x: 50, y: 50 };
    }
  };

  const getAreaSize = (position: SeatPosition) => {
    if (position === 'front') return { width: 40, height: 15 };
    if (position === 'middle') return { width: 50, height: 18 };
    if (position === 'back') return { width: 60, height: 20 };
    return { width: 15, height: 35 };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">座位区域热力图</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200"></div>
            <span className="text-slate-600">无反馈</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-200"></div>
            <span className="text-slate-600">少量</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-300"></div>
            <span className="text-slate-600">中等</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-400"></div>
            <span className="text-slate-600">较多</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-slate-600">严重</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-80 bg-slate-50 rounded-lg overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded flex items-center justify-center">
          <span className="text-white text-xs font-medium">舞台</span>
        </div>

        {seatAreas.map((area) => {
          const areaStat = stats.find(s => s.areaId === area.id);
          const count = areaStat?.feedbackCount || 0;
          const pos = getAreaPosition(area.position);
          const size = getAreaSize(area.position);
          const color = getHeatColor(count, maxCount);

          return (
            <div
              key={area.id}
              className={`absolute ${color} rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${size.width}%`,
                height: `${size.height}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onAreaClick?.(area.id)}
            >
              <span className="text-sm font-semibold text-slate-700">{area.name}</span>
              <span className="text-xs text-slate-600 mt-1">{count} 条反馈</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
