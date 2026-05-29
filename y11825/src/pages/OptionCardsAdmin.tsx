import { useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Check } from 'lucide-react';
import type { OptionCard, OptionType } from '@/types';

const OPTION_TYPES: OptionType[] = ['CALL', 'PUT', 'STRADDLE', 'STRANGLE', 'BUTTERFLY'];

const emptyCard: Partial<OptionCard> = {
  name: '', type: 'CALL', strikePrice: 100, daysToExpiry: 30,
  marginRequirement: 15, delta: 0.5, gamma: 0.03, theta: -0.05,
  vega: 0.1, cost: 10, defensePower: 5, updatedBy: '',
};

export default function OptionCardsAdmin() {
  const { optionCards, mergeConflicts, actions } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OptionCard>>(emptyCard);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof OptionCard>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [resolutions, setResolutions] = useState<Record<string, 'OLD' | 'NEW'>>({});

  const handleSort = (key: keyof OptionCard) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...optionCards].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortIcon = ({ field }: { field: keyof OptionCard }) => (
    sortKey === field ? (sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : null
  );

  const openAdd = () => { setEditingId(null); setFormData(emptyCard); setShowForm(true); };

  const openEdit = (card: OptionCard) => {
    setEditingId(card.id);
    setFormData({ name: card.name, type: card.type, strikePrice: card.strikePrice, daysToExpiry: card.daysToExpiry, marginRequirement: card.marginRequirement, delta: card.delta, gamma: card.gamma, theta: card.theta, vega: card.vega, cost: card.cost, defensePower: card.defensePower, updatedBy: card.updatedBy });
    setShowForm(true);
  };

  const handleSave = () => {
    const result = actions.saveOptionCard(formData, editingId ?? undefined);
    if (result.requiresManualReview) return;
    setShowForm(false);
  };

  const handleResolve = () => {
    actions.resolveConflicts(resolutions);
    setResolutions({});
    setShowForm(false);
  };

  const handleDelete = (id: string) => { actions.deleteOptionCard(id); setDeleteConfirm(null); };

  const num = (v: unknown) => <span className="font-mono">{String(v)}</span>;

  const conflictData = mergeConflicts?.type === 'OPTION_CARD' ? mergeConflicts : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">期权卡管理</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />新增期权卡</button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              {([['name','名称'],['type','类型'],['strikePrice','行权价'],['daysToExpiry','到期日'],['marginRequirement','保证金'],['delta','Delta'],['gamma','Gamma'],['theta','Theta'],['vega','Vega'],['cost','费用'],['defensePower','防御力'],['version','版本'],['updatedBy','修改人']] as [string, string][]).map(([k, l]) => (
                <th key={k} className="px-3 py-2 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort(k as keyof OptionCard)}>
                  {l} <SortIcon field={k as keyof OptionCard} />
                </th>
              ))}
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(card => (
              <tr key={card.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)]">
                <td className="px-3 py-2 font-medium">{card.name}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs bg-[var(--color-accent-info)]/10 text-[var(--color-accent-info)]">{card.type}</span></td>
                <td className="px-3 py-2">{num(card.strikePrice)}</td>
                <td className="px-3 py-2">{num(card.daysToExpiry)}</td>
                <td className="px-3 py-2">{num(card.marginRequirement)}</td>
                <td className="px-3 py-2">{num(card.delta)}</td>
                <td className="px-3 py-2">{num(card.gamma)}</td>
                <td className="px-3 py-2">{num(card.theta)}</td>
                <td className="px-3 py-2">{num(card.vega)}</td>
                <td className="px-3 py-2">{num(card.cost)}</td>
                <td className="px-3 py-2">{num(card.defensePower)}</td>
                <td className="px-3 py-2">{card.version}</td>
                <td className="px-3 py-2">{card.updatedBy}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(card)} className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent-info)]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm(card.id)} className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent-danger)]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">{editingId ? '编辑期权卡' : '新增期权卡'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">名称</label><input className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={formData.name ?? ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">类型</label><select className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={formData.type ?? 'CALL'} onChange={e => setFormData({ ...formData, type: e.target.value as OptionType })}>{OPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              {([['strikePrice','行权价'],['daysToExpiry','到期天数'],['marginRequirement','保证金要求'],['delta','Delta'],['gamma','Gamma'],['theta','Theta'],['vega','Vega'],['cost','费用'],['defensePower','防御力']] as [string, string][]).map(([k, l]) => (
                <div key={k}><label className="block text-xs text-[var(--color-text-muted)] mb-1">{l}</label><input type="number" step="any" className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[var(--color-text-primary)]" value={(formData[k as keyof OptionCard] as number | string) ?? ''} onChange={e => setFormData({ ...formData, [k]: parseFloat(e.target.value) || 0 })} /></div>
              ))}
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">修改人</label><input className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={formData.updatedBy ?? ''} onChange={e => setFormData({ ...formData, updatedBy: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">取消</button>
              <button onClick={handleSave} className="btn-primary px-4 py-2 flex items-center gap-1"><Check className="w-4 h-4" />保存</button>
            </div>
          </div>
        </div>
      )}

      {conflictData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-lg">
            <div className="flex items-center gap-2 mb-4 text-[var(--color-accent-warning)]">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-display text-lg font-bold">冲突需手动确认</h2>
            </div>
            <div className="space-y-2 mb-4">
              {conflictData.conflicts.map(c => (
                <div key={String(c.field)} className="p-3 rounded-lg bg-[var(--color-bg-secondary)]">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">{String(c.field)}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setResolutions({ ...resolutions, [String(c.field)]: 'OLD' })} className={`flex-1 px-3 py-2 rounded text-sm border ${resolutions[String(c.field)] === 'OLD' ? 'diff-removed border-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10' : 'border-[var(--color-border)]'}`}>
                      旧值: <span className="font-mono">{String(c.oldValue)}</span>
                    </button>
                    <button onClick={() => setResolutions({ ...resolutions, [String(c.field)]: 'NEW' })} className={`flex-1 px-3 py-2 rounded text-sm border ${resolutions[String(c.field)] === 'NEW' ? 'diff-added border-[var(--color-accent-success)] bg-[var(--color-accent-success)]/10' : 'border-[var(--color-border)]'}`}>
                      新值: <span className="font-mono">{String(c.newValue)}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleResolve} className="btn-primary w-full py-2">确认选择</button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-sm">
            <h2 className="font-display text-lg font-bold mb-2">确认删除</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">确定要删除此期权卡吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary px-4 py-2">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 rounded-lg bg-[var(--color-accent-danger)] text-white font-medium">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
