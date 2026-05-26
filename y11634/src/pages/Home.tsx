import { motion } from 'framer-motion'
import GameCanvas from '../components/game/GameCanvas'
import StatusPanel from '../components/ui/StatusPanel'
import ControlPanel from '../components/ui/ControlPanel'
import EventToast from '../components/ui/EventToast'
import { useGameStore } from '../store/useGameStore'

const Home = () => {
  const { status } = useGameStore()

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      <EventToast />

      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
              🚀 太空矿车轨道调度
            </h1>
            <p className="text-slate-400">
              小行星基地运输系统 · 合理规划轨道 · 安全高效运输
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full lg:w-64 space-y-4"
            >
              <StatusPanel />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-shrink-0"
            >
              <GameCanvas />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full lg:w-64"
            >
              <ControlPanel />
            </motion.div>
          </div>

          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 max-w-2xl mx-auto"
            >
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">🎯 游戏目标</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⛏</span>
                    <div>
                      <p className="font-medium text-white">采集矿石</p>
                      <p className="text-slate-500">矿车会自动在矿场装载矿石</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🏭</span>
                    <div>
                      <p className="font-medium text-white">运送仓库</p>
                      <p className="text-slate-500">将矿石安全运送到仓库</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚙</span>
                    <div>
                      <p className="font-medium text-white">切换轨道</p>
                      <p className="text-slate-500">点击岔口切换矿车行驶路线</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium text-white">避免碰撞</p>
                      <p className="text-slate-500">防止矿车相撞和陨石撞击</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h4 className="font-medium text-white mb-2">🎮 操作说明</h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• 点击紫色岔口(⚙)图标切换轨道方向</li>
                    <li>• 每次切换消耗 5 点能量</li>
                    <li>• 矿车会自动沿轨道行驶</li>
                    <li>• 运送 100 单位矿石即可胜利</li>
                    <li>• 能量耗尽或矿车碰撞则游戏失败</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 text-center"
            >
              <div className="inline-block bg-slate-800/80 backdrop-blur-sm rounded-xl px-8 py-4 border border-yellow-500/30">
                <p className="text-yellow-400 text-lg font-medium">
                  🎮 游戏已结束，点击"查看报告"查看详细分析
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
