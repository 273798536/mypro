import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FileText, CheckCircle, XCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { ConflictResolution } from '../types/game';

export default function ConflictModal() {
  const { activeConflict, traceConflict, resolveConflict, time } = useGameStore();
  const [traced, setTraced] = useState(false);
  const [traceTime, setTraceTime] = useState<number | null>(null);

  if (!activeConflict) return null;

  const timeSinceStart = time - activeConflict.timestamp;
  const traceDeadline = 10;
  const resolveDeadline = 40;
  const traceRemaining = Math.max(0, traceDeadline - timeSinceStart);
  const resolveRemaining = traced ? Math.max(0, resolveDeadline - timeSinceStart) : 0;
  const canTrace = !traced && traceRemaining > 0;
  const canResolve = traced && resolveRemaining > 0;

  const handleTrace = () => {
    if (!canTrace) return;
    traceConflict(activeConflict.id);
    setTraced(true);
    setTraceTime(time);
  };

  const handleResolve = (resolution: ConflictResolution) => {
    if (!canResolve) return;
    resolveConflict(activeConflict.id, resolution);
    setTraced(false);
    setTraceTime(null);
  };

  const getResolutionLabel = (resolution: ConflictResolution): string => {
    switch (resolution) {
      case 'main': return '主信息正确';
      case 'volatility': return '波动率风暴正确';
      case 'delta': return 'Delta仪表正确';
      case 'reject_all': return '全部拒绝';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="panel-glass-yellow w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-neon-yellow/20 flex items-center justify-center animate-pulse">
                <AlertTriangle className="text-neon-yellow" size={24} />
              </div>
              <div>
                <h2 className="font-orbitron text-xl text-neon-yellow">信息冲突警报</h2>
                <p className="text-sm text-gray-400">三方数据源出现不一致，请先留痕再判断</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="panel-glass p-3">
                <div className="flex items-center gap-2 mb-2 text-neon-cyan">
                  <TrendingUp size={16} />
                  <span className="text-sm font-medium">主信息</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">标的价格</span>
                    <span className="font-mono text-neon-cyan">
                      ${activeConflict.mainInfo.underlyingPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">价格变动</span>
                    <span className={`font-mono ${activeConflict.mainInfo.priceChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {activeConflict.mainInfo.priceChange >= 0 ? '+' : ''}{activeConflict.mainInfo.priceChange.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">置信度</span>
                    <span className="font-mono text-neon-yellow">
                      {(activeConflict.mainInfo.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel-glass-purple p-3">
                <div className="flex items-center gap-2 mb-2 text-neon-purple">
                  <Activity size={16} />
                  <span className="text-sm font-medium">波动率风暴</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">隐含波动率</span>
                    <span className="font-mono text-neon-purple">
                      {(activeConflict.volatilityStorm.iv * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">波动率变动</span>
                    <span className={`font-mono ${activeConflict.volatilityStorm.ivChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {activeConflict.volatilityStorm.ivChange >= 0 ? '+' : ''}
                      {(activeConflict.volatilityStorm.ivChange * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">严重程度</span>
                    <span className={`font-medium ${
                      activeConflict.volatilityStorm.severity === 'low' ? 'text-neon-green' :
                      activeConflict.volatilityStorm.severity === 'medium' ? 'text-neon-yellow' :
                      'text-neon-red'
                    }`}>
                      {activeConflict.volatilityStorm.severity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel-glass-green p-3">
                <div className="flex items-center gap-2 mb-2 text-neon-green">
                  <TrendingDown size={16} />
                  <span className="text-sm font-medium">Delta仪表</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Delta值</span>
                    <span className="font-mono text-neon-green">
                      {activeConflict.deltaInstrument.delta.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Delta变动</span>
                    <span className={`font-mono ${activeConflict.deltaInstrument.deltaChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {activeConflict.deltaInstrument.deltaChange >= 0 ? '+' : ''}
                      {activeConflict.deltaInstrument.deltaChange.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gamma指示</span>
                    <span className={`font-medium ${
                      activeConflict.deltaInstrument.gammaIndicator === 'increasing' ? 'text-neon-green' :
                      activeConflict.deltaInstrument.gammaIndicator === 'decreasing' ? 'text-neon-red' :
                      'text-neon-yellow'
                    }`}>
                      {activeConflict.deltaInstrument.gammaIndicator}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">处理进度</span>
                <span className="text-xs text-neon-yellow">
                  {!traced
                    ? `留痕倒计时: ${traceRemaining.toFixed(0)}秒`
                    : `判断倒计时: ${resolveRemaining.toFixed(0)}秒`
                  }
                </span>
              </div>
              <div className="w-full bg-space-700 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-neon-yellow"
                  initial={{ width: '100%' }}
                  animate={{
                    width: `${(!traced ? traceRemaining / traceDeadline : resolveRemaining / resolveDeadline) * 100}%`,
                    backgroundColor: (
                      (!traced && traceRemaining < 3) || (traced && resolveRemaining < 10)
                        ? '#ff3366' : '#ffaa00'
                    ),
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <motion.button
                  onClick={handleTrace}
                  disabled={!canTrace}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    canTrace
                      ? 'btn-neon-yellow'
                      : traced
                        ? 'bg-neon-green/20 border-2 border-neon-green text-neon-green cursor-default'
                        : 'bg-gray-700/50 border-2 border-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                  whileHover={canTrace ? { scale: 1.05 } : {}}
                  whileTap={canTrace ? { scale: 0.95 } : {}}
                >
                  {traced ? (
                    <><CheckCircle size={18} /> 已留痕</>
                  ) : (
                    <><FileText size={18} /> 点击留痕</>
                  )}
                </motion.button>
              </div>

              {traced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <div className="text-center text-sm text-gray-400">
                    请判断哪一方信息正确，或选择全部拒绝：
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['main', 'volatility', 'delta', 'reject_all'] as ConflictResolution[]).map((resolution) => (
                      <motion.button
                        key={resolution}
                        onClick={() => handleResolve(resolution)}
                        disabled={!canResolve}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          canResolve
                            ? resolution === 'main'
                              ? 'border-neon-cyan/50 hover:border-neon-cyan hover:bg-neon-cyan/10 text-neon-cyan'
                              : resolution === 'volatility'
                                ? 'border-neon-purple/50 hover:border-neon-purple hover:bg-neon-purple/10 text-neon-purple'
                                : resolution === 'delta'
                                  ? 'border-neon-green/50 hover:border-neon-green hover:bg-neon-green/10 text-neon-green'
                                  : 'border-gray-500/50 hover:border-gray-400 hover:bg-gray-700/50 text-gray-400'
                            : 'opacity-50 cursor-not-allowed border-gray-600 text-gray-500'
                        }`}
                        whileHover={canResolve ? { scale: 1.02 } : {}}
                        whileTap={canResolve ? { scale: 0.98 } : {}}
                      >
                        <div className="font-medium text-sm">
                          {getResolutionLabel(resolution)}
                        </div>
                        {resolution !== 'reject_all' && (
                          <div className="text-xs mt-1 opacity-70">
                            {resolution === 'main' && `价格方向: ${activeConflict.mainInfo.priceDirection}`}
                            {resolution === 'volatility' && `IV变化: ${(activeConflict.volatilityStorm.ivChange * 100).toFixed(1)}%`}
                            {resolution === 'delta' && `Gamma: ${activeConflict.deltaInstrument.gammaIndicator}`}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {!traced && traceRemaining <= 0 && (
                <div className="text-center text-neon-red text-sm flex items-center justify-center gap-2">
                  <XCircle size={16} />
                  留痕超时，已自动扣分
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
