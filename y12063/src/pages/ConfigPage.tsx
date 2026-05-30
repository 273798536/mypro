import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { DEFAULT_PROJECTS, DIFFICULTY_SETTINGS } from '../data/projects';
import { hashConfig } from '../utils/helpers';
import type { GameConfig, ProjectCard, DebtConfig } from '../types';
import {
  Building2,
  Coins,
  Settings,
  Play,
  Upload,
  ChevronRight,
  Shield,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

function ProjectCardItem({
  card,
  selected,
  onToggle,
}: {
  card: ProjectCard;
  selected: boolean;
  onToggle: () => void;
}) {
  const riskColors = {
    low: 'text-emerald bg-emerald/10 border-emerald/30',
    medium: 'text-amber bg-amber/10 border-amber/30',
    high: 'text-coral bg-coral/10 border-coral/30',
  };
  const riskLabels = { low: '低风险', medium: '中风险', high: '高风险' };

  return (
    <button
      onClick={onToggle}
      className={`relative w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
        selected
          ? 'border-amber bg-amber/5 shadow-lg shadow-amber/10'
          : 'border-midnight-lighter bg-midnight-light hover:border-midnight-lighter/80 hover:shadow-md'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
          <ChevronRight size={12} className="text-midnight" />
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm text-slate-200">{card.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${riskColors[card.riskLevel]}`}>
          {riskLabels[card.riskLevel]}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{card.category}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-slate-500">投资额</span>
          <p className="font-mono font-semibold text-slate-300">{card.investmentAmount.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">预期收益</span>
          <p className="font-mono font-semibold text-emerald">{card.expectedRevenue.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">周期</span>
          <p className="font-mono font-semibold text-slate-300">{card.duration}回合</p>
        </div>
      </div>
    </button>
  );
}

export default function ConfigPage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(['p1', 'p4', 'p6']);
  const [debt, setDebt] = useState<DebtConfig>({
    totalDebt: 20000,
    interestRate: 0.045,
    interestType: 'fixed',
    repaymentTerm: 10,
  });
  const [totalRounds, setTotalRounds] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    const projects = DEFAULT_PROJECTS.filter((p) => selectedProjects.includes(p.id));
    const config: GameConfig = {
      projects,
      debt,
      totalRounds,
      difficulty,
      seed: hashConfig({ projects, debt, totalRounds }),
    };
    startGame(config);
    navigate('/game');
  };

  const handleJsonImport = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (data.projects) {
        const ids = data.projects.map((p: ProjectCard) => p.id);
        setSelectedProjects(ids);
      }
      if (data.debt) {
        setDebt(data.debt);
      }
      setShowJsonImport(false);
      setJsonInput('');
    } catch {
      alert('JSON格式错误，请检查输入');
    }
  };

  const totalInvestment = DEFAULT_PROJECTS.filter((p) =>
    selectedProjects.includes(p.id)
  ).reduce((sum, p) => sum + p.investmentAmount, 0);

  return (
    <div className="min-h-screen bg-midnight">
      <header className="border-b border-midnight-lighter">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center">
              <Building2 size={20} className="text-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">城市债务经营赛</h1>
              <p className="text-sm text-slate-400">配置项目卡与债务额度，开始经营决策</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-amber" />
                  <h2 className="text-lg font-semibold text-slate-200">项目卡选择</h2>
                  <span className="text-xs text-slate-500 ml-2">已选 {selectedProjects.length} 个</span>
                </div>
                <button
                  onClick={() => setShowJsonImport(!showJsonImport)}
                  className="flex items-center gap-1 text-xs text-amber hover:text-amber-light transition-colors"
                >
                  <Upload size={14} />
                  JSON导入
                </button>
              </div>

              {showJsonImport && (
                <div className="mb-4 p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"projects": [...], "debt": {...}}'
                    className="w-full h-32 bg-midnight border border-midnight-lighter rounded p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-amber/50 resize-none"
                  />
                  <button
                    onClick={handleJsonImport}
                    className="mt-2 px-4 py-1.5 text-xs bg-amber text-midnight rounded font-medium hover:bg-amber-light transition-colors"
                  >
                    确认导入
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {DEFAULT_PROJECTS.map((card) => (
                  <ProjectCardItem
                    key={card.id}
                    card={card}
                    selected={selectedProjects.includes(card.id)}
                    onToggle={() => toggleProject(card.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Coins size={18} className="text-amber" />
                <h2 className="text-lg font-semibold text-slate-200">债务额度配置</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <label className="block text-xs text-slate-400 mb-2">初始债务总额（万元）</label>
                  <input
                    type="number"
                    value={debt.totalDebt}
                    onChange={(e) => setDebt({ ...debt, totalDebt: Number(e.target.value) })}
                    className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 text-lg font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
                  />
                </div>
                <div className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <label className="block text-xs text-slate-400 mb-2">年利率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={(debt.interestRate * 100).toFixed(1)}
                    onChange={(e) => setDebt({ ...debt, interestRate: Number(e.target.value) / 100 })}
                    className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 text-lg font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
                  />
                </div>
                <div className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <label className="block text-xs text-slate-400 mb-2">利率类型</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDebt({ ...debt, interestType: 'fixed' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        debt.interestType === 'fixed'
                          ? 'bg-amber text-midnight'
                          : 'bg-midnight border border-midnight-lighter text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      固定利率
                    </button>
                    <button
                      onClick={() => setDebt({ ...debt, interestType: 'floating' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        debt.interestType === 'floating'
                          ? 'bg-amber text-midnight'
                          : 'bg-midnight border border-midnight-lighter text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      浮动利率
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <label className="block text-xs text-slate-400 mb-2">还款期限（回合）</label>
                  <input
                    type="number"
                    value={debt.repaymentTerm}
                    onChange={(e) => setDebt({ ...debt, repaymentTerm: Number(e.target.value) })}
                    className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 text-lg font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-midnight-light border border-midnight-lighter sticky top-6">
              <div className="flex items-center gap-2 mb-5">
                <Settings size={18} className="text-amber" />
                <h2 className="text-lg font-semibold text-slate-200">游戏参数</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">总回合数</label>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 font-mono font-semibold text-slate-200 focus:outline-none focus:border-amber/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">难度等级</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DIFFICULTY_SETTINGS) as [string, { label: string }][]).map(
                      ([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setDifficulty(key as 'easy' | 'normal' | 'hard')}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${
                            difficulty === key
                              ? 'bg-amber text-midnight'
                              : 'bg-midnight border border-midnight-lighter text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {val.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-midnight-lighter space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">已选项目</span>
                    <span className="font-mono text-slate-200">{selectedProjects.length} 个</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">总投资额</span>
                    <span className="font-mono text-amber">{totalInvestment.toLocaleString()} 万</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">债务总额</span>
                    <span className="font-mono text-coral">{debt.totalDebt.toLocaleString()} 万</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">债务/投资比</span>
                    <span className="font-mono text-slate-200">
                      {totalInvestment > 0 ? (debt.totalDebt / totalInvestment).toFixed(2) : '-'}
                    </span>
                  </div>
                </div>

                {debt.totalDebt < totalInvestment && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-coral/10 border border-coral/30">
                    <AlertTriangle size={16} className="text-coral mt-0.5 shrink-0" />
                    <p className="text-xs text-coral">债务额度低于总投资额，可能出现资金不足</p>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={selectedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber text-midnight font-semibold text-sm hover:bg-amber-light transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber/20"
                >
                  <Play size={18} />
                  开始经营
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
