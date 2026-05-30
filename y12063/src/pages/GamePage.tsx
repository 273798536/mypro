import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { formatMoney } from '../utils/helpers';
import type { Decision, GameEvent } from '../types';
import {
  Pause,
  Play,
  RotateCcw,
  Coins,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Building2,
  ChevronRight,
  X,
  Wallet,
  Landmark,
  BarChart3,
  Calendar,
} from 'lucide-react';

function EventModal({
  event,
  onClose,
}: {
  event: GameEvent;
  onClose: () => void;
}) {
  const typeConfig = {
    interest_miss: { icon: AlertTriangle, color: 'text-coral', bg: 'bg-coral/10', border: 'border-coral/30', title: '利息漏算' },
    project_delay: { icon: Clock, color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30', title: '项目延期' },
    revenue_decline: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', title: '收入下滑' },
  };

  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-xl ${cfg.bg} border ${cfg.border} p-6 shadow-2xl`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
            <Icon size={20} className={cfg.color} />
          </div>
          <div>
            <h3 className={`font-bold ${cfg.color}`}>{cfg.title}</h3>
            <p className="text-xs text-slate-400">第{event.round}回合</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
        {event.impact.penaltyAmount && (
          <p className="mt-3 text-sm font-mono text-coral">罚金：{formatMoney(event.impact.penaltyAmount)} 元</p>
        )}
        {event.impact.delayRounds && (
          <p className="mt-3 text-sm font-mono text-amber">延后：{event.impact.delayRounds} 回合</p>
        )}
        {event.impact.revenueReduction && (
          <p className="mt-3 text-sm font-mono text-orange-400">收入减少：{Math.round(event.impact.revenueReduction * 100)}%</p>
        )}
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg bg-midnight-lighter text-slate-200 text-sm font-medium hover:bg-midnight-lighter/80 transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

export default function GamePage() {
  const navigate = useNavigate();
  const { gameState, submitDecision, togglePause, resetGame } = useGameStore();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [repaymentType, setRepaymentType] = useState<'minimum' | 'partial' | 'full'>('minimum');
  const [partialAmount, setPartialAmount] = useState(0);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [pendingEvents, setPendingEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    if (!gameState) {
      navigate('/');
    }
  }, [gameState, navigate]);

  useEffect(() => {
    if (pendingEvents.length > 0 && !activeEvent) {
      setActiveEvent(pendingEvents[0]);
      setPendingEvents((prev) => prev.slice(1));
    }
  }, [pendingEvents, activeEvent]);

  if (!gameState) return null;

  const currentInterest = gameState.interestPayments.find(
    (ip) => ip.round === gameState.currentRound
  );
  const totalDue = (currentInterest?.amount || 0) + (currentInterest?.penalty || 0);
  const netWorth = gameState.cash - gameState.debtBalance;
  const availableProjects = gameState.config.projects.filter(
    (p) => !gameState.activeProjects.find((ap) => ap.card.id === p.id) &&
           !gameState.completedProjects.find((cp) => cp.card.id === p.id)
  );

  const minimumPayment = totalDue;
  const fullPayment = gameState.debtBalance + totalDue;

  const handleNextRound = () => {
    const decision: Decision = {
      round: gameState.currentRound,
      projectIds: selectedProjectIds,
      repaymentAmount: repaymentType === 'minimum' ? minimumPayment : repaymentType === 'full' ? fullPayment : partialAmount,
      repaymentType,
    };

    const events = submitDecision(decision);
    if (events.length > 0) {
      setPendingEvents(events);
    }

    setSelectedProjectIds([]);
    setRepaymentType('minimum');
    setPartialAmount(0);
  };

  const handlePause = () => {
    togglePause();
  };

  const handleRestart = () => {
    if (confirm('确定要重新开始本局吗？所有进度将丢失。')) {
      resetGame();
      navigate('/');
    }
  };

  const closeEventAndCheckGame = () => {
    setActiveEvent(null);
    const currentState = useGameStore.getState().gameState;
    if (currentState?.isGameOver) {
      setTimeout(() => navigate('/settlement'), 300);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex flex-col">
      {activeEvent && <EventModal event={activeEvent} onClose={closeEventAndCheckGame} />}

      <header className="border-b border-midnight-lighter px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-amber" />
            <span className="font-semibold text-slate-200 text-sm">城市债务经营赛</span>
          </div>
          <div className="h-4 w-px bg-midnight-lighter" />
          <span className="text-xs text-slate-400">
            第 <span className="font-mono font-bold text-amber">{gameState.currentRound}</span> / {gameState.totalRounds} 回合
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-midnight-lighter text-slate-300 hover:bg-midnight-lighter/80 transition-colors"
          >
            {gameState.isPaused ? <Play size={14} /> : <Pause size={14} />}
            {gameState.isPaused ? '继续' : '暂停'}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition-colors"
          >
            <RotateCcw size={14} />
            重开
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-midnight-lighter p-4 space-y-5 overflow-y-auto shrink-0 hidden lg:block">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={14} className="text-amber" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">财务总览</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-midnight-light">
                <p className="text-xs text-slate-500">现金</p>
                <p className="font-mono font-bold text-lg text-amber">{formatMoney(gameState.cash)}</p>
              </div>
              <div className="p-3 rounded-lg bg-midnight-light">
                <p className="text-xs text-slate-500">债务余额</p>
                <p className="font-mono font-bold text-lg text-coral">{formatMoney(gameState.debtBalance)}</p>
              </div>
              <div className="p-3 rounded-lg bg-midnight-light">
                <p className="text-xs text-slate-500">净资产</p>
                <p className={`font-mono font-bold text-lg ${netWorth >= 0 ? 'text-emerald' : 'text-coral'}`}>
                  {formatMoney(netWorth)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-midnight-light">
                  <p className="text-xs text-slate-500">累计利息</p>
                  <p className="font-mono text-sm text-slate-300">{formatMoney(gameState.totalInterestPaid)}</p>
                </div>
                <div className="p-2 rounded-lg bg-midnight-light">
                  <p className="text-xs text-slate-500">项目收益</p>
                  <p className="font-mono text-sm text-emerald">{formatMoney(gameState.totalProjectRevenue)}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-amber" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">经营中项目</h3>
            </div>
            {gameState.activeProjects.length === 0 ? (
              <p className="text-xs text-slate-500 italic">暂无进行中的项目</p>
            ) : (
              <div className="space-y-2">
                {gameState.activeProjects.map((ap) => (
                  <div key={ap.card.id} className="p-2 rounded-lg bg-midnight-light border-l-2 border-amber">
                    <p className="text-xs font-medium text-slate-300">{ap.card.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        第{ap.startRound}回合开始
                      </span>
                      {ap.delayRounds > 0 && (
                        <span className="text-xs text-coral">延期{ap.delayRounds}回合</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-amber" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">利息日历</h3>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {gameState.interestPayments.map((ip) => (
                <div
                  key={ip.round}
                  className={`flex items-center justify-between p-1.5 rounded text-xs ${
                    ip.round === gameState.currentRound
                      ? 'bg-amber/10 border border-amber/30'
                      : ip.paid
                      ? 'bg-emerald/5'
                      : ip.overdue
                      ? 'bg-coral/5'
                      : 'bg-midnight-light'
                  }`}
                >
                  <span className="text-slate-400">回合{ip.round}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${ip.overdue ? 'text-coral' : ip.paid ? 'text-emerald' : 'text-slate-300'}`}>
                      {formatMoney(ip.amount + ip.penalty)}
                    </span>
                    {ip.paid && <span className="text-emerald text-xs">✓</span>}
                    {ip.overdue && <span className="text-coral text-xs">!</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {gameState.isPaused && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <Pause size={48} className="text-amber mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-200 mb-2">游戏暂停</h2>
                <p className="text-slate-400 mb-6">点击继续按钮恢复游戏</p>
                <button
                  onClick={handlePause}
                  className="px-6 py-2.5 rounded-lg bg-amber text-midnight font-semibold hover:bg-amber-light transition-colors"
                >
                  继续游戏
                </button>
              </div>
            </div>
          )}

          {gameState.events.filter((e) => e.round === gameState.currentRound && e.resolved).length > 0 && (
            <div className="p-4 rounded-xl bg-coral/5 border border-coral/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-coral" />
                <h3 className="text-sm font-semibold text-coral">本回合事件</h3>
              </div>
              {gameState.events
                .filter((e) => e.round === gameState.currentRound && e.resolved)
                .map((e) => (
                  <p key={e.id} className="text-xs text-slate-300 leading-relaxed">{e.description}</p>
                ))}
            </div>
          )}

          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-amber" />
              <h2 className="text-base font-semibold text-slate-200">项目投资</h2>
              <span className="text-xs text-slate-500">选择本回合要投资的项目</span>
            </div>
            {availableProjects.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4">所有可选项目已投资或完成</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {availableProjects.map((card) => {
                  const isSelected = selectedProjectIds.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() =>
                        setSelectedProjectIds((prev) =>
                          isSelected ? prev.filter((id) => id !== card.id) : [...prev, card.id]
                        )
                      }
                      className={`text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-amber bg-amber/5'
                          : 'border-midnight-lighter bg-midnight-light hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-slate-200">{card.name}</h3>
                        {isSelected && <ChevronRight size={14} className="text-amber" />}
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>投资 {card.investmentAmount.toLocaleString()}</span>
                        <span>收益 {card.expectedRevenue.toLocaleString()}</span>
                        <span>{card.duration}回合</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Landmark size={18} className="text-amber" />
              <h2 className="text-base font-semibold text-slate-200">偿债操作</h2>
            </div>
            <div className="p-5 rounded-xl bg-midnight-light border border-midnight-lighter">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-midnight">
                  <p className="text-xs text-slate-500">应还本息</p>
                  <p className="font-mono font-bold text-coral">{formatMoney(totalDue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-midnight">
                  <p className="text-xs text-slate-500">可用现金</p>
                  <p className="font-mono font-bold text-amber">{formatMoney(gameState.cash)}</p>
                </div>
                <div className="p-3 rounded-lg bg-midnight">
                  <p className="text-xs text-slate-500">债务余额</p>
                  <p className="font-mono font-bold text-slate-300">{formatMoney(gameState.debtBalance)}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {([
                  { key: 'minimum' as const, label: '仅还利息', amount: minimumPayment },
                  { key: 'partial' as const, label: '部分还款', amount: partialAmount },
                  { key: 'full' as const, label: '全额偿还', amount: fullPayment },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setRepaymentType(opt.key)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      repaymentType === opt.key
                        ? 'bg-amber text-midnight'
                        : 'bg-midnight border border-midnight-lighter text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {opt.label}
                    <span className="block font-mono text-xs mt-0.5 opacity-80">
                      {formatMoney(opt.key === 'partial' ? partialAmount : opt.amount)}
                    </span>
                  </button>
                ))}
              </div>

              {repaymentType === 'partial' && (
                <div className="mb-4">
                  <input
                    type="range"
                    min={minimumPayment}
                    max={Math.min(fullPayment, gameState.cash)}
                    step={100}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(Number(e.target.value))}
                    className="w-full accent-amber"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>最低 {formatMoney(minimumPayment)}</span>
                    <span className="font-mono text-amber">{formatMoney(partialAmount)}</span>
                    <span>全额 {formatMoney(fullPayment)}</span>
                  </div>
                </div>
              )}

              {currentInterest?.overdue && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-coral/10 border border-coral/30 text-xs text-coral">
                  <AlertTriangle size={14} />
                  存在逾期利息，罚息已累加至下回合
                </div>
              )}
            </div>
          </section>

          <div className="flex justify-end pt-2 pb-4">
            <button
              onClick={handleNextRound}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-amber text-midnight font-semibold text-sm hover:bg-amber-light transition-all shadow-lg shadow-amber/20"
            >
              <Coins size={16} />
              确认决策，进入下一回合
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
