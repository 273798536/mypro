import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Gavel, Clock, Target, Lightbulb, ArrowRight, Star } from 'lucide-react';
import type { Difficulty } from '@/types';
import { DIFFICULTY_LABELS, DIFFICULTY_CONFIG } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';

export default function StartPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const startGame = useGameStore((state) => state.startGame);
  const navigate = useNavigate();

  const handleStart = () => {
    startGame(selectedDifficulty);
    navigate('/game');
  };

  const features = [
    {
      icon: Music,
      title: '线索关联',
      description: '将歌曲片段、平台通知、采样记录等线索正确归类到对应案件',
    },
    {
      icon: Gavel,
      title: '合同判定',
      description: '根据证据做出授权通过、驳回或需补充材料的专业判定',
    },
    {
      icon: Lightbulb,
      title: '风险识别',
      description: '自动识别授权过期、采样超限、同名曲混淆等关键风险点',
    },
    {
      icon: Target,
      title: '复盘学习',
      description: '详细的得分分析和案件复盘，人话解释让你一看就懂',
    },
  ];

  const rules = [
    '从左侧线索池拖拽线索卡片到中间对应案件中',
    '正确关联 +10分，错误关联 -5分',
    '发现风险点额外 +20分',
    '收集足够证据后可做出判定，正确判定 +50分，错误 -30分',
    '每秒消耗 0.1分，提前完成每秒奖励 0.5分',
    '未完成的案件每个扣 100分',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -30, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-20 left-10 text-6xl opacity-10"
        >
          🎵
        </motion.div>
        <motion.div
          animate={{
            y: [0, 30, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute top-40 right-20 text-7xl opacity-10"
        >
          ⚖️
        </motion.div>
        <motion.div
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute bottom-20 left-1/4 text-5xl opacity-10"
        >
          📄
        </motion.div>
      </div>

      <div className="relative container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/20 rounded-full mb-6"
          >
            <Star className="text-accent-400" size={16} />
            <span className="text-accent-300 text-sm font-medium">版权法从业者专属训练</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-4">
            音乐版权拼案
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            在游戏中练习线索关联、风险识别和合同判定能力
            <br />
            <span className="text-accent-400">授权过期一出现，系统帮你精准定位</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="glass-panel p-6 card-shadow-hover"
            >
              <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="text-accent-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/60">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="glass-panel p-8"
          >
            <h2 className="text-2xl font-serif font-bold text-white mb-6 flex items-center gap-3">
              <Clock className="text-accent-400" size={28} />
              游戏规则
            </h2>
            <ul className="space-y-3">
              {rules.map((rule, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  className="flex items-start gap-3 text-white/80"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-accent-500/20 text-accent-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span>{rule}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="glass-panel p-8"
          >
            <h2 className="text-2xl font-serif font-bold text-white mb-6">选择难度</h2>
            <div className="space-y-4 mb-8">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff, index) => {
                const config = DIFFICULTY_CONFIG[diff];
                const isSelected = selectedDifficulty === diff;
                
                return (
                  <motion.button
                    key={diff}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-accent-500 bg-accent-500/20'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {DIFFICULTY_LABELS[diff]}
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          {config.caseCount} 个案件 · {config.clueCount} 条线索 · {Math.floor(config.timeLimit / 60)} 分钟
                        </p>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center"
                        >
                          <span className="text-white text-sm">✓</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-3 text-lg"
            >
              开始游戏
              <ArrowRight size={20} />
            </Button>
          </motion.div>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-center text-white/40 text-sm"
        >
          <p>💡 提示：游戏结束后会生成详细的结案报告，可以分享给同事一起学习</p>
        </motion.footer>
      </div>
    </div>
  );
}
