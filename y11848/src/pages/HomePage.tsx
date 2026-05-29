import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Difficulty } from '../types/game';

const difficultyInfo: Record<Difficulty, { name: string; desc: string; color: string; icon: string }> = {
  easy: {
    name: '简单模式',
    desc: '3x3缓存，请求较慢，适合新手熟悉玩法',
    color: 'from-tech-green to-blue-500',
    icon: '🌱',
  },
  normal: {
    name: '普通模式',
    desc: '4x4缓存，中等速度，体验真实场景压力',
    color: 'from-tech-cyan to-tech-purple',
    icon: '⚔️',
  },
  hard: {
    name: '困难模式',
    desc: '5x5缓存，高速请求，考验你的缓存策略',
    color: 'from-tech-red to-tech-orange',
    icon: '🔥',
  },
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { difficulty, setDifficulty, startGame } = useGameStore();

  const handleStart = () => {
    startGame();
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-tech-dark flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-tech-cyan via-tech-purple to-tech-pink bg-clip-text text-transparent">
          算法缓存攻防战
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          通过模拟真实的缓存场景，学习如何应对缓存击穿、脏数据、过期误读等常见问题
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-4xl mb-8"
      >
        <h2 className="text-xl font-bold text-white mb-4 text-center">选择难度</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(difficultyInfo) as Difficulty[]).map((key) => {
            const info = difficultyInfo[key];
            const isSelected = difficulty === key;
            
            return (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDifficulty(key)}
                className={`
                  relative p-6 rounded-xl border-2 transition-all text-left
                  ${isSelected 
                    ? `border-tech-cyan bg-gradient-to-br ${info.color} bg-opacity-20` 
                    : 'border-gray-700 bg-tech-blue/30 hover:border-gray-500'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selectedBorder"
                    className="absolute inset-0 rounded-xl border-2 border-tech-cyan pointer-events-none"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="text-4xl mb-3">{info.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{info.name}</h3>
                <p className="text-sm text-gray-400">{info.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStart}
        className="px-12 py-4 bg-gradient-to-r from-tech-cyan to-tech-purple text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-tech-cyan/25 transition-all"
      >
        🎮 开始游戏
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl w-full"
      >
        {[
          { icon: '💥', title: '缓存击穿', desc: '热点key过期引发的雪崩' },
          { icon: '💩', title: '脏数据', desc: '数据不一致引发的错误' },
          { icon: '⏰', title: '过期误读', desc: 'TTL设置不合理' },
          { icon: '⌛', title: '请求超时', desc: '缓存操作不及时' },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
            className="p-4 bg-tech-blue/30 rounded-xl border border-gray-700"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <h4 className="font-bold text-white mb-1">{item.title}</h4>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="mt-8 text-center text-gray-500 text-sm max-w-2xl"
      >
        <p className="mb-2">💡 <strong className="text-gray-400">游戏提示：</strong></p>
        <p>点击请求队列中的请求进行处理，或使用操作面板主动管理缓存。</p>
        <p>注意观察热点key预警，及时刷新缓存防止击穿！</p>
      </motion.div>
    </div>
  );
};
