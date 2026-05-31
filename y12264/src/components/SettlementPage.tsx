import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Download,
  RotateCcw,
  X,
  Clock,
  Droplets,
  Gauge,
  Leaf,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getScoreGrade, formatTime } from '../utils/common';
import { getScoreAnalysis } from '../engine/scoreCalculator';
import { riskTypeLabels, riskTypeBgColors, riskTypeColors } from '../types/risk';
import { CardComponent } from './CardComponent';

interface SettlementPageProps {
  onClose: () => void;
  onRestart: () => void;
}

export function SettlementPage({ onClose, onRestart }: SettlementPageProps) {
  const {
    score,
    maxScore,
    scoreBreakdown,
    riskRecords,
    elapsedTime,
    totalRounds,
    stateHistory,
    replayMode,
    replayIndex,
    setReplayMode,
    setReplayIndex,
    exportGameRecord,
    scenario,
    city,
    roundsWithNoRisk,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'score' | 'risks' | 'replay'>('score');
  const [isPlaying, setIsPlaying] = useState(false);

  const grade = getScoreGrade(score, maxScore);
  const analysis = scoreBreakdown ? getScoreAnalysis(scoreBreakdown) : [];

  const currentSnapshot = stateHistory[replayIndex];

  const handlePlayReplay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setReplayIndex(0);
    } else {
      setIsPlaying(false);
    }
  };

  const handleReplayStep = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? replayIndex - 1 : replayIndex + 1;
    setReplayIndex(newIndex);
  };

  const replayTimeline = replayMode ? stateHistory : stateHistory.filter((_, i) => i % 3 === 0 || i === stateHistory.length - 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">游戏结算</h2>
              <p className="text-slate-400 text-sm">场景：{scenario.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportGameRecord}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            >
              <Download size={18} />
              导出成绩
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRestart}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              再来一局
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">最终得分</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold font-mono ${grade.color}`}>
                  {score.toFixed(0)}
                </span>
                <span className="text-slate-500">/ {maxScore}</span>
              </div>
              <div className={`text-6xl font-black mt-2 ${grade.color} opacity-30`}>
                {grade.grade}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">用时</div>
              <div className="flex items-center gap-2 text-2xl font-bold text-white font-mono">
                <Clock size={20} className="text-cyan-400" />
                {formatTime(elapsedTime)}
              </div>
              <div className="text-slate-500 text-sm mt-2">
                共 {totalRounds} 回合
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">无风险回合</div>
              <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 font-mono">
                <TrendingUp size={20} />
                {roundsWithNoRisk}
                <span className="text-slate-500 text-base">/ {totalRounds}</span>
              </div>
              <div className="text-slate-500 text-sm mt-2">
                安全率 {((roundsWithNoRisk / totalRounds) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">风险事件</div>
              <div className="flex items-center gap-2 text-2xl font-bold text-red-400 font-mono">
                <TrendingDown size={20} />
                {riskRecords.length} 次
              </div>
              <div className="text-slate-500 text-sm mt-2">
                累计扣分 {scoreBreakdown?.totalPenalty || 0} 分
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {[
              { key: 'score', label: '评分明细' },
              { key: 'risks', label: '风险记录' },
              { key: 'replay', label: '复盘时间线' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'score' && scoreBreakdown && (
              <motion.div
                key="score"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-white font-semibold mb-4">评分构成</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                      <span className="text-slate-300">基础分</span>
                      <span className="text-emerald-400 font-mono font-bold">+{scoreBreakdown.baseScore}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                      <span className="text-slate-300">效率加成</span>
                      <span className="text-cyan-400 font-mono font-bold">+{scoreBreakdown.efficiencyBonus}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                      <span className="text-slate-300">风险扣分</span>
                      <span className="text-red-400 font-mono font-bold">-{scoreBreakdown.totalPenalty}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-white font-semibold text-lg">最终得分</span>
                      <span className={`text-3xl font-bold font-mono ${grade.color}`}>
                        {scoreBreakdown.finalScore}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-white font-semibold mb-4">风险扣分明细</h3>
                  {scoreBreakdown.riskPenalties.length === 0 ? (
                    <p className="text-emerald-400 text-center py-4">🎉 完美！本局没有任何风险事件</p>
                  ) : (
                    <div className="space-y-2">
                      {scoreBreakdown.riskPenalties.map((rp, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${riskTypeColors[rp.risk.type]} ${riskTypeBgColors[rp.risk.type]}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={14} className={riskTypeColors[rp.risk.type].split(' ')[0]} />
                              <span className={`font-medium ${riskTypeColors[rp.risk.type].split(' ')[0]}`}>
                                {riskTypeLabels[rp.risk.type]}
                              </span>
                              <span className="text-slate-500 text-sm">第{rp.risk.round}回合</span>
                            </div>
                            <span className="text-red-400 font-mono font-bold">-{rp.penalty}分</span>
                          </div>
                          <div className="text-xs text-slate-300 space-y-1">
                            <p><span className="text-slate-500">触发源：</span>{rp.risk.triggerCardName || '未及时调度'}</p>
                            <p><span className="text-slate-500">卡点：</span>{rp.risk.bottleneck}</p>
                            <p><span className="text-slate-500">建议：</span>{rp.risk.nextStep}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-5 border border-cyan-700/50">
                  <h3 className="text-white font-semibold mb-3">分析建议</h3>
                  <ul className="space-y-2">
                    {analysis.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-cyan-400 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'risks' && (
              <motion.div
                key="risks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {riskRecords.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                    <Trophy size={48} className="text-emerald-400 mx-auto mb-3" />
                    <p className="text-emerald-400 text-lg font-medium">完美表现！</p>
                    <p className="text-slate-500">本局游戏没有触发任何风险事件</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riskRecords.map((risk, idx) => (
                      <motion.div
                        key={risk.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-5 rounded-xl border ${riskTypeColors[risk.type]} ${riskTypeBgColors[risk.type]}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle size={18} className={riskTypeColors[risk.type].split(' ')[0]} />
                              <span className={`text-lg font-bold ${riskTypeColors[risk.type].split(' ')[0]}`}>
                                {riskTypeLabels[risk.type]}
                              </span>
                            </div>
                            <div className="text-slate-400 text-sm">
                              第 {risk.round} 回合触发
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-red-400 font-mono">-{risk.penalty}分</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-slate-500 text-xs mb-1">触发源</div>
                            <div className="text-white font-medium">{risk.triggerCardName || '未及时调度相关卡牌'}</div>
                          </div>
                          <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-slate-500 text-xs mb-1">卡点原因</div>
                            <div className="text-white text-sm">{risk.bottleneck}</div>
                          </div>
                        </div>

                        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/50">
                          <div className="text-emerald-400 text-xs mb-1">💡 下一步改进建议</div>
                          <div className="text-emerald-300 text-sm">{risk.nextStep}</div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-slate-500 text-xs mb-2">触发时状态</div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Gauge size={12} className="text-orange-400" />
                              <span className="text-slate-400">泵站：</span>
                              <span className="text-white font-mono">{risk.citySnapshot.pumpLoad}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Droplets size={12} className="text-yellow-400" />
                              <span className="text-slate-400">积水：</span>
                              <span className="text-white font-mono">{risk.citySnapshot.lowWater}mm</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Leaf size={12} className="text-emerald-400" />
                              <span className="text-slate-400">绿地：</span>
                              <span className="text-white font-mono">{risk.citySnapshot.greenCapacity}%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'replay' && (
              <motion.div
                key="replay"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">复盘控制</h3>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReplayStep('prev')}
                        disabled={replayIndex <= 0}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePlayReplay}
                        className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReplayStep('next')}
                        disabled={replayIndex >= replayTimeline.length - 1}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={18} />
                      </motion.button>
                      <span className="text-slate-400 text-sm ml-2">
                        {replayIndex + 1} / {replayTimeline.length}
                      </span>
                    </div>
                  </div>

                  <div className="relative h-2 bg-slate-700 rounded-full mb-4">
                    <div
                      className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${((replayIndex + 1) / replayTimeline.length) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-1">
                      {replayTimeline.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setReplayIndex(idx)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            idx <= replayIndex ? 'bg-cyan-400' : 'bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {currentSnapshot && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                        <div className="text-slate-500 text-xs mb-1">回合</div>
                        <div className="text-xl font-bold text-white font-mono">
                          {currentSnapshot.round}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                        <div className="text-slate-500 text-xs mb-1">降雨</div>
                        <div className="text-xl font-bold text-cyan-400 font-mono">
                          {currentSnapshot.activeRainfall}mm/h
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                        <div className="text-slate-500 text-xs mb-1">得分</div>
                        <div className="text-xl font-bold text-emerald-400 font-mono">
                          {currentSnapshot.score.toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                        <div className="text-slate-500 text-xs mb-1">泵站负载</div>
                        <div className={`text-xl font-bold font-mono ${
                          currentSnapshot.city.pumpLoad > 85 ? 'text-red-400' :
                          currentSnapshot.city.pumpLoad > 70 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {currentSnapshot.city.pumpLoad}%
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSnapshot && (
                    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-slate-400 text-xs mb-1">事件</div>
                      <div className="text-white">{currentSnapshot.logMessage}</div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-white font-medium mb-3">当前城市状态</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge size={16} className="text-orange-400" />
                        <span className="text-slate-400 text-sm">泵站负载率</span>
                      </div>
                      <div className="relative h-2 bg-slate-700 rounded-full mb-2">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            (currentSnapshot?.city.pumpLoad || city.pumpLoad) > 85 ? 'bg-red-500' :
                            (currentSnapshot?.city.pumpLoad || city.pumpLoad) > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${currentSnapshot?.city.pumpLoad || city.pumpLoad}%` }}
                        />
                      </div>
                      <div className="text-2xl font-bold text-white font-mono">
                        {currentSnapshot?.city.pumpLoad.toFixed(1) || city.pumpLoad.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets size={16} className="text-yellow-400" />
                        <span className="text-slate-400 text-sm">低洼积水</span>
                      </div>
                      <div className="relative h-2 bg-slate-700 rounded-full mb-2">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            (currentSnapshot?.city.lowWater || city.lowWater) > 100 ? 'bg-red-500' :
                            (currentSnapshot?.city.lowWater || city.lowWater) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (currentSnapshot?.city.lowWater || city.lowWater) / 3)}%` }}
                        />
                      </div>
                      <div className="text-2xl font-bold text-white font-mono">
                        {currentSnapshot?.city.lowWater.toFixed(1) || city.lowWater.toFixed(1)}mm
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf size={16} className="text-emerald-400" />
                        <span className="text-slate-400 text-sm">绿地容量</span>
                      </div>
                      <div className="relative h-2 bg-slate-700 rounded-full mb-2">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            (currentSnapshot?.city.greenCapacity || city.greenCapacity) < 15 ? 'bg-red-500' :
                            (currentSnapshot?.city.greenCapacity || city.greenCapacity) < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${currentSnapshot?.city.greenCapacity || city.greenCapacity}%` }}
                        />
                      </div>
                      <div className="text-2xl font-bold text-white font-mono">
                        {currentSnapshot?.city.greenCapacity.toFixed(1) || city.greenCapacity.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
