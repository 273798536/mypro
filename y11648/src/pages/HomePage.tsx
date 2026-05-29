import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { levels } from '../data/levels';
import { useGameStore } from '../store/gameStore';
import { ensureSampleReplayData } from '../utils/sampleReplayData';
import { Ship, Anchor, Waves, Fuel, PlayCircle } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { initGame } = useGameStore();

  useEffect(() => {
    ensureSampleReplayData();
  }, []);

  const handleSelectLevel = (levelId: number) => {
    const level = levels.find((l) => l.id === levelId);
    if (level) {
      initGame(level);
      navigate('/game');
    }
  };

  const difficultyColors: Record<string, string> = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    hard: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  const difficultyLabels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-500" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-cyan-500/10 rounded-full border border-cyan-500/30"
          >
            <Waves className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 font-medium">港口调度培训系统</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              港口拖轮潮汐局
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            在潮汐窗口和泊位占用的动态变化中，合理调度拖轮，完成船舶靠离泊作业。
            <br />
            <span className="text-amber-400">警惕拖轮冲突、潮汐错过、燃油不足！</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 w-full max-w-4xl"
        >
          {[
            { icon: Ship, label: '船舶调度', desc: '分配拖轮完成靠泊' },
            { icon: Anchor, label: '泊位管理', desc: '合理利用泊位资源' },
            { icon: Waves, label: '潮汐窗口', desc: '把握最佳作业时机' },
            { icon: Fuel, label: '燃油监控', desc: '避免拖轮燃油耗尽' },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-4 bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 text-center"
            >
              <item.icon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-white font-medium mb-1">{item.label}</div>
              <div className="text-xs text-slate-500">{item.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">选择关卡</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {levels.map((level, index) => (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectLevel(level.id)}
                className="p-6 bg-slate-800/70 backdrop-blur rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl font-bold text-cyan-400">{level.id}</div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${difficultyColors[level.difficulty]}`}>
                    {difficultyLabels[level.difficulty]}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {level.name}
                </h3>

                <p className="text-sm text-slate-400 mb-4">{level.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>🚢 {level.tugs.length} 拖轮</span>
                  <span>⚓ {level.ships.length} 船舶</span>
                  <span>🌊 {level.tideWindows.length} 潮汐</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-8 w-full max-w-4xl"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/replay')}
            className="w-full p-5 bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold">调度回放</div>
                <div className="text-sm text-slate-400">查看历史游戏记录，分析调度过程</div>
              </div>
            </div>
            <div className="text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-500">
            💡 操作提示：点击拖轮选中，再点击船舶分配任务，或点击地图移动拖轮
          </p>
        </motion.div>
      </div>

      <footer className="relative py-6 text-center text-sm text-slate-600 border-t border-slate-800">
        <p>港口拖轮潮汐局 - 调度培训模拟器 v1.0</p>
      </footer>
    </div>
  );
};

export default HomePage;
