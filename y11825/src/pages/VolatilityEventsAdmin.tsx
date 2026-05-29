import { useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Check } from 'lucide-react';
import type { VolatilityEvent, ImpactScope } from '@/types';

const IMPACT_SCOPES: ImpactScope[] = ['ALL', 'SPOT', 'EXPIRING'];

const emptyEvent: Partial<VolatilityEvent> = {
  name: '', description: '', triggerRound: 1, volatilityJump: 0.1,
  impactScope: 'ALL', isContinuous: false, duration: 1, updatedBy: '',
};

export default function VolatilityEventsAdmin() {
  const { volatilityEvents, mergeConflicts, actions } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VolatilityEvent>>(emptyEvent);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof VolatilityEvent>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [resolutions, setResolutions] = useState<Record<string, 'OLD' | 'NEW'>>({});

  const handleSort = (key: keyof VolatilityEvent) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...volatilityEvents].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
    if (typeof va === 'boolean' && typeof vb === 'boolean') return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortIcon = ({ field }: { field: keyof VolatilityEvent }) => (
    sortKey === field ? (sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : null
  );

  const openAdd = () => { setEditingId(null); setFormData(emptyEvent); setShowForm(true); };

  const openEdit = (evt: VolatilityEvent) => {
    setEditingId(evt.id);
    setFormData({ name: evt.name, description: evt.description, triggerRound: evt.triggerRound, volatilityJump: evt.volatilityJump, impactScope: evt.impactScope, isContinuous: evt.isContinuous, duration: evt.duration, updatedBy: evt.updatedBy });
    setShowForm(true);
  };

  const handleSave = () => {
    const result = actions.saveVolatilityEvent(formData, editingId ?? undefined);
    if (result.requiresManualReview) return;
    setShowForm(false);
  };

  const handleResolve = () => {
    actions.resolveConflicts(resolutions);
    setResolutions({});
    setShowForm(false);
  };

  const handleDelete = (id: string) => { actions.deleteVolatilityEvent(id); setDeleteConfirm(null); };

  const num = (v: unknown) => <span className="font-mono">{String(v)}</span>;

  const conflictData = mergeConflicts?.type === 'VOLATILITY_EVENT' ? mergeConflicts : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">波动事件管理</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />新增事件</button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              {([['name','名称'],['description','描述'],['triggerRound','触发回合'],['volatilityJump','波动跳跃'],['impactScope','影响范围'],['isContinuous','持续'],['duration','持续时间'],['version','版本'],['updatedBy','修改人']] as [string, string][]).map(([k, l]) => (
                <th key={k} className="px-3 py-2 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort(k as keyof VolatilityEvent)}>
                  {l} <SortIcon field={k as keyof VolatilityEvent} />
                </th>
              ))}
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(evt => (
              <tr key={evt.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)]">
                <td className="px-3 py-2 font-medium">{evt.name}</td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)] max-w-[200px] truncate">{evt.description}</td>
                <td className="px-3 py-2">{num(evt.triggerRound)}</td>
                <td className="px-3 py-2"><span className="font-mono text-[var(--color-accent-warning)]">{(evt.volatilityJump * 100).toFixed(0)}%</span></td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]">{evt.impactScope}</span></td>
                <td className="px-3 py-2">{evt.isContinuous ? <span className="text-[var(--color-accent-success)]">是</span> : <span className="text-[var(--color-text-muted)]">否</span>}</td>
                <td className="px-3 py-2">{num(evt.duration)}</td>
                <td className="px-3 py-2">{evt.version}</td>
                <td className="px-3 py-2">{evt.updatedBy}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(evt)} className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent-info)]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm(evt.id)} className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent-danger)]"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="font-display text-lg font-bold">{editingId ? '编辑波动事件' : '新增波动事件'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">名称</label><input className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={formData.name ?? ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">描述</label><textarea className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" rows={2} value={formData.description ?? ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">触发回合</label><input type="number" className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[var(--color-text-primary)]" value={formData.triggerRound ?? 1} onChange={e => setFormData({ ...formData, triggerRound: parseInt(e.target.value) || 1 })} /></div>
                <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">波动跳跃</label><input type="number" step="0.01" className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[var(--color-text-primary)]" value={formData.volatilityJump ?? 0.1} onChange={e => setFormData({ ...formData, volatilityJump: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">影响范围</label><select className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]" value={formData.impactScope ?? 'ALL'} onChange={e => setFormData({ ...formData, impactScope: e.target.value as ImpactScope })}>{IMPACT_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isContinuous ?? false} onChange={e => setFormData({ ...formData, isContinuous: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm">持续事件</span>
                </label>
              </div>
              {formData.isContinuous && (
                <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">持续时间（回合）</label><input type="number" className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[var(--color-text-primary)]" value={formData.duration ?? 1} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })} /></div>
              )}
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
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">确定要删除此波动事件吗？此操作不可撤销。</p>
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
