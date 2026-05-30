import React from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onResume,
  onRestart,
  onHome
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-xl"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-800 rounded-2xl p-8 text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">⏸️ 游戏暂停</h2>
        <p className="text-gray-400 mb-6">按空格键或点击继续按钮恢复游戏</p>
        
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onResume}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors"
          >
            <Play size={20} />
            继续游戏
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRestart}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors"
          >
            <RotateCcw size={20} />
            重新开始
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onHome}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
          >
            <Home size={20} />
            返回主菜单
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
