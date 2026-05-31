import React from 'react';
import { Play, Star, Gauge, DollarSign, Wind } from 'lucide-react';
import { levels } from '../data/levels';
import { useGameStore } from '../store/useGameStore';

export const LevelSelect: React.FC = () => {
  const selectLevel = useGameStore(state => state.selectLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-wider">
          <span className="text-cyan-400">桥梁振动</span>塔防
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          搭建桥梁结构，抵御风载振动，保留完整证据链
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {levels.map((level, index) => (
          <div
            key={level.id}
            className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group cursor-pointer"
            onClick={() => selectLevel(level.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl font-bold text-slate-600 group-hover:text-cyan-500 transition-colors">
                0{index + 1}
              </span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < level.difficulty ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{level.name}</h3>
            <p className="text-slate-400 text-sm mb-6">{level.description}</p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign size={14} className="text-emerald-400" />
                <span className="text-slate-300">预算上限:</span>
                <span className="text-emerald-400 font-mono">¥{level.totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind size={14} className="text-cyan-400" />
                <span className="text-slate-300">目标风载:</span>
                <span className="text-cyan-400 font-mono">Lv.{level.targetWindLevel}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gauge size={14} className="text-orange-400" />
                <span className="text-slate-300">初始节点:</span>
                <span className="text-orange-400 font-mono">{level.initialNodes.length}个</span>
              </div>
            </div>

            <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors group-hover:shadow-lg group-hover:shadow-cyan-500/30">
              <Play size={18} />
              开始挑战
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-slate-500 text-sm max-w-lg">
        <p className="mb-2">💡 游戏提示:</p>
        <p>• 点击节点可以修改位置和备注，每次修改都会记录版本</p>
        <p>• 添加阻尼器可以有效抑制共振，但会消耗预算</p>
        <p>• 结算时可导出完整证据链JSON文件</p>
      </div>
    </div>
  );
};
