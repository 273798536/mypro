import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Play, History, Settings, TrendingUp, TrendingDown, Shield, DollarSign } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { startGame, games, getActiveConfig } = useGameStore();
  const config = getActiveConfig();

  const handleStartGame = () => {
    startGame(100000);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">基金组合迷宫</h1>
              <p className="text-xs text-slate-400">Fund Maze</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              <History className="w-4 h-4" />
              历史记录
            </button>
            <button
              onClick={() => navigate('/config')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              <Settings className="w-4 h-4" />
              配置
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              不要只看收益
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                走对投资的路
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              通过迷宫游戏体验真实投资中的风险与回报。每一次选择都会影响你的路线，
              感受回撤、分散投资和手续费如何影响最终收益。
            </p>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow"
              >
                <Play className="w-5 h-5" />
                开始游戏
              </motion.button>
              <div className="text-sm text-slate-500 self-center">
                当前配置: {config.name} v{config.version}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-700">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -10, 0],
                      transition: { 
                        repeat: Infinity, 
                        duration: 2,
                        delay: i * 0.3
                      }
                    }}
                    className="bg-slate-700/50 rounded-xl p-4 text-center"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{i}</span>
                    </div>
                    <div className="text-xs text-slate-400">选择点</div>
                  </motion.div>
                ))}
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                  animate={{ width: ['0%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              <div className="mt-4 text-center text-sm text-slate-400">
                8步通关 · 4次选择 · 3条路线
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: TrendingDown, title: '感受回撤', desc: '行业集中触发回撤，体验真实市场波动', color: 'from-red-400 to-rose-500' },
            { icon: Shield, title: '分散投资', desc: '多行业配置，降低单一风险敞口', color: 'from-emerald-400 to-teal-500' },
            { icon: DollarSign, title: '手续费', desc: '频繁交易增加成本，学会长期持有', color: 'from-blue-400 to-indigo-500' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {games.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">最近游戏</h3>
            <div className="space-y-3">
              {games.slice(-3).reverse().map((game, i) => {
                const returnPercent = ((game.currentCapital - game.startCapital) / game.startCapital) * 100;
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => navigate(`/review/${game.id}`)}
                  >
                    <div>
                      <div className="text-white font-medium">游戏 #{games.length - i}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(game.startTime).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className={`font-semibold ${returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
