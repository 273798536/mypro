import { motion } from 'framer-motion';
import { Star, Clock, Trophy } from 'lucide-react';
import { calculateStars } from '@/utils/scoreCalc';

interface ScorePanelProps {
  score: number;
  targetScore: number;
  timeSpent: number;
  correctCount: number;
  errorCount: number;
}

export default function ScorePanel({
  score,
  targetScore,
  timeSpent,
  correctCount,
  errorCount,
}: ScorePanelProps) {
  const stars = calculateStars(score, targetScore);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-center gap-2 mb-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: i < stars ? 1 : 0.5,
              rotate: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2 + i * 0.2,
            }}
          >
            <Star
              className={`w-12 h-12 ${
                i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
              }`}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-6xl font-bold text-amber-400 mb-2">
          {score}
        </div>
        <div className="text-slate-400 text-sm">
          目标分数: {targetScore}
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <motion.div
          className="text-center p-3 bg-slate-700/50 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Clock className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <div className="text-lg font-bold text-emerald-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400">用时</div>
        </motion.div>

        <motion.div
          className="text-center p-3 bg-slate-700/50 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <div className="text-lg font-bold text-amber-400">
            {correctCount}
          </div>
          <div className="text-xs text-slate-400">正确操作</div>
        </motion.div>

        <motion.div
          className="text-center p-3 bg-slate-700/50 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="w-5 h-5 mx-auto mb-1 text-rose-400 flex items-center justify-center">
            ✕
          </div>
          <div className="text-lg font-bold text-rose-400">
            {errorCount}
          </div>
          <div className="text-xs text-slate-400">错误次数</div>
        </motion.div>
      </div>
    </div>
  );
}
