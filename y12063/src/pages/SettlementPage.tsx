import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { useCorrectionStore } from '../stores/correctionStore';
import { formatMoney } from '../utils/helpers';
import {
  Trophy,
  Wallet,
  Landmark,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  History,
  Edit3,
  ChevronRight,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

export default function SettlementPage() {
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);
  const resetGame = useGameStore((s) => s.resetGame);
  const initCorrection = useCorrectionStore((s) => s.initCorrection);

  if (!gameState || !gameState.isGameOver) {
    navigate('/');
    return null;
  }

  const netWorth = gameState.cash - gameState.debtBalance;
  const totalDeductions = gameState.deductions.reduce((sum, d) => sum + d.amount, 0);
  const ratingColors: Record<string, string> = {
    A: 'from-emerald to-emerald-dark text-emerald',
    B: 'from-amber to-amber-dark text-amber',
    C: 'from-orange-400 to-orange-600 text-orange-400',
    D: 'from-coral to-coral-dark text-coral',
    F: 'from-red-600 to-red-800 text-red-500',
  };
  const ratingDescriptions: Record<string, string> = {
    A: '卓越经营：财务状况优良，偿债无压力',
    B: '良好经营：偶有波折，总体可控',
    C: '一般经营：存在风险，需要改进',
    D: '经营困难：资不抵债，亟需调整',
    F: '财政破产：净资产持续为负',
  };
  const deductionTypeLabels: Record<string, string> = {
    project_delay: '项目延期',
    interest_miss: '利息漏算',
    revenue_decline: '收入下滑',
    bankruptcy: '财政破产',
  };
  const deductionTypeColors: Record<string, string> = {
    project_delay: 'text-amber bg-amber/10 border-amber/30',
    interest_miss: 'text-coral bg-coral/10 border-coral/30',
    revenue_decline: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    bankruptcy: 'text-red-500 bg-red-500/10 border-red-500/30',
  };

  const handleRestart = () => {
    resetGame();
    navigate('/');
  };

  const handleCorrection = () => {
    initCorrection(gameState);
    navigate('/correction');
  };

  return (
    <div className="min-h-screen bg-midnight">
      <header className="border-b border-midnight-lighter">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center">
              <Trophy size={20} className="text-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">经营结算</h1>
              <p className="text-sm text-slate-400">本局经营结果与详细分析</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="flex items-center gap-8 p-6 rounded-xl bg-midnight-light border border-midnight-lighter">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br ${ratingColors[gameState.rating || 'F']} border-2`}>
            <span className="text-5xl font-bold">{gameState.rating}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-200 mb-1">
              {ratingDescriptions[gameState.rating || 'F']}
            </h2>
            <p className="text-sm text-slate-400">
              历经 {gameState.snapshots.length} 回合经营
              {gameState.deductions.length > 0 && `，累计 ${gameState.deductions.length} 次扣分`}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '最终现金', value: gameState.cash, icon: Wallet, color: gameState.cash >= 0 ? 'text-amber' : 'text-coral' },
            { label: '债务余额', value: gameState.debtBalance, icon: Landmark, color: gameState.debtBalance > 0 ? 'text-coral' : 'text-emerald' },
            { label: '净资产', value: netWorth, icon: TrendingUp, color: netWorth >= 0 ? 'text-emerald' : 'text-coral' },
            { label: '扣分总额', value: totalDeductions, icon: AlertTriangle, color: 'text-coral' },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl bg-midnight-light border border-midnight-lighter">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
              <p className={`font-mono font-bold text-xl ${item.color}`}>{formatMoney(item.value)}</p>
            </div>
          ))}
        </section>

        {gameState.deductions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-coral" />
              <h2 className="text-lg font-semibold text-slate-200">扣分明细</h2>
            </div>
            <div className="rounded-xl bg-midnight-light border border-midnight-lighter overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-midnight-lighter">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">回合</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">类型</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">说明</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.deductions.map((d, i) => (
                    <tr key={i} className="border-b border-midnight-lighter/50 last:border-0">
                      <td className="px-4 py-3 text-sm font-mono text-slate-400">第{d.round}回合</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${deductionTypeColors[d.type]}`}>
                          {deductionTypeLabels[d.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{d.description}</td>
                      <td className="px-4 py-3 text-sm font-mono text-coral text-right">
                        <ArrowDownRight size={12} className="inline mr-1" />
                        {formatMoney(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-amber" />
            <h2 className="text-lg font-semibold text-slate-200">项目收益分析</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...gameState.activeProjects, ...gameState.completedProjects].map((ap) => {
              const actualRevenue = ap.card.revenuePerRound.reduce((s, r) => s + r, 0) * (1 - ap.revenueReduction);
              const expectedRevenue = ap.card.expectedRevenue;
              const diff = actualRevenue - expectedRevenue;
              return (
                <div key={ap.card.id} className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <h3 className="text-sm font-medium text-slate-200 mb-2">{ap.card.name}</h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">预期收益</span>
                      <p className="font-mono text-slate-300">{formatMoney(expectedRevenue)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">实际收益</span>
                      <p className={`font-mono ${diff >= 0 ? 'text-emerald' : 'text-coral'}`}>
                        {formatMoney(actualRevenue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">偏差</span>
                      <p className={`font-mono flex items-center gap-1 ${diff >= 0 ? 'text-emerald' : 'text-coral'}`}>
                        {diff >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {formatMoney(Math.abs(diff))}
                      </p>
                    </div>
                  </div>
                  {ap.delayRounds > 0 && (
                    <p className="text-xs text-amber mt-2">延期 {ap.delayRounds} 回合</p>
                  )}
                  {ap.revenueReduction > 0 && (
                    <p className="text-xs text-coral mt-2">收入减少 {Math.round(ap.revenueReduction * 100)}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-wrap gap-3 pt-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber text-midnight font-semibold text-sm hover:bg-amber-light transition-colors shadow-lg shadow-amber/20"
          >
            <RotateCcw size={16} />
            重新开始
          </button>
          <button
            onClick={() => navigate('/replay')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-midnight-lighter text-slate-200 font-medium text-sm hover:bg-midnight-lighter/80 transition-colors border border-midnight-lighter"
          >
            <History size={16} />
            进入复盘
          </button>
          <button
            onClick={handleCorrection}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-midnight-lighter text-slate-200 font-medium text-sm hover:bg-midnight-lighter/80 transition-colors border border-midnight-lighter"
          >
            <Edit3 size={16} />
            修正债务额度
          </button>
        </section>
      </main>
    </div>
  );
}
