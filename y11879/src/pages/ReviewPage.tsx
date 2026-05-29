import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CheckCircle2, AlertTriangle, Flag, X, Check, User, Calendar, Clock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReviewPage = () => {
  const {
    pendingItems,
    resolveAppeal,
    rejectAppeal,
    setForfeitScore,
    markAsReviewed,
    athletes,
    events,
    takeSnapshot,
    snapshots,
    loadSnapshot,
  } = useAppStore();

  const [selectedAppeal, setSelectedAppeal] = useState<string | null>(null);
  const [adjustedScore, setAdjustedScore] = useState('');
  const [resolution, setResolution] = useState('');

  const forfeitItems = pendingItems.filter((p) => p.type === 'forfeit');
  const appealItems = pendingItems.filter((p) => p.type === 'appeal');
  const unreviewedCount = pendingItems.filter((p) => !p.reviewed).length;

  const handleResolveAppeal = () => {
    if (selectedAppeal && adjustedScore) {
      resolveAppeal(selectedAppeal, parseFloat(adjustedScore), resolution);
      setSelectedAppeal(null);
      setAdjustedScore('');
      setResolution('');
    }
  };

  const handleRejectAppeal = () => {
    if (selectedAppeal) {
      rejectAppeal(selectedAppeal, resolution || '申诉驳回，维持原判');
      setSelectedAppeal(null);
      setAdjustedScore('');
      setResolution('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">复核工作台</h2>
          <p className="text-dark-400 text-sm mt-1">处理弃权计分和申诉，确保排名公正性</p>
        </div>
        {unreviewedCount === 0 && pendingItems.length > 0 && (
          <button onClick={takeSnapshot} className="btn-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            保存快照
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-warning" />
                <h3 className="font-display font-semibold text-white">弃权计分确认</h3>
              </div>
              <span className="px-2 py-1 bg-warning/20 text-warning rounded-full text-xs">
                {forfeitItems.filter((p) => !p.reviewed).length} 待确认
              </span>
            </div>

            {forfeitItems.length > 0 ? (
              <div className="space-y-3">
                {forfeitItems.map((item) => {
                  const athlete = athletes.find((a) => a.id === item.athleteId);
                  const event = events.find((e) => e.id === item.eventId);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border transition-all ${
                        item.reviewed
                          ? 'bg-dark-700/30 border-dark-600/30'
                          : 'bg-warning/10 border-warning/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{athlete?.name}</p>
                            <p className="text-sm text-dark-400">
                              {athlete?.grade} {athlete?.className} · {event?.name}
                            </p>
                            <p className="text-xs text-warning mt-1">{item.description}</p>
                          </div>
                        </div>
                        {item.reviewed ? (
                          <span className="flex items-center gap-1 text-success text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            已确认
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setForfeitScore(item.scoreId!, 0)}
                              className="px-3 py-1.5 text-sm bg-dark-600 text-white rounded-lg hover:bg-dark-500 transition-colors"
                            >
                              记0分
                            </button>
                            <button
                              onClick={() => markAsReviewed(item.id)}
                              className="px-3 py-1.5 text-sm bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors"
                            >
                              确认弃权
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50 text-success" />
                <p>暂无弃权待确认</p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h3 className="font-display font-semibold text-white">申诉处理</h3>
              </div>
              <span className="px-2 py-1 bg-danger/20 text-danger rounded-full text-xs">
                {appealItems.filter((p) => !p.reviewed).length} 待处理
              </span>
            </div>

            {appealItems.length > 0 ? (
              <div className="space-y-3">
                {appealItems.map((item) => {
                  const athlete = athletes.find((a) => a.id === item.athleteId);
                  const event = events.find((e) => e.id === item.eventId);
                  const isSelected = selectedAppeal === item.appealId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border transition-all overflow-hidden ${
                        item.reviewed
                          ? 'bg-dark-700/30 border-dark-600/30'
                          : isSelected
                          ? 'bg-danger/10 border-danger'
                          : 'bg-danger/10 border-danger/30'
                      }`}
                    >
                      <div
                        className={`p-4 cursor-pointer ${!item.reviewed && 'hover:bg-danger/5'}`}
                        onClick={() => !item.reviewed && setSelectedAppeal(isSelected ? null : item.appealId!)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 text-danger" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{athlete?.name}</p>
                              <p className="text-sm text-dark-400">
                                {event?.name} 成绩申诉
                              </p>
                              <p className="text-xs text-danger mt-1">{item.description}</p>
                            </div>
                          </div>
                          {item.reviewed ? (
                            <span className="flex items-center gap-1 text-success text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              已处理
                            </span>
                          ) : (
                            <span className="text-xs text-danger animate-pulse">点击处理</span>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isSelected && !item.reviewed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-danger/30">
                              <div className="mt-4 space-y-3">
                                <div>
                                  <label className="block text-sm text-dark-300 mb-1">
                                    调整后成绩
                                  </label>
                                  <input
                                    type="number"
                                    value={adjustedScore}
                                    onChange={(e) => setAdjustedScore(e.target.value)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                                    placeholder="输入调整后的分数"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-dark-300 mb-1">
                                    处理说明
                                  </label>
                                  <textarea
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white focus:border-primary-500 focus:outline-none resize-none"
                                    rows={2}
                                    placeholder="输入处理说明（可选）"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleRejectAppeal}
                                    className="flex-1 px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    驳回申诉
                                  </button>
                                  <button
                                    onClick={handleResolveAppeal}
                                    className="flex-1 px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    调整成绩
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50 text-success" />
                <p>暂无申诉待处理</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-5">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-semibold text-white">历史快照</h3>
            </div>
            <p className="text-sm text-dark-400 mb-4">
              保存当前配置，支持随时回滚到历史版本
            </p>

            {snapshots.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {snapshots.slice().reverse().map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer"
                    onClick={() => loadSnapshot(snapshot.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-dark-400" />
                      <span className="text-sm text-white">
                        {new Date(snapshot.timestamp).toLocaleDateString()}
                      </span>
                      <Clock className="w-4 h-4 text-dark-400 ml-auto" />
                      <span className="text-sm text-dark-400">
                        {new Date(snapshot.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-dark-400 mt-1">
                      {snapshot.results.length} 条排名结果 · {snapshot.rules.length} 条规则
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-dark-400">
                <p className="text-sm">暂无历史快照</p>
                <p className="text-xs">完成所有复核后可保存快照</p>
              </div>
            )}
          </div>

          <div className="card p-5 mt-6">
            <h3 className="font-display font-semibold text-white mb-3">复核进度</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-dark-300">弃权确认</span>
                  <span className="text-sm text-white">
                    {forfeitItems.filter((p) => p.reviewed).length} / {forfeitItems.length}
                  </span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning transition-all duration-500"
                    style={{
                      width: forfeitItems.length
                        ? `${(forfeitItems.filter((p) => p.reviewed).length / forfeitItems.length) * 100}%`
                        : '100%',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-dark-300">申诉处理</span>
                  <span className="text-sm text-white">
                    {appealItems.filter((p) => p.reviewed).length} / {appealItems.length}
                  </span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger transition-all duration-500"
                    style={{
                      width: appealItems.length
                        ? `${(appealItems.filter((p) => p.reviewed).length / appealItems.length) * 100}%`
                        : '100%',
                    }}
                  />
                </div>
              </div>
            </div>

            {unreviewedCount === 0 && (
              <div className="mt-4 p-3 bg-success/20 border border-success/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-sm text-success font-medium">所有复核已完成！</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
