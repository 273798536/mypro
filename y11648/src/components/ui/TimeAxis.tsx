import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const TimeAxis = () => {
  const { currentTime, startTime, endTime, tideWindows, tasks } = useGameStore();

  const totalDuration = endTime - startTime;
  const progress = ((currentTime - startTime) / totalDuration) * 100;

  const timeMarkers = useMemo(() => {
    const markers = [];
    const interval = 60 * 60 * 1000;
    for (let t = startTime; t <= endTime; t += interval) {
      markers.push(t);
    }
    return markers;
  }, [startTime, endTime]);

  const getTideWindowPosition = (window: { startTime: number; endTime: number }) => {
    const left = ((window.startTime - startTime) / totalDuration) * 100;
    const width = ((window.endTime - window.startTime) / totalDuration) * 100;
    return { left: Math.max(0, left), width: Math.min(100 - left, width) };
  };

  const getTaskPosition = (task: { scheduledTime: number; estimatedDuration: number }) => {
    const left = ((task.scheduledTime - startTime) / totalDuration) * 100;
    const width = (task.estimatedDuration / totalDuration) * 100;
    return { left: Math.max(0, left), width: Math.min(100 - left, width) };
  };

  const taskStatusColors: Record<string, string> = {
    pending: '#64748b',
    in_progress: '#f59e0b',
    completed: '#10b981',
    failed: '#ef4444',
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">时间轴</h3>
        <div className="text-sm text-slate-400">
          当前时间: <span className="text-amber-400 font-mono">{format(currentTime, 'HH:mm', { locale: zhCN })}</span>
        </div>
      </div>

      <div className="relative h-32">
        <div className="absolute top-0 left-0 right-0 h-8 flex items-end">
          {timeMarkers.map((time, index) => (
            <div
              key={index}
              className="absolute flex flex-col items-center"
              style={{ left: `${((time - startTime) / totalDuration) * 100}%` }}
            >
              <div className="w-px h-2 bg-slate-600"></div>
              <span className="text-[10px] text-slate-500 mt-1">
                {format(time, 'HH:mm', { locale: zhCN })}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute top-10 left-0 right-0 h-6 bg-slate-700/50 rounded overflow-hidden">
          {tideWindows.map((window) => {
            const pos = getTideWindowPosition(window);
            return (
              <motion.div
                key={window.id}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                className={`absolute top-0 h-full ${
                  window.type === 'high' ? 'bg-cyan-500/40' : 'bg-blue-600/40'
                }`}
                style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                title={`${window.type === 'high' ? '高潮' : '低潮'} - ${window.waterLevel}m`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[10px] text-white/80 font-medium">
                    {window.type === 'high' ? '🌊 高潮' : '💧 低潮'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="absolute top-18 left-0 right-0 h-6 mt-2">
          {tasks.map((task) => {
            const pos = getTaskPosition(task);
            const ship = useGameStore.getState().ships.find((s) => s.id === task.shipId);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 h-full rounded px-2 flex items-center"
                style={{
                  left: `${pos.left}%`,
                  width: `${Math.max(pos.width, 8)}%`,
                  backgroundColor: taskStatusColors[task.status],
                  opacity: 0.8,
                }}
                title={`${ship?.name || '未知船舶'} - ${task.type === 'dock' ? '靠泊' : '离泊'}`}
              >
                {pos.width > 5 && (
                  <span className="text-[9px] text-white font-medium truncate">
                    {ship?.name?.slice(0, 3)}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
          style={{ left: `${Math.min(progress, 100)}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
        <div className="flex gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-500/40 border border-cyan-500"></div>
            <span className="text-slate-400">高潮窗口</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-600/40 border border-blue-600"></div>
            <span className="text-slate-400">低潮窗口</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-500"></div>
            <span className="text-slate-400">待处理</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-slate-400">已完成</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeAxis;
