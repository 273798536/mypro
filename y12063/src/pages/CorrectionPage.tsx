import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCorrectionStore } from '../stores/correctionStore';
import { formatMoney } from '../utils/helpers';
import type { DebtConfig } from '../types';
import {
  Edit3,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  Minus,
} from 'lucide-react';

export default function CorrectionPage() {
  const navigate = useNavigate();
  const { originalResult, modifiedDebt, modifiedResult, differences, updateDebt, initCorrection } =
    useCorrectionStore();
  const [editingDebt, setEditingDebt] = useState<DebtConfig | null>(null);

  useEffect(() => {
    if (!originalResult) {
      navigate('/');
    }
  }, [originalResult, navigate]);

  useEffect(() => {
    if (modifiedDebt && !editingDebt) {
      setEditingDebt({ ...modifiedDebt });
    }
  }, [modifiedDebt, editingDebt]);

  if (!originalResult || !editingDebt) return null;

  const handleApply = () => {
    updateDebt(editingDebt);
  };

  const ratingColors: Record<string, string> = {
    A: 'text-emerald',
    B: 'text-amber',
    C: 'text-orange-400',
    D: 'text-coral',
    F: 'text-red-500',
  };

  const DiffIndicator = ({ original, modified }: { original: number; modified: number }) => {
    const delta = modified - original;
    if (Math.abs(delta) < 0.01) {
      return <span className="text-slate-500 flex items-center gap-1"><Minus size={12} />无变化</span>;
    }
    return (
      <span className={`flex items-center gap-1 font-mono text-xs ${delta > 0 ? 'text-emerald' : 'text-coral'}`}>
        {delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {delta > 0 ? '+' : ''}{formatMoney(delta)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-midnight">
      <header className="border-b border-midnight-lighter">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center">
                <Edit3 size={20} className="text-amber" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">修正对比</h1>
                <p className="text-sm text-slate-400">调整债务额度，查看新旧结果差异</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settlement')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-midnight-lighter text-slate-300 hover:bg-midnight-lighter/80 transition-colors"
            >
              <ArrowLeft size={14} />
              返回结算
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="p-6 rounded-xl bg-midnight-light border border-midnight-lighter">
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={18} className="text-amber" />
            <h2 className="text-lg font-semibold text-slate-200">债务额度修正</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">债务总额（万元）</label>
              <input
                type="number"
                value={editingDebt.totalDebt}
                onChange={(e) => setEditingDebt({ ...editingDebt, totalDebt: Number(e.target.value) })}
                className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">年利率（%）</label>
              <input
                type="number"
                step="0.1"
                value={(editingDebt.interestRate * 100).toFixed(1)}
                onChange={(e) => setEditingDebt({ ...editingDebt, interestRate: Number(e.target.value) / 100 })}
                className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">利率类型</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingDebt({ ...editingDebt, interestType: 'fixed' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    editingDebt.interestType === 'fixed'
                      ? 'bg-amber text-midnight'
                      : 'bg-midnight border border-midnight-lighter text-slate-400'
                  }`}
                >
                  固定
                </button>
                <button
                  onClick={() => setEditingDebt({ ...editingDebt, interestType: 'floating' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    editingDebt.interestType === 'floating'
                      ? 'bg-amber text-midnight'
                      : 'bg-midnight border border-midnight-lighter text-slate-400'
                  }`}
                >
                  浮动
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">还款期限（回合）</label>
              <input
                type="number"
                value={editingDebt.repaymentTerm}
                onChange={(e) => setEditingDebt({ ...editingDebt, repaymentTerm: Number(e.target.value) })}
                className="w-full bg-midnight border border-midnight-lighter rounded-lg px-3 py-2 font-mono font-semibold text-amber focus:outline-none focus:border-amber/50"
              />
            </div>
          </div>
          <button
            onClick={handleApply}
            className="px-6 py-2.5 rounded-lg bg-amber text-midnight font-semibold text-sm hover:bg-amber-light transition-colors shadow-lg shadow-amber/20"
          >
            应用修正并重新计算
          </button>
        </section>

        {modifiedResult && differences.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-amber" />
              <h2 className="text-lg font-semibold text-slate-200">新旧结果对比</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {differences.map((diff) => (
                <div
                  key={diff.field}
                  className={`p-4 rounded-xl border ${
                    Math.abs(diff.delta) > 0.01
                      ? 'bg-amber/5 border-amber/30'
                      : 'bg-midnight-light border-midnight-lighter'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-300">{diff.label}</span>
                    <DiffIndicator original={diff.originalValue} modified={diff.modifiedValue} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-midnight">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Wallet size={10} /> 原始值
                      </span>
                      <p className="font-mono font-bold text-lg text-slate-300 mt-1">
                        {formatMoney(diff.originalValue)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-midnight">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Edit3 size={10} /> 修正值
                      </span>
                      <p className={`font-mono font-bold text-lg mt-1 ${
                        diff.delta > 0.01
                          ? 'text-emerald'
                          : diff.delta < -0.01
                          ? 'text-coral'
                          : 'text-slate-300'
                      }`}>
                        {formatMoney(diff.modifiedValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-4 rounded-xl bg-midnight-light border border-midnight-lighter">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-slate-300">评级变化</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-midnight text-center">
                    <span className="text-xs text-slate-500">原始评级</span>
                    <p className={`text-4xl font-bold mt-1 ${ratingColors[originalResult.rating || 'F']}`}>
                      {originalResult.rating}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-midnight text-center">
                    <span className="text-xs text-slate-500">修正评级</span>
                    <p className={`text-4xl font-bold mt-1 ${ratingColors[modifiedResult.rating || 'F']}`}>
                      {modifiedResult.rating}
                    </p>
                  </div>
                </div>
              </div>

              {modifiedResult.deductions.length > 0 && (
                <div className="p-4 rounded-xl bg-midnight-light border border-midnight-lighter">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-coral" />
                    <span className="text-sm font-medium text-slate-300">修正后扣分明细</span>
                  </div>
                  <div className="space-y-2">
                    {modifiedResult.deductions.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-midnight">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-500" />
                          <span className="text-xs text-slate-400">第{d.round}回合</span>
                          <span className="text-xs text-slate-300">{d.description}</span>
                        </div>
                        <span className="text-xs font-mono text-coral">{formatMoney(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
