import React from 'react';
import { motion } from 'framer-motion';

interface DispatchAreaProps {
  selectedTrack: number | null;
  onTrackSelect: (track: number) => void;
  disabled: boolean;
}

const TRACK_CONFIG = [
  { key: 'D / 1', color: 'from-blue-400 to-blue-600', activeColor: 'bg-blue-500' },
  { key: 'F / 2', color: 'from-green-400 to-green-600', activeColor: 'bg-green-500' },
  { key: 'J / 3', color: 'from-purple-400 to-purple-600', activeColor: 'bg-purple-500' },
  { key: 'K / 4', color: 'from-pink-400 to-pink-600', activeColor: 'bg-pink-500' }
];

export const DispatchArea: React.FC<DispatchAreaProps> = ({
  selectedTrack,
  onTrackSelect,
  disabled
}) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="text-center text-gray-400 text-sm mb-4">
        调度选择区 - 按下对应按键或点击按钮
      </div>
      
      <div className="flex justify-center gap-4">
        {TRACK_CONFIG.map((track, index) => (
          <motion.button
            key={index}
            whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => !disabled && onTrackSelect(index + 1)}
            disabled={disabled}
            className={`relative w-24 h-20 rounded-xl bg-gradient-to-br ${track.color} 
              flex flex-col items-center justify-center text-white font-bold
              transition-all shadow-lg
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
              ${selectedTrack === index + 1 ? 'ring-4 ring-white ring-opacity-50 scale-105' : ''}
            `}
          >
            {selectedTrack === index + 1 && (
              <motion.div
                layoutId="selectedTrack"
                className="absolute inset-0 rounded-xl bg-white/20"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            
            <span className="text-2xl relative z-10">
              {index + 1}
            </span>
            <span className="text-xs opacity-80 relative z-10 mt-1">
              {track.key}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-4 text-center text-gray-500 text-xs">
        快捷键：D F J K 或 1 2 3 4 | 空格暂停
      </div>
    </div>
  );
};
