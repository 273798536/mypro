import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, X, TrendingUp, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StartPage() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useState(() => {
    try {
      const saved = localStorage.getItem('bond-duration-puzzle-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phase === 'playing' || parsed.phase === 'paused') {
          setHasSavedGame(true);
        }
      }
    } catch {
      // localStorage may be unavailable
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      </motion.div>

      <motion.div
        className="relative z-10 text-center max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="text-amber-400 text-sm tracking-widest mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          金融投教 · 互动学习
        </motion.div>

        <motion.h1
          className="text-5xl md:text-6xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          债券久期拼图
        </motion.h1>

        <motion.p
          className="text-slate-400 text-lg mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          通过拖拽债券卡牌，理解久期与利率变化的关系
          <br />
          在操作中学习，而非死记硬背公式
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={() => navigate('/levels')}
            className="group flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25"
          >
            <Play className="w-5 h-5" />
            {hasSavedGame ? '继续游戏' : '开始游戏'}
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all duration-300 border border-slate-700"
          >
            <HelpCircle className="w-5 h-5" />
            玩法说明
          </button>
        </motion.div>

        <motion.div
          className="grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl">
            <TrendingUp className="w-8 h-8 text-amber-400 mb-2" />
            <span className="text-sm text-slate-300">曲线平移</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl">
            <Clock className="w-8 h-8 text-sky-400 mb-2" />
            <span className="text-sm text-slate-300">久期匹配</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl">
            <Award className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="text-sm text-slate-300">得分反馈</span>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative max-w-lg w-full bg-slate-800 rounded-2xl p-6 border border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">玩法说明</h2>

              <div className="space-y-4 text-slate-300 text-sm">
                <div>
                  <h3 className="font-medium text-amber-400 mb-1">🎯 游戏目标</h3>
                  <p>将债券卡牌拖入正确的久期槽位，调整收益率曲线方向，判断现金流权重，获得最高分。</p>
                </div>
                <div>
                  <h3 className="font-medium text-amber-400 mb-1">🖱️ 操作方式</h3>
                  <p>• 拖拽债券卡牌到久期槽位<br />
                     • 点击曲线按钮调整利率方向<br />
                     • 调整现金流权重滑块进行判断</p>
                </div>
                <div>
                  <h3 className="font-medium text-amber-400 mb-1">📊 评分规则</h3>
                  <p>• 正确放置债券：+30分（含时间奖励）<br />
                     • 错误操作：-20分<br />
                     • 曲线正确：+50分 / 错误：-30分<br />
                     • 现金流权重准确：+40分</p>
                </div>
                <div>
                  <h3 className="font-medium text-amber-400 mb-1">⚠️ 注意事项</h3>
                  <p>长短久期混放、曲线方向错误、现金流权重误判都会被明确提示，不会悄悄算进正常结果。</p>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
