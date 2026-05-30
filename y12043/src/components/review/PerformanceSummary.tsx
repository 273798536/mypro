import { motion } from 'framer-motion';
import { ReviewAnalysis } from '@/types';
import { getPerformanceGrade } from '@/engine/review';
import { TrendingUp, TrendingDown, Shield, DollarSign, AlertTriangle, Target } from 'lucide-react';

interface PerformanceSummaryProps {
  analysis: ReviewAnalysis;
}

export function PerformanceSummary({ analysis }: PerformanceSummaryProps) {
  const grade = getPerformanceGrade(analysis.finalReturnPercent);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">投资成绩</h2>
          <p className="text-slate-400 text-sm">基金组合迷宫通关</p>
        </div>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg"
          style={{ backgroundColor: grade.color }}
        >
          {grade.grade}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            最终收益
          </div>
          <div className={`text-2xl font-bold ${analysis.finalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {analysis.finalReturn >= 0 ? '+' : ''}¥{analysis.finalReturn.toFixed(2)}
          </div>
          <div className={`text-sm ${analysis.finalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {analysis.finalReturnPercent >= 0 ? '+' : ''}{(analysis.finalReturnPercent * 100).toFixed(2)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <TrendingDown className="w-4 h-4" />
            最大回撤
          </div>
          <div className="text-2xl font-bold text-red-400">
            -{(analysis.maxDrawdown * 100).toFixed(1)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            手续费总计
          </div>
          <div className="text-2xl font-bold text-amber-400">
            ¥{analysis.totalFees.toFixed(2)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Shield className="w-4 h-4" />
            分散得分
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {analysis.diversificationScore.toFixed(0)}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
        </motion.div>
      </div>

      {analysis.keyMistakes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-red-500/20 rounded-xl p-4 mb-4"
        >
          <div className="flex items-center gap-2 text-red-300 text-sm font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            关键失误 ({analysis.keyMistakes.length})
          </div>
          <div className="space-y-2">
            {analysis.keyMistakes.slice(0, 3).map((mistake, i) => (
              <div key={i} className="text-sm text-slate-300">
                <span className="text-red-300">第{mistake.step}步</span>: {mistake.description}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-emerald-500/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium mb-2">
          <Target className="w-4 h-4" />
          投教建议
        </div>
        <div className="space-y-2">
          {analysis.suggestions.map((suggestion, i) => (
            <div key={i} className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              {suggestion}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
