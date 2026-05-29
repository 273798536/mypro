import { useGameStore } from '../store/gameStore';
import { compareRuns, formatTime, formatEnergy } from '../utils/comparison';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, XCircle, ArrowUp, ArrowDown, Minus, RotateCcw, Home, Check, Clock, Zap, Gauge, Gem } from 'lucide-react';
import { motion } from 'framer-motion';

export function ResultScreen() {
  const { state, lastRunResult, previousRunResult, resetGame, startGame, minecartConfig } = useGameStore();

  if (state.phase !== 'finished' || !lastRunResult) {
    return null;
  }

  const comparisons = previousRunResult ? compareRuns(previousRunResult, lastRunResult) : [];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-400 bg-green-500/20';
      case 'negative':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <ArrowUp className="w-4 h-4" />;
      case 'negative':
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const handleRetry = () => {
    if (state.currentLevel && minecartConfig) {
      startGame(state.currentLevel, minecartConfig);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900 rounded-2xl border border-slate-700 p-8 max-w-4xl w-full mx-4 shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className={`inline-flex p-4 rounded-full mb-4 ${lastRunResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}
          >
            {lastRunResult.success ? (
              <Trophy className="w-12 h-12 text-green-400" />
            ) : (
              <XCircle className="w-12 h-12 text-red-400" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {lastRunResult.success ? '任务完成！' : '任务失败'}
          </h1>
          <p className="text-slate-400">
            {lastRunResult.success
              ? '矿石已安全送达基地'
              : lastRunResult.failureAnalysis?.primaryCause === 'energy'
              ? '能量耗尽，矿车无法继续前进'
              : lastRunResult.failureAnalysis?.primaryCause === 'collision'
              ? '发生碰撞事故'
              : lastRunResult.failureAnalysis?.primaryCause === 'timeout'
              ? '任务超时'
              : '任务未能完成'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700"
          >
            <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white font-mono">{formatTime(lastRunResult.totalTime)}</div>
            <div className="text-slate-500 text-sm">总耗时</div>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700"
          >
            <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-cyan-400 font-mono">{formatEnergy(lastRunResult.finalEnergy)}</div>
            <div className="text-slate-500 text-sm">剩余能量</div>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700"
          >
            <Gem className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400 font-mono">{lastRunResult.oreCollected}</div>
            <div className="text-slate-500 text-sm">收集矿石</div>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700"
          >
            <Gauge className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white font-mono">{lastRunResult.maxSpeed.toFixed(1)}</div>
            <div className="text-slate-500 text-sm">最高速度 m/s</div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/30 rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              能量消耗曲线
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lastRunResult.energyHistory}>
                  <defs>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                  <YAxis stroke="#475569" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#00d4ff' }}
                  />
                  <Area type="monotone" dataKey="energy" stroke="#00d4ff" fill="url(#energyGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-sm text-slate-400">
              总消耗能量: <span className="text-cyan-400 font-mono">{lastRunResult.energyUsed.toFixed(1)} kJ</span>
            </div>
          </motion.div>

          {lastRunResult.failureAnalysis && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="bg-slate-800/30 rounded-xl p-6 border border-slate-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                失败原因分析
              </h3>
              <div className="space-y-3">
                {Object.entries(lastRunResult.failureAnalysis.causePercentage).map(([cause, percent]) => (
                  <div key={cause}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {cause === 'energy' && '能量消耗'}
                        {cause === 'collision' && '碰撞损伤'}
                        {cause === 'speed' && '速度因素'}
                        {cause === 'route' && '路线选择'}
                        {cause === 'timeout' && '时间消耗'}
                      </span>
                      <span className="text-slate-400 font-mono">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${cause === 'energy' ? 'bg-red-500' : cause === 'collision' ? 'bg-orange-500' : cause === 'timeout' ? 'bg-yellow-500' : 'bg-slate-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400 mb-2">改进建议：</div>
                <ul className="text-sm text-slate-300 space-y-1">
                  {lastRunResult.failureAnalysis.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>

        {comparisons.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 mb-8"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-green-400" />
              与上轮对比
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {comparisons.map((cmp, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getImpactColor(cmp.impact)}`}
                >
                  <div className="text-sm text-slate-300 mb-1">{cmp.field}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white">
                      {typeof cmp.oldValue === 'boolean' ? (cmp.oldValue ? '✓' : '✗') : cmp.oldValue}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono font-bold">
                      {typeof cmp.newValue === 'boolean' ? (cmp.newValue ? '✓' : '✗') : cmp.newValue}
                    </span>
                  </div>
                  {cmp.change !== 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      {getImpactIcon(cmp.impact)}
                      <span>{cmp.change > 0 ? '+' : ''}{cmp.change.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-medium transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>再来一次</span>
          </button>
          <button
            onClick={resetGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>返回主菜单</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
