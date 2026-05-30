import { motion } from 'framer-motion';
import { ArrowLeft, Package, AlertTriangle, Clock, ListOrdered, TrendingUp, Zap, Lightbulb, BookOpen, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HelpPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-[#3a3a52] bg-[#1a1a2e]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/"
              className="w-10 h-10 bg-[#3a3a52] hover:bg-[#4a4a62] rounded-lg flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">游戏说明</h1>
              <p className="text-xs text-gray-400">了解如何准备包裹卡和复现教学场景</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen size={24} className="text-blue-400" />
            游戏简介
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            算法快递分拣场是一款用于教学排序算法与优先队列的互动游戏。
            玩家扮演分拣员，在限时内将不同类型的包裹分配到三条分拣线进行处理。
            通过选择不同的队列策略和路径算法，直观理解算法权衡。
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
              <Package size={32} className="mx-auto mb-2 text-gray-300" />
              <h3 className="font-bold text-white mb-1">普通件</h3>
              <p className="text-xs text-gray-400">标准优先级，正常处理时间</p>
            </div>
            <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
              <AlertTriangle size={32} className="mx-auto mb-2 text-red-400" />
              <h3 className="font-bold text-white mb-1">急件</h3>
              <p className="text-xs text-gray-400">高优先级，超时会触发饥饿问题</p>
            </div>
            <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
              <Clock size={32} className="mx-auto mb-2 text-yellow-400" />
              <h3 className="font-bold text-white mb-1">破损件</h3>
              <p className="text-xs text-gray-400">需要额外处理时间，容易超时</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Package size={24} className="text-green-400" />
            包裹卡准备
          </h2>
          <p className="text-gray-300 mb-4">
            游戏内置了多种教学场景预设，也可以通过修改配置自定义包裹生成规则：
          </p>
          <div className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-gray-400">// 包裹配置字段说明</div>
            <div><span className="text-blue-400">duration</span>: <span className="text-yellow-400">120</span> <span className="text-gray-500">// 游戏时长（秒）</span></div>
            <div><span className="text-blue-400">packageInterval</span>: <span className="text-yellow-400">[2, 5]</span> <span className="text-gray-500">// 包裹生成间隔范围</span></div>
            <div><span className="text-blue-400">urgentRatio</span>: <span className="text-yellow-400">0.2</span> <span className="text-gray-500">// 急件占比 20%</span></div>
            <div><span className="text-blue-400">damagedRatio</span>: <span className="text-yellow-400">0.1</span> <span className="text-gray-500">// 破损件占比 10%</span></div>
            <div><span className="text-blue-400">priorityWeights</span>: <span className="text-yellow-400">[0.4, 0.3, 0.15, 0.1, 0.05]</span></div>
            <div className="text-gray-500">// 优先级 1-5 的权重，P1 最低，P5 最高</div>
          </div>
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-1">
              <Lightbulb size={16} />
              讲师提示
            </h3>
            <p className="text-sm text-blue-200">
              修改 <code className="bg-blue-500/20 px-1 rounded">src/config/presets.ts</code> 文件中的预设配置，
              可以创建自定义教学场景。每个场景可以设置不同的包裹生成规则，用于演示特定的算法问题。
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={24} className="text-red-400" />
            复现急件饥饿问题
          </h2>
          <p className="text-gray-300 mb-4">
            急件饥饿（Starvation）是指高优先级的急件长时间得不到处理的现象。
            以下是稳定复现该问题的步骤：
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-bold text-white">选择场景</h3>
                <p className="text-sm text-gray-400">
                  在游戏控制面板中，点击场景选择按钮，选择"急件饥饿演示"场景。
                  该场景配置了大量低优先级包裹和少量高优先级急件。
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-bold text-white">设置策略</h3>
                <p className="text-sm text-gray-400">
                  将队列策略设置为"先进先出 (FIFO)"，路径策略设置为"目的地匹配"。
                  FIFO 策略会严格按照包裹到达顺序处理，不会优先处理急件。
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-bold text-white">开始游戏</h3>
                <p className="text-sm text-gray-400">
                  点击"开始"按钮，观察急件在队列中等待的情况。
                  当急件等待时间超过阈值（默认 15 秒）时，会触发"急件饥饿"异常。
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-bold text-green-400">对比优化</h3>
                <p className="text-sm text-gray-400">
                  当观察到急件饥饿现象后，暂停游戏，将队列策略切换为"优先级排序"。
                  观察高优先级急件如何被优先处理，饥饿问题如何得到解决。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#1a1a2e] rounded-lg">
            <h4 className="text-sm font-bold text-gray-300 mb-2">关键配置参数（饥饿场景）</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">急件占比</span>
                <span className="text-white font-mono">10%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">普通件占比</span>
                <span className="text-white font-mono">90%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">低优先级权重</span>
                <span className="text-white font-mono">P1: 60%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">饥饿阈值</span>
                <span className="text-white font-mono">15秒</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ListOrdered size={24} className="text-purple-400" />
            队列策略对比
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#3a3a52]">
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">策略</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">算法原理</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">优点</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">缺点</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">适用场景</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#3a3a52]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ListOrdered size={16} className="text-blue-400" />
                      <span className="text-white font-bold">FIFO</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">先进先出，按到达顺序处理</td>
                  <td className="py-3 px-4 text-green-400">公平，无饥饿</td>
                  <td className="py-3 px-4 text-red-400">急件可能被阻塞</td>
                  <td className="py-3 px-4 text-gray-400">任务重要性相近</td>
                </tr>
                <tr className="border-b border-[#3a3a52]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-yellow-400" />
                      <span className="text-white font-bold">优先级</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">高优先级先处理，内部 FIFO</td>
                  <td className="py-3 px-4 text-green-400">急件优先处理</td>
                  <td className="py-3 px-4 text-red-400">低优先级可能饥饿</td>
                  <td className="py-3 px-4 text-gray-400">有明确优先级区分</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-green-400" />
                      <span className="text-white font-bold">SJF</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">处理时间短的优先</td>
                  <td className="py-3 px-4 text-green-400">吞吐量最大</td>
                  <td className="py-3 px-4 text-red-400">长作业等待时间长</td>
                  <td className="py-3 px-4 text-gray-400">处理时间已知且差异大</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Play size={24} className="text-green-400" />
            操作指南
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a2e] rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">基本操作</h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>选择教学场景预设</li>
                <li>点击"开始"按钮启动游戏</li>
                <li>点击待分拣包裹进行选择</li>
                <li>点击目标分拣线完成分配</li>
                <li>观察异常并调整策略</li>
              </ol>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">游戏控制</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>⏸ 暂停：随时暂停调整策略</li>
                <li>⏩ 倍速：1x/2x/3x 加速模拟</li>
                <li>🔄 重开：重置当前场景</li>
                <li>📊 复盘：游戏结束后查看时间轴</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <div className="text-center pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            <Play size={18} />
            开始游戏
          </Link>
        </div>
      </main>
    </div>
  );
}
