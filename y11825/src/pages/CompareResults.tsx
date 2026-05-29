import { useState, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { ArrowLeftRight, Download, RefreshCw, Edit2 } from 'lucide-react';
import { compareGameResults } from '@/engine/settlementEngine';
import type { ComparisonResult, SettlementResult, VolatilityEvent } from '@/types';

export default function CompareResults() {
  const { settlementResults, actions } = useDataStore();
  const [oldId, setOldId] = useState('');
  const [newId, setNewId] = useState('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [modifiedEvents, setModifiedEvents] = useState<VolatilityEvent[]>([]);
  const [recalcResult, setRecalcResult] = useState<SettlementResult | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    actions.loadSettlementResults();
  }, []);

  const handleCompare = () => {
    if (!oldId || !newId) return;
    const result = actions.compareResults(oldId, newId);
    setComparison(result);
    setRecalcResult(null);
    setModifiedEvents(result.oldResult.volatilityEventsUsed.map(e => ({ ...e })));
  };

  const handleExport = (id: string) => {
    const report = actions.exportSettlementReport(id);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `settlement-${id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecalculate = () => {
    if (!oldId) return;
    const result = actions.recalculateWithModifiedEvents(oldId, modifiedEvents);
    setRecalcResult(result);
    if (comparison) {
      setComparison(compareGameResults(comparison.oldResult, result));
    }
  };

  const updateModifiedEvent = (eventId: string, field: keyof VolatilityEvent, value: any) => {
    setModifiedEvents(prev => prev.map(e => e.id === eventId ? { ...e, [field]: value } : e));
  };

  const selectedOld = settlementResults.find(r => r.id === oldId);

  const gradeColor = (g: string) => {
    const m: Record<string, string> = { A: 'text-[var(--color-accent-success)]', B: 'text-[var(--color-accent-info)]', C: 'text-[var(--color-accent-warning)]', D: 'text-[var(--color-accent-danger)]', F: 'text-[var(--color-accent-danger)]' };
    return m[g] ?? '';
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">结算结果对比</h1>

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">旧结果</label>
            <select className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={oldId} onChange={e => setOldId(e.target.value)}>
              <option value="">选择结果...</option>
              {settlementResults.map(r => <option key={r.id} value={r.id}>{r.id.slice(0, 8)} - 得分{r.finalScore} ({r.grade})</option>)}
            </select>
          </div>
          <ArrowLeftRight className="w-5 h-5 text-[var(--color-text-muted)] mb-2" />
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">新结果</label>
            <select className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={newId} onChange={e => setNewId(e.target.value)}>
              <option value="">选择结果...</option>
              {settlementResults.map(r => <option key={r.id} value={r.id}>{r.id.slice(0, 8)} - 得分{r.finalScore} ({r.grade})</option>)}
            </select>
          </div>
          <button onClick={handleCompare} disabled={!oldId || !newId} className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50">
            <ArrowLeftRight className="w-4 h-4" />对比
          </button>
        </div>
      </div>

      {comparison && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-5 comparison-old">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold">旧结果</h2>
                <button onClick={() => handleExport(comparison.oldResult.id)} className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"><Download className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">得分</span><span className="font-mono font-bold">{comparison.oldResult.finalScore}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">评级</span><span className={`font-mono font-bold text-xl ${gradeColor(comparison.oldResult.grade)}`}>{comparison.oldResult.grade}</span></div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">{comparison.oldResult.summary}</p>
              </div>
            </div>

            <div className="glass-card p-5 comparison-new">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold">新结果</h2>
                <button onClick={() => handleExport(comparison.newResult.id)} className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"><Download className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">得分</span><span className="font-mono font-bold">{comparison.newResult.finalScore}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">评级</span><span className={`font-mono font-bold text-xl ${gradeColor(comparison.newResult.grade)}`}>{comparison.newResult.grade}</span></div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">{comparison.newResult.summary}</p>
              </div>
            </div>
          </div>

          {comparison.differences.length > 0 && (
            <div className="glass-card p-5 comparison-diff">
              <h2 className="font-display text-lg font-bold mb-3">差异列表</h2>
              <div className="space-y-2">
                {comparison.differences.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">回合 {d.round}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{d.field}</span>
                      {d.relatedEventId && <a href={`/admin/volatility-events`} className="text-xs text-[var(--color-accent-info)] flex items-center gap-1"><Edit2 className="w-3 h-3" />事件</a>}
                      {d.relatedCardId && <a href={`/admin/option-cards`} className="text-xs text-[var(--color-accent-info)] flex items-center gap-1"><Edit2 className="w-3 h-3" />期权卡</a>}
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="diff-removed font-mono">-{String(d.oldValue)}</span>
                      <span className="diff-added font-mono">+{String(d.newValue)}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{d.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedOld && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">手动修正波动事件</h2>
            <button onClick={handleRecalculate} className="btn-primary px-4 py-2 flex items-center gap-2"><RefreshCw className="w-4 h-4" />重新计算</button>
          </div>
          <div className="space-y-3">
            {modifiedEvents.map(evt => (
              <div key={evt.id} className="p-3 rounded-lg bg-[var(--color-bg-secondary)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{evt.name}</span>
                  <button onClick={() => setEditingEventId(editingEventId === evt.id ? null : evt.id)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent-info)]"><Edit2 className="w-3.5 h-3.5" /></button>
                </div>
                {editingEventId === evt.id && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)]">触发回合</label>
                      <input type="number" className="w-full px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] font-mono text-sm" value={evt.triggerRound} onChange={e => updateModifiedEvent(evt.id, 'triggerRound', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)]">波动跳跃</label>
                      <input type="number" step="0.01" className="w-full px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] font-mono text-sm" value={evt.volatilityJump} onChange={e => updateModifiedEvent(evt.id, 'volatilityJump', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)]">持续时间</label>
                      <input type="number" className="w-full px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] font-mono text-sm" value={evt.duration} onChange={e => updateModifiedEvent(evt.id, 'duration', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)]">影响范围</label>
                      <select className="w-full px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm" value={evt.impactScope} onChange={e => updateModifiedEvent(evt.id, 'impactScope', e.target.value)}>
                        <option value="ALL">ALL</option><option value="SPOT">SPOT</option><option value="EXPIRING">EXPIRING</option>
                      </select>
                    </div>
                  </div>
                )}
                {!editingEventId && (
                  <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
                    <span>回合: <span className="font-mono">{evt.triggerRound}</span></span>
                    <span>跳跃: <span className="font-mono">{(evt.volatilityJump * 100).toFixed(0)}%</span></span>
                    <span>持续: <span className="font-mono">{evt.duration}</span></span>
                    <span>范围: {evt.impactScope}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {recalcResult && (
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <h3 className="font-display font-bold text-sm mb-2">原始结果</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">得分</span><span className="font-mono">{selectedOld.finalScore}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">评级</span><span className={`font-mono font-bold ${gradeColor(selectedOld.grade)}`}>{selectedOld.grade}</span></div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-accent-info)]/30">
                <h3 className="font-display font-bold text-sm mb-2 text-[var(--color-accent-info)]">修正后结果</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">得分</span><span className="font-mono">{recalcResult.finalScore}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">评级</span><span className={`font-mono font-bold ${gradeColor(recalcResult.grade)}`}>{recalcResult.grade}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
