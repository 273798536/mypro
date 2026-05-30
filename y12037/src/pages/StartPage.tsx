import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Disc3, VolumeX, Zap, Clock, Play, Info } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { problemExplanations } from '@/game/explanations';

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const startGame = useGameStore((state) => state.startGame);

  const handleStart = () => {
    startGame();
    navigate('/game');
  };

  const problems = [
    {
      type: 'noise' as const,
      icon: <VolumeX size={32} />,
      title: '噪声',
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      borderColor: 'border-gray-600',
    },
    {
      type: 'pop' as const,
      icon: <Zap size={32} />,
      title: '爆音',
      color: 'text-red-400',
      bgColor: 'bg-red-950',
      borderColor: 'border-red-700',
    },
    {
      type: 'drift' as const,
      icon: <Clock size={32} />,
      title: '节拍漂移',
      color: 'text-amber-400',
      bgColor: 'bg-amber-950',
      borderColor: 'border-amber-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <Disc3 size={64} className="text-amber-500" />
          </motion.div>
          <div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              黑胶唱片修复师
            </h1>
            <p className="text-gray-400 mt-2 text-lg">音乐社教学小游戏</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-3xl w-full mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Info size={20} className="text-amber-500" />
          <h2 className="text-xl font-semibold text-amber-300">需要修复的三种问题</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`${problem.bgColor} ${problem.borderColor} border rounded-2xl p-5 hover:scale-105 transition-transform`}
            >
              <div className={`${problem.color} mb-3`}>{problem.icon}</div>
              <h3 className={`text-lg font-bold mb-2 ${problem.color}`}>
                {problem.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {problemExplanations[problem.type]}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-2xl w-full mb-10 bg-gray-900/50 rounded-2xl p-6 border border-gray-800"
      >
        <h2 className="text-xl font-semibold text-amber-300 mb-4">游戏玩法</h2>
        <ol className="space-y-3 text-gray-300">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-sm font-bold">
              1
            </span>
            <span>观察旋转的黑胶唱片，识别上面的问题标记</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-sm font-bold">
              2
            </span>
            <span>选择正确的工具：灰色斑点用「消除噪声」，红色星号用「修复爆音」，黄色箭头用「校准节拍」</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-sm font-bold">
              3
            </span>
            <span>点击唱片上的问题点进行修复，注意节拍校准需要把握好时机！</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-700 flex items-center justify-center text-sm font-bold">
              !
            </span>
            <span className="text-red-400">特别注意：不要在没有标记的原声区域点击，这是最严重的错误！</span>
          </li>
        </ol>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStart}
        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xl font-bold rounded-2xl shadow-lg shadow-amber-500/30 transition-all"
      >
        <Play size={28} fill="currentColor" />
        开始修复唱片
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-6 text-gray-500 text-sm"
      >
        一局游戏 90 秒，修复所有问题或时间耗尽即结束
      </motion.p>
    </div>
  );
};
