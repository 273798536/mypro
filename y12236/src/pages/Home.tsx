import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Rocket, Play, BookOpen, TrendingUp, Zap, Shield, Clock } from 'lucide-react';
import StarField from '../components/StarField';
import { useGameStore } from '../store/gameStore';

const rules = [
  {
    icon: <TrendingUp className="text-neon-cyan" size={24} />,
    title: 'Delta (Δ)',
    description: '期权价格对标的价格的敏感度，控制飞船左右方向',
    color: 'border-neon-cyan',
  },
  {
    icon: <Zap className="text-neon-purple" size={24} />,
    title: 'Gamma (Γ)',
    description: 'Delta的变化率，Gamma门可能延迟到达，需要谨慎判断',
    color: 'border-neon-purple',
  },
  {
    icon: <Shield className="text-neon-yellow" size={24} />,
    title: 'Vega (ν)',
    description: '期权对波动率的敏感度，波动率风暴会剧烈影响',
    color: 'border-neon-yellow',
  },
  {
    icon: <Clock className="text-neon-red" size={24} />,
    title: 'Theta (θ)',
    description: '时间衰减，每过一天期权价值的减少量',
    color: 'border-neon-red',
  },
];

const features = [
  {
    icon: '🎮',
    title: '沉浸式游戏体验',
    description: '驾驶飞船穿越金融宇宙，在动态市场中学习期权希腊字母',
  },
  {
    icon: '⚡',
    title: '真实风险场景',
    description: '波动率风暴、Gamma门延迟、信息冲突等真实交易场景模拟',
  },
  {
    icon: '📊',
    title: '完整复盘系统',
    description: '每局结束后可回放全过程，分析决策点和希腊值变化',
  },
  {
    icon: '📋',
    title: '可分享飞行报告',
    description: '一键生成结构化报告，包含结算口径，直接发给同事',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { startGame } = useGameStore();

  const handleStart = () => {
    startGame();
    navigate('/flight');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
              <Rocket className="text-neon-cyan" size={28} />
            </div>
            <div>
              <h1 className="font-orbitron text-xl text-white">期权希腊字母飞船</h1>
              <p className="text-xs text-gray-400">Options Greeks Spaceship</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 rounded-lg border border-neon-cyan/50 text-neon-cyan text-sm hover:bg-neon-cyan/10 transition-colors"
            >
              飞行报告
            </button>
          </div>
        </motion.header>

        <main className="container px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-16"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block mb-6"
            >
              <div className="text-8xl mb-4">🚀</div>
            </motion.div>
            <h1 className="font-orbitron text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-yellow bg-clip-text text-transparent">
              期权希腊字母飞船
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              在浩瀚的金融宇宙中驾驶飞船，学习Delta、Gamma、Vega、Theta的动态变化，
              应对波动率风暴，处理延迟数据，在信息冲突中做出正确判断
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="btn-neon-green px-8 py-4 text-lg font-orbitron flex items-center gap-3 mx-auto"
            >
              <Play size={24} />
              开始飞行任务
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-16"
          >
            <h2 className="font-orbitron text-2xl text-center text-white mb-8 flex items-center justify-center gap-2">
              <BookOpen size={24} className="text-neon-cyan" />
              希腊字母对应关系
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rules.map((rule, index) => (
                <motion.div
                  key={rule.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className={`panel-glass p-5 border-t-2 ${rule.color} cursor-default`}
                >
                  <div className="mb-3">{rule.icon}</div>
                  <h3 className="font-orbitron text-lg text-white mb-2">{rule.title}</h3>
                  <p className="text-sm text-gray-400">{rule.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-16"
          >
            <h2 className="font-orbitron text-2xl text-center text-white mb-8">
              游戏特色
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="panel-glass p-6 flex gap-4"
                >
                  <div className="text-4xl">{feature.icon}</div>
                  <div>
                    <h3 className="font-orbitron text-lg text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="panel-glass p-6 max-w-3xl mx-auto"
          >
            <h3 className="font-orbitron text-lg text-neon-yellow mb-4">操作说明</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-neon-cyan/20 flex items-center justify-center text-neon-cyan flex-shrink-0">
                  ←→
                </div>
                <div>
                  <div className="text-white font-medium">方向控制</div>
                  <div className="text-gray-400">按住左右按钮调整飞船方向，对应Delta对冲方向</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center text-neon-green flex-shrink-0">
                  ±
                </div>
                <div>
                  <div className="text-white font-medium">仓位调整</div>
                  <div className="text-gray-400">点击加减按钮调整持仓数量</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-neon-yellow/20 flex items-center justify-center text-neon-yellow flex-shrink-0">
                  ⚠️
                </div>
                <div>
                  <div className="text-white font-medium">事件处理</div>
                  <div className="text-gray-400">及时响应事件，选择对冲、接受或拒绝</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-neon-purple/20 flex items-center justify-center text-neon-purple flex-shrink-0">
                  📝
                </div>
                <div>
                  <div className="text-white font-medium">冲突处理</div>
                  <div className="text-gray-400">信息冲突时先留痕再判断，超时会扣分</div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="text-center py-8 text-gray-500 text-sm"
        >
          <p>期权希腊字母飞船 - 金融衍生品教学工具</p>
          <p className="mt-1">通过游戏化方式学习期权风险管理知识</p>
        </motion.footer>
      </div>
    </div>
  );
}
