import React from 'react';
import { Pause, Play, RotateCcw, BarChart3, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ControlPanelProps {
  isPlaying: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReview: () => void;
  score: number;
  combo: number;
  maxCombo: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onPause,
  onResume,
  onRestart,
  onReview,
  score,
  combo,
  maxCombo
}) => {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4 text-white">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide">分数</div>
          <motion.div 
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-yellow-400 font-mono"
          >
            {score.toLocaleString()}
          </motion.div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide">连击</div>
          <motion.div 
            key={combo}
            initial={{ scale: combo > 0 ? 1.3 : 1 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-bold font-mono ${
              combo >= 10 ? 'text-green-400' : 
              combo >= 5 ? 'text-blue-400' : 'text-white'
            }`}
          >
            {combo}
            {combo >= 5 && <span className="text-sm ml-1">🔥</span>}
          </motion.div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide">最高连击</div>
          <div className="text-xl font-bold text-purple-400 font-mono">
            {maxCombo}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isPlaying ? onPause : onResume}
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
          title={isPlaying ? '暂停 (空格)' : '继续 (空格)'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
          title="重新开始"
        >
          <RotateCcw size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReview}
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
          title="查看结算"
        >
          <BarChart3 size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center transition-colors"
          title="帮助"
        >
          <HelpCircle size={20} />
        </motion.button>
      </div>
    </div>
  );
};
