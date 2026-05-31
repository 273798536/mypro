import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { levels } from '../data/levels';
import {
  getDifficultyColor,
  getDifficultyText,
  getFocusPointText,
} from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6">
            <span className="text-2xl">🔍</span>
            <span className="text-blue-400 text-sm font-medium">金融风控培训系统</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            风控黑名单追踪局
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            深入理解关系链过长、设备共享误伤、标签滞后三大风控痛点
            <br />
            在实战中学习，在复盘中成长
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => setShowRules(!showRules)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
          >
            📖 游戏规则
          </button>
        </div>

        <motion.div
          initial={false}
          animate={{ height: showRules ? 'auto' : 0, opacity: showRules ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden mb-12"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-white">游戏规则</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="text-3xl mb-3">🔗</div>
                <h3 className="font-semibold text-white mb-2">关系链过长</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  核心风险节点的直接关联（1-2度）风险较高，但超过3度的关系链需要结合具体证据判断。
                  正常的商业往来即使有资金往来也不构成风险。
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="text-3xl mb-3">💻</div>
                <h3 className="font-semibold text-white mb-2">设备共享误伤</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  设备共享不等于风险关联。家人共用、同事共用设备是正常现象。
                  判断关键在于账户之间的资金往来和交易行为，而非仅仅共用设备。
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="text-3xl mb-3">🏷️</div>
                <h3 className="font-semibold text-white mb-2">标签滞后</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  风险标签有保质期。历史标签可能已更新，曾经有风险的用户可能已洗白，
                  原本安全的用户也可能变成高风险。务必查看最新材料。
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-900/20 border border-amber-700/30 rounded-xl">
              <p className="text-amber-300 text-sm">
                <span className="font-semibold">操作说明：</span>
                点击图谱中的节点查看详情，查看右侧材料面板获取证据，然后在操作面板中为每个节点标记风险等级（安全/可疑/黑名单）。
                错误次数达到上限将任务失败，准确率达到70%以上即可通关。
              </p>
            </div>
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold mb-6 text-white">选择关卡</h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-3 gap-6"
        >
          {levels.map((level, index) => (
            <motion.div
              key={level.id}
              variants={item}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl font-mono font-bold text-slate-600 group-hover:text-blue-400 transition-colors">
                    0{index + 1}
                  </span>
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full text-white font-medium ${getDifficultyColor(
                        level.difficulty
                      )}`}
                    >
                      {getDifficultyText(level.difficulty)}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {level.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4 flex-grow">
                  {level.description}
                </p>

                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                    🎯 {getFocusPointText(level.focusPoint)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>👤 {level.nodes.length} 个节点</span>
                  <span>📋 {level.materials.length} 份材料</span>
                  <span>❌ 最多{level.maxMistakes}次错误</span>
                </div>

                <button
                  onClick={() => navigate(`/game/${level.id}`)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>开始挑战</span>
                  <span>→</span>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center text-slate-500 text-sm"
        >
          <p>© 2024 风控黑名单追踪局 | 金融风控培训系统</p>
        </motion.div>
      </div>
    </div>
  );
}
