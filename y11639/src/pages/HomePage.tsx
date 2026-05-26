import { useState } from 'react';
import { useGameStore, getAllLevels } from '../store/gameStore';
import { InstructionModal } from '../components/InstructionModal';
import { useNavigate } from 'react-router-dom';
import type { LevelConfig } from '../types/game';

const difficultyColors = {
  easy: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: '简单' },
  normal: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: '普通' },
  hard: { bg: 'bg-red-500', text: 'text-red-400', label: '困难' }
};

export function HomePage() {
  const navigate = useNavigate();
  const levels = getAllLevels();
  const startLevel = useGameStore(s => s.startLevel);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleStartLevel = (levelId: string) => {
    startLevel(levelId);
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="text-6xl">⚡</span>
            <div className="text-left">
              <h1 className="text-5xl font-bold text-white mb-2">配电抢修回合战</h1>
              <p className="text-xl text-slate-400">Power Repair Turn-Based Battle</p>
            </div>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg">
            模拟风暴后电力抢修调度，在医院与居民区之间做出权衡。
            掌握优先级规则、冷却时间、备件管理，成为优秀的抢修指挥员！
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>🎮</span> 选择关卡
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {levels.map((level) => (
              <LevelCard key={level.id} level={level} onStart={handleStartLevel} />
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowInstructions(true)}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all hover:scale-105"
          >
            📖 查看游戏说明
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
          <FeatureCard icon="🎯" title="优先级调度" desc="医院优先，合理分配资源" />
          <FeatureCard icon="⏱️" title="冷却时间" desc="队伍恢复后才能再次派遣" />
          <FeatureCard icon="📦" title="备件管理" desc="每次抢修消耗备件" />
          <FeatureCard icon="⚠️" title="超时惩罚" desc="区域超时将扣除大量分数" />
        </div>
      </div>

      <InstructionModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
}

function LevelCard({ level, onStart }: { level: LevelConfig; onStart: (id: string) => void }) {
  const diff = difficultyColors[level.difficulty];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-600 p-6 hover:border-slate-500 transition-all hover:scale-105 hover:shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${diff.bg} text-white`}>
          {diff.label}
        </span>
        <span className="text-slate-400 text-sm">{level.maxRounds} 回合</span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{level.name}</h3>
      <p className="text-slate-400 text-sm mb-4 h-12">{level.description}</p>

      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
        <span>👥 {level.initialTeams.length} 支队伍</span>
        <span>📍 {level.initialAreas.length} 个区域</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {level.initialAreas.slice(0, 4).map(area => (
          <span
            key={area.id}
            className={`px-2 py-0.5 text-xs rounded ${
              area.priority === 1
                ? 'bg-red-500/20 text-red-400'
                : area.priority <= 3
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {area.name}
          </span>
        ))}
        {level.initialAreas.length > 4 && (
          <span className="text-xs text-slate-500">+{level.initialAreas.length - 4}</span>
        )}
      </div>

      <button
        onClick={() => onStart(level.id)}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all"
      >
        开始游戏 →
      </button>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4 text-center">
      <span className="text-3xl mb-2 block">{icon}</span>
      <h4 className="text-white font-bold mb-1">{title}</h4>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  );
}