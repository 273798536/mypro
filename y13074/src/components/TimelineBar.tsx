import { useAppStore } from '../store/useAppStore';
import { Clock } from 'lucide-react';

export default function TimelineBar() {
  const segments = useAppStore((s) => s.timelineSegments);
  const selectedId = useAppStore((s) => s.selectedTimelineId);
  const setSelected = useAppStore((s) => s.setSelectedTimeline);
  const getCommentsByTimeline = useAppStore((s) => s.getCommentsByTimeline);
  const comments = useAppStore((s) => s.comments);

  const total = comments.length;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700">项目阶段时间轴</span>
        <span className="text-xs text-slate-400 ml-2">
          共 {total} 条评审批注，点击阶段筛选
        </span>
      </div>

      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
        <div className="flex items-start justify-between relative z-10">
          {segments.map((seg, idx) => {
            const count = getCommentsByTimeline(seg.id).length;
            const isActive = selectedId === seg.id;
            return (
              <div
                key={seg.id}
                className="flex-1 flex flex-col items-center cursor-pointer group"
                onClick={() => setSelected(isActive ? null : seg.id)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600 scale-110'
                      : 'bg-white text-slate-500 border-slate-300 group-hover:border-primary-400 group-hover:text-primary-600'
                  }`}
                >
                  {seg.order}
                </div>
                <div
                  className={`mt-2 text-center ${
                    isActive ? 'text-primary-700' : 'text-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium">{seg.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {seg.description}
                  </div>
                  <div
                    className={`mt-1 inline-block px-2 py-0.5 rounded text-xs ${
                      count > 0
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {count} 条
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
