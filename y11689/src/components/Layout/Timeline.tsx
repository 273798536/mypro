import { Play, Pause, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import { Milestone } from '../../types';

export const Timeline = () => {
  const project = useProjectStore((state) => state.project);
  const milestones = useProjectStore((state) => state.milestones);
  
  const timeSlice = useViewStore((state) => state.timeSlice);
  const setTimeSlice = useViewStore((state) => state.setTimeSlice);
  const isPlaying = useViewStore((state) => state.isPlaying);
  const togglePlay = useViewStore((state) => state.togglePlay);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getMilestonePosition = (milestone: Milestone): number => {
    if (!project) return 0;
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const milestoneTime = new Date(milestone.plannedDate).getTime();
    return (milestoneTime - start) / (end - start);
  };

  const getMilestoneColor = (status: Milestone['status']): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'delayed':
        return 'bg-red-500';
      case 'at_risk':
        return 'bg-orange-500';
      default:
        return 'bg-slate-500';
    }
  };

  const currentDate = new Date(project?.startDate || '2024-01-01');
  if (project) {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    currentDate.setTime(start + (end - start) * timeSlice);
  }

  return (
    <div className="h-20 bg-slate-900/60 backdrop-blur-xl border-t border-slate-700/50 px-4 py-2">
      <div className="h-full flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-slate-400" />
            ) : (
              <Play className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setTimeSlice(Math.max(0, timeSlice - 0.01))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setTimeSlice(Math.min(1, timeSlice + 0.01))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1">
          <div className="relative h-8 flex items-center">
            <div className="absolute left-0 right-0 h-1 bg-slate-700 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${timeSlice * 100}%` }}
              />
            </div>

            {milestones.map((milestone) => {
              const position = getMilestonePosition(milestone);
              return (
                <div
                  key={milestone.id}
                  className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${position * 100}%` }}
                  title={`${milestone.name} - ${milestone.plannedDate}`}
                >
                  <div className={`w-3 h-3 rounded-full ${getMilestoneColor(milestone.status)} border-2 border-slate-900 shadow-lg`} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="font-medium">{milestone.name}</p>
                    <p className="text-slate-400">{formatDate(milestone.plannedDate)}</p>
                  </div>
                </div>
              );
            })}

            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-full"
              style={{ left: `${timeSlice * 100}%` }}
            />
          </div>

          <div className="flex justify-between mt-1 text-xs text-slate-500">
            {project && (
              <>
                <span>{formatDate(project.startDate)}</span>
                <span className="text-blue-400 font-medium">
                  {currentDate.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}
                </span>
              </>
            )}
            {project && <span>{formatDate(project.endDate)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">预算</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs text-slate-400">支出</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400">收入</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
          <Flag className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">
            里程碑 {milestones.filter((m) => m.status === 'completed').length}/{milestones.length}
          </span>
        </div>
      </div>
    </div>
  );
};
