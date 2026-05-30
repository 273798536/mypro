import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { formatMoney } from '../utils/helpers';
import type { RoundSnapshot } from '../types';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Landmark,
  TrendingUp,
  AlertTriangle,
  Clock,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

export default function ReplayPage() {
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);
  const [currentReplayRound, setCurrentReplayRound] = useState(1);

  if (!gameState) {
    navigate('/');
    return null;
  }

  const snapshot: RoundSnapshot | undefined = gameState.snapshots.find(
    (s) => s.round === currentReplayRound
  );

  const isKeyDecision = (snap: RoundSnapshot): boolean => {
    return (
      snap.events.length > 0 ||
      snap.decisions.some((d) => d.repaymentType !== 'minimum') ||
      snap.decisions.some((d) => d.projectIds.length > 0)
    );
  };

  return (
    <div className="min-h-screen bg-midnight">
      <header className="border-b border-midnight-lighter">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center">
                <History size={20} className="text-amber" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">经营复盘</h1>
                <p className="text-sm text-slate-400">回放每回合的决策与结果</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settlement')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-midnight-lighter text-slate-300 hover:bg-midnight-lighter/80 transition-colors"
            >
              <ChevronLeft size={14} />
              返回结算
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentReplayRound(Math.max(1, currentReplayRound - 1))}
            disabled={currentReplayRound <= 1}
            className="p-2 rounded-lg bg-midnight-lighter text-slate-300 hover:bg-midnight-lighter/80 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <input
              type="range"
              min={1}
              max={gameState.snapshots.length}
              value={currentReplayRound}
              onChange={(e) => setCurrentReplayRound(Number(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between mt-1">
              {gameState.snapshots.map((snap) => (
                <button
                  key={snap.round}
                  onClick={() => setCurrentReplayRound(snap.round)}
                  className={`relative w-6 h-6 rounded-full text-xs font-mono transition-all ${
                    snap.round === currentReplayRound
                      ? 'bg-amber text-midnight scale-110'
                      : isKeyDecision(snap)
                      ? 'bg-amber/30 text-amber'
                      : 'bg-midnight-lighter text-slate-500'
                  }`}
                >
                  {snap.round}
                  {isKeyDecision(snap) && snap.round !== currentReplayRound && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setCurrentReplayRound(Math.min(gameState.snapshots.length, currentReplayRound + 1))}
            disabled={currentReplayRound >= gameState.snapshots.length}
            className="p-2 rounded-lg bg-midnight-lighter text-slate-300 hover:bg-midnight-lighter/80 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {snapshot ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-amber">第 {snapshot.round} 回合</span>
              {isKeyDecision(snapshot) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30">
                  关键决策
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: '现金', value: snapshot.cash, icon: Wallet, color: snapshot.cash >= 0 ? 'text-amber' : 'text-coral' },
                { label: '债务余额', value: snapshot.debtBalance, icon: Landmark, color: snapshot.debtBalance > 0 ? 'text-coral' : 'text-emerald' },
                { label: '累计利息', value: snapshot.totalInterestPaid, icon: Clock, color: 'text-slate-300' },
                { label: '项目收益', value: snapshot.projectRevenue, icon: TrendingUp, color: 'text-emerald' },
                { label: '净资产', value: snapshot.netWorth, icon: Building2, color: snapshot.netWorth >= 0 ? 'text-emerald' : 'text-coral' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <p className={`font-mono font-bold text-base ${item.color}`}>{formatMoney(item.value)}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-amber" />
                  本回合决策
                </h3>
                {snapshot.decisions.map((d, i) => (
                  <div key={i} className="p-4 rounded-lg bg-midnight-light border border-midnight-lighter space-y-2">
                    {d.projectIds.length > 0 ? (
                      <div>
                        <span className="text-xs text-slate-500">投资项目</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {d.projectIds.map((pid) => {
                            const card = gameState.config.projects.find((p) => p.id === pid);
                            return card ? (
                              <span key={pid} className="text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30">
                                {card.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">未投资新项目</p>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">偿债方案</span>
                      <p className="text-sm text-slate-300">
                        {d.repaymentType === 'minimum' ? '仅还利息' : d.repaymentType === 'full' ? '全额偿还' : '部分还款'}
                        <span className="font-mono text-amber ml-2">{formatMoney(d.repaymentAmount)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-coral" />
                  本回合事件
                </h3>
                {snapshot.events.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 rounded-lg bg-midnight-light border border-midnight-lighter">
                    本回合无特殊事件
                  </p>
                ) : (
                  <div className="space-y-2">
                    {snapshot.events.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg bg-coral/5 border border-coral/20">
                        <p className="text-xs text-slate-300">{e.description}</p>
                        {e.impact.penaltyAmount && (
                          <p className="text-xs font-mono text-coral mt-1">
                            <ArrowDownRight size={10} className="inline mr-1" />
                            {formatMoney(e.impact.penaltyAmount)}
                          </p>
                        )}
                        {e.impact.revenueReduction && (
                          <p className="text-xs font-mono text-orange-400 mt-1">
                            <ArrowDownRight size={10} className="inline mr-1" />
                            减少 {Math.round(e.impact.revenueReduction * 100)}%
                          </p>
                        )}
                        {e.impact.delayRounds && (
                          <p className="text-xs font-mono text-amber mt-1">
                            <Clock size={10} className="inline mr-1" />
                            延后 {e.impact.delayRounds} 回合
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock size={14} className="text-amber" />
                利息支付
              </h3>
              {snapshot.interestPayments.map((ip) => (
                <div key={ip.round} className="flex items-center justify-between p-3 rounded-lg bg-midnight-light border border-midnight-lighter">
                  <span className="text-sm text-slate-400">回合 {ip.round}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm ${ip.paid ? 'text-emerald' : ip.overdue ? 'text-coral' : 'text-slate-300'}`}>
                      {formatMoney(ip.amount + ip.penalty)}
                    </span>
                    {ip.paid && <span className="text-emerald text-sm flex items-center gap-1"><ArrowUpRight size={12} />已还</span>}
                    {ip.overdue && <span className="text-coral text-sm flex items-center gap-1"><ArrowDownRight size={12} />逾期</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-12">该回合无快照数据</p>
        )}
      </main>
    </div>
  );
}
