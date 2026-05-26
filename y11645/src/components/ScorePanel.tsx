import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Clock, Target } from 'lucide-react';

interface ScorePanelProps {
  score: number;
  combo: number;
  maxCombo: number;
  timeRemaining: number;
  totalBaggage: number;
  correctCount: number;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  score,
  combo,
  maxCombo,
  timeRemaining,
  totalBaggage,
  correctCount,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const accuracy = totalBaggage > 0 ? Math.round((correctCount / totalBaggage) * 100) : 0;
  const isTimeWarning = timeRemaining <= 10;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Trophy size={16} />
            <span className="text-xs">得分</span>
          </div>
          <motion.div
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-aviation-600 font-mono"
          >
            {score}
          </motion.div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Zap size={16} />
            <span className="text-xs">连击</span>
          </div>
          <div className="text-2xl font-bold text-warning-600 font-mono">
            {combo}x
            {combo >= 5 && <span className="text-xs ml-1 text-warning-500">🔥</span>}
          </div>
          <div className="text-[10px] text-gray-400">最高: {maxCombo}x</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Clock size={16} />
            <span className="text-xs">剩余时间</span>
          </div>
          <motion.div
            key={timeRemaining}
            animate={isTimeWarning ? { color: ['#EF4444', '#DC2626', '#EF4444'] } : {}}
            transition={{ duration: 0.5, repeat: isTimeWarning ? Infinity : 0 }}
            className={`text-2xl font-bold font-mono ${
              isTimeWarning ? 'text-red-500 animate-pulse' : 'text-gray-700'
            }`}
          >
            {formatTime(timeRemaining)}
          </motion.div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Target size={16} />
            <span className="text-xs">准确率</span>
          </div>
          <div className="text-2xl font-bold text-success-600 font-mono">
            {accuracy}%
          </div>
          <div className="text-[10px] text-gray-400">
            {correctCount}/{totalBaggage} 正确
          </div>
        </div>
      </div>
    </div>
  );
};
