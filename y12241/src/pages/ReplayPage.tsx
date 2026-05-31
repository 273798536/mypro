import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Download } from 'lucide-react';
import ReplayTimeline from '../components/replay/ReplayTimeline';
import CauseEffectGraph from '../components/replay/CauseEffectGraph';
import GameCanvas from '../components/game/GameCanvas';
import {
  useGameStore,
  useOperations,
  useAnomalies,
  useTriggerPoints,
  useCauseEffectChain,
  useGameStatus,
  useSnapshots,
} from '../store/useGameStore';
import { exportGameData } from '../engine/replayRecorder';
import { generateCauseEffectChain } from '../engine/replayRecorder';

export default function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const operations = useOperations();
  const anomalies = useAnomalies();
  const triggerPoints = useTriggerPoints();
  const causeEffectChain = useCauseEffectChain();
  const status = useGameStatus();
  const snapshots = useSnapshots();
  const actions = useGameStore(state => state.actions);
  const gameState = useGameStore(state => state.gameState);

  const [activeTab, setActiveTab] = useState<'timeline' | 'causal'>('timeline');

  const chain = causeEffectChain || generateCauseEffectChain(
    operations,
    anomalies,
    status === 'won' ? 'won' : 'lost'
  );

  const handleExport = () => {
    const data = exportGameData(gameState);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit-rescue-replay-${gameId || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStepChange = (step: number) => {
    const snapshot = snapshots[step];
    if (snapshot) {
      actions.setReplayStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-circuit-darker">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回游戏</span>
              </Link>
              <div className="w-px h-6 bg-slate-700" />
              <h1 className="font-display font-bold text-lg text-slate-200">
                回放分析
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">
                游戏 ID: <span className="font-mono text-slate-400">{gameId?.slice(0, 8)}</span>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
              >
                <Download className="w-3 h-3" />
                导出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <h3 className="font-display font-bold text-slate-200 mb-3">电路状态回放</h3>
              <div className="h-[350px]">
                <GameCanvas />
              </div>
            </div>

            <ReplayTimeline onStepChange={handleStepChange} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-amber-500 text-slate-900 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                操作时间线
              </button>
              <button
                onClick={() => setActiveTab('causal')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'causal'
                    ? 'bg-amber-500 text-slate-900 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                因果链
              </button>
            </div>

            {activeTab === 'timeline' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <h3 className="font-display font-bold text-slate-200 mb-3">
                    操作记录 ({operations.length} 步)
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {operations.map((op, index) => {
                      const isTrigger = triggerPoints.some(
                        tp => tp.stepNumber === op.stepNumber
                      );
                      return (
                        <motion.div
                          key={op.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-3 rounded-lg border ${
                            isTrigger
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-slate-900/30 border-slate-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-slate-500">
                              步骤 {op.stepNumber}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              op.type === 'place_power'
                                ? 'bg-amber-500/20 text-amber-400'
                                : op.type === 'place_wire'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {op.type === 'place_power'
                                ? '电源站'
                                : op.type === 'place_wire'
                                ? '导线'
                                : '维修队'}
                            </span>
                            {isTrigger && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                触发点
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-blue-400 flex-shrink-0">来源:</span>
                              <span className="text-slate-300">{op.source}</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-amber-400 flex-shrink-0">判断:</span>
                              <span className="text-slate-300">{op.judgment}</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-green-400 flex-shrink-0">结果:</span>
                              <span className="text-slate-300">{op.result}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {anomalies.length > 0 && (
                  <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4">
                    <h3 className="font-display font-bold text-red-400 mb-3">
                      异常记录 ({anomalies.length})
                    </h3>
                    <div className="space-y-2">
                      {anomalies.map(anomaly => (
                        <div
                          key={anomaly.id}
                          className={`p-2 rounded-lg text-xs ${
                            anomaly.resolved
                              ? 'bg-slate-900/30 border border-slate-700/30'
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              anomaly.severity === 'critical'
                                ? 'bg-red-500/20 text-red-400'
                                : anomaly.severity === 'error'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {anomaly.severity === 'critical' ? '严重' : anomaly.severity === 'error' ? '错误' : '警告'}
                            </span>
                            <span className="text-slate-400">
                              步骤 {anomaly.stepNumber}
                            </span>
                            {anomaly.resolved && (
                              <span className="text-green-400 text-[10px]">已修复</span>
                            )}
                          </div>
                          <p className="text-slate-300">{anomaly.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'causal' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CauseEffectGraph rootNode={chain} />
              </motion.div>
            )}

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <h3 className="font-display font-bold text-slate-200 mb-3">触发点摘要</h3>
              {triggerPoints.length === 0 ? (
                <p className="text-slate-500 text-sm">暂无触发点记录</p>
              ) : (
                <div className="space-y-2">
                  {triggerPoints.map((tp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            tp.type === 'connect' ? '#10B981' :
                            tp.type === 'anomaly' ? '#EF4444' :
                            tp.type === 'win' ? '#06B6D4' : '#EF4444',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">
                            步骤 {tp.stepNumber}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            tp.type === 'connect' ? 'bg-green-500/20 text-green-400' :
                            tp.type === 'anomaly' ? 'bg-red-500/20 text-red-400' :
                            tp.type === 'win' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-red-600/20 text-red-400'
                          }`}>
                            {tp.type === 'connect' ? '连通' :
                             tp.type === 'anomaly' ? '异常' :
                             tp.type === 'win' ? '胜利' : '失败'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 truncate">
                          {tp.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
