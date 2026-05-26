import { useGameStore } from '../../store/gameStore';
import { getFuelStatus, getFuelStatusColor } from '../../utils/fuelCalculator';
import { motion } from 'framer-motion';

const ResourcePanel = () => {
  const { tugs, tasks, ships, berths, startTask, selectedTugId, selectTug } = useGameStore();

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">资源状态</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
            <span>🚢</span> 拖轮 ({tugs.length})
          </h4>
          <div className="space-y-2">
            {tugs.map((tug) => {
              const fuelStatus = getFuelStatus(tug);
              const fuelColor = getFuelStatusColor(fuelStatus);
              const fuelPercent = (tug.currentFuel / tug.fuelCapacity) * 100;
              const isSelected = selectedTugId === tug.id;

              return (
                <motion.div
                  key={tug.id}
                  onClick={() => selectTug(isSelected ? undefined : tug.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-500'
                      : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200">{tug.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        tug.status === 'idle'
                          ? 'bg-amber-500/20 text-amber-400'
                          : tug.status === 'working'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {tug.status === 'idle' ? '空闲' : tug.status === 'working' ? '作业中' : '移动中'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">⛽</span>
                    <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: fuelColor, width: `${fuelPercent}%` }}
                        initial={false}
                        animate={{ width: `${fuelPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 w-12 text-right">
                      {Math.round(tug.currentFuel)}/{tug.fuelCapacity}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
            <span>📋</span> 调度任务
          </h4>
          <div className="space-y-2">
            {tasks.map((task) => {
              const ship = ships.find((s) => s.id === task.shipId);
              const berth = berths.find((b) => b.id === task.berthId);
              const canStart = task.status === 'pending' && task.tugIds.length >= (ship?.requiredTugs || 1);

              return (
                <motion.div
                  key={task.id}
                  className="p-3 rounded-lg bg-slate-700/50 border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200">
                      {ship?.name} → {berth?.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        task.status === 'pending'
                          ? 'bg-slate-500/50 text-slate-300'
                          : task.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-400'
                          : task.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {task.status === 'pending'
                        ? '待处理'
                        : task.status === 'in_progress'
                        ? '进行中'
                        : task.status === 'completed'
                        ? '已完成'
                        : '失败'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-slate-500">拖轮:</span>
                    <div className="flex gap-1">
                      {task.tugIds.length > 0 ? (
                        task.tugIds.map((tid) => {
                          const tug = tugs.find((t) => t.id === tid);
                          return (
                            <span
                              key={tid}
                              className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded"
                            >
                              {tug?.name?.slice(0, 2)}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-500">未分配</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ({task.tugIds.length}/{ship?.requiredTugs || 0})
                    </span>
                  </div>

                  {task.status === 'pending' && (
                    <button
                      onClick={() => canStart && startTask(task.id)}
                      disabled={!canStart}
                      className={`w-full text-xs py-1.5 rounded font-medium transition-all ${
                        canStart
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canStart ? '开始任务' : `需要 ${ship?.requiredTugs} 艘拖轮`}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcePanel;
