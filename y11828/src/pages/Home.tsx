import { useState } from 'react';
import { LEVELS } from '../data/levels';
import { MINECART_CONFIGS } from '../data/minecarts';
import { useGameStore } from '../store/gameStore';
import type { Level, MinecartConfig } from '../types/game';
import { Play, Settings, Zap, Gauge, Weight, Leaf, Target, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function Home() {
  const [selectedLevel, setSelectedLevel] = useState<Level>(LEVELS[0]);
  const [selectedCart, setSelectedCart] = useState<MinecartConfig>(MINECART_CONFIGS[0]);
  const { startGame, setMinecartConfig } = useGameStore();

  const handleStart = () => {
    setMinecartConfig(selectedCart);
    startGame(selectedLevel, selectedCart);
  };

  const getLevelTypeIcon = (type: string) => {
    if (type === 'border') {
      return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
    return <Target className="w-4 h-4 text-cyan-400" />;
  };

  const getLevelTypeLabel = (type: string) => {
    return type === 'border' ? '边界样例' : '常规关卡';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            月球矿车轨道赛
          </h1>
          <p className="text-slate-400 text-lg">
            在低重力矿区切换轨道，把矿石送回基地，精打细算地使用能量
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              选择关卡
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {LEVELS.map((level, index) => (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  onClick={() => setSelectedLevel(level)}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${selectedLevel.id === level.id ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getLevelTypeIcon(level.type)}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {getLevelTypeLabel(level.type)}
                      </span>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedLevel.id === level.id ? 'text-cyan-400 translate-x-1' : 'text-slate-500'}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{level.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{level.description}</p>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {level.initialEnergy} kJ
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {level.oreLocations.length} 矿石仓
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              矿车配置
            </h2>
            <div className="space-y-3">
              {MINECART_CONFIGS.map((cart, index) => (
                <motion.div
                  key={cart.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  onClick={() => setSelectedCart(cart)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${selectedCart.id === cart.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{cart.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${selectedCart.id === cart.id ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Weight className="w-3 h-3" />
                      <span>质量: {cart.mass}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Leaf className="w-3 h-3" />
                      <span>摩擦: {cart.friction}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Zap className="w-3 h-3" />
                      <span>能耗: {cart.energyConsumption}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Gauge className="w-3 h-3" />
                      <span>极速: {cart.maxSpeed}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-lg font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/40"
          >
            <Play className="w-6 h-6" />
            <span>开始运行</span>
          </button>
          <p className="mt-4 text-slate-500 text-sm">
            种子: {selectedLevel.seed} (保证每次运行结果一致)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3">
              <Gauge className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-semibold mb-2">真实物理模拟</h3>
            <p className="text-slate-400 text-sm">低重力惯性会真的改变局面，轨道状态影响矿车行驶轨迹</p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="font-semibold mb-2">失败原因拆解</h3>
            <p className="text-slate-400 text-sm">不再只用一个总分糊过去，详细告诉你为什么失败</p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
              <ChevronRight className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">修改对比分析</h3>
            <p className="text-slate-400 text-sm">改一处重跑，系统自动高亮显示影响了哪些结果</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
