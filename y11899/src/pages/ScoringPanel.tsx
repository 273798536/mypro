import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DIMENSION_LABELS } from '@/types';
import type { WeightConfig } from '@/types';
import { cn } from '@/lib/utils';

const DIMENSION_COLORS: Record<string, string> = {
  price: 'text-blue-600',
  energyConsumption: 'text-green-600',
  afterSales: 'text-purple-600',
  deliveryPeriod: 'text-orange-600',
};

const DIMENSION_ACCENT: Record<string, string> = {
  price: 'bg-blue-500',
  energyConsumption: 'bg-green-500',
  afterSales: 'bg-purple-500',
  deliveryPeriod: 'bg-orange-500',
};

const DIMENSION_RANGE_BG: Record<string, string> = {
  price: 'accent-blue-500',
  energyConsumption: 'accent-green-500',
  afterSales: 'accent-purple-500',
  deliveryPeriod: 'accent-orange-500',
};

function isRowAnomalous(s: { price: number; energyConsumption: number; afterSales: number; deliveryPeriod: number }) {
  return s.price <= 0 || s.energyConsumption < 0 || s.afterSales <= 0 || s.deliveryPeriod <= 0;
}

function cellAnomalous(field: string, value: number) {
  if (field === 'price') return value <= 0;
  if (field === 'energyConsumption') return value < 0;
  if (field === 'afterSales') return value <= 0;
  if (field === 'deliveryPeriod') return value <= 0;
  return false;
}

export default function ScoringPanel() {
  const suppliers = useStore(s => s.suppliers);
  const weights = useStore(s => s.weights);
  const notes = useStore(s => s.notes);
  const highlightedSupplierId = useStore(s => s.highlightedSupplierId);
  const highlightedDimension = useStore(s => s.highlightedDimension);
  const updateSupplier = useStore(s => s.updateSupplier);
  const addSupplier = useStore(s => s.addSupplier);
  const removeSupplier = useStore(s => s.removeSupplier);
  const setWeights = useStore(s => s.setWeights);
  const addNote = useStore(s => s.addNote);
  const recalculate = useStore(s => s.recalculate);

  const [draftWeights, setDraftWeights] = useState<WeightConfig>(weights);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [noteSupplier, setNoteSupplier] = useState('');
  const [noteDimension, setNoteDimension] = useState('price');
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('当前委员');

  useEffect(() => { setDraftWeights(weights); }, [weights]);

  const handleWeightChange = useCallback((key: keyof WeightConfig, value: number) => {
    const next = { ...draftWeights, [key]: value };
    setDraftWeights(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setWeights(next, '当前委员');
    }, 300);
  }, [draftWeights, setWeights]);

  const handleWeightBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    setWeights(draftWeights, '当前委员');
  }, [draftWeights, setWeights]);

  const weightTotal = draftWeights.price + draftWeights.energyConsumption + draftWeights.afterSales + draftWeights.deliveryPeriod;

  const handleAddNote = () => {
    if (!noteSupplier || !noteContent.trim()) return;
    addNote({ supplierId: noteSupplier, dimension: noteDimension, content: noteContent.trim(), author: noteAuthor.trim() || '当前委员' });
    setNoteContent('');
  };

  const notesBySupplier = notes.reduce<Record<string, typeof notes>>((acc, n) => {
    (acc[n.supplierId] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-amber-500 rounded-full" />
          <h2 className="text-lg font-semibold text-slate-800">供应商报价区</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs uppercase">
                <th className="px-3 py-2 text-left">供应商名称</th>
                <th className="px-3 py-2 text-left">来源</th>
                <th className="px-3 py-2 text-right">价格(万元)</th>
                <th className="px-3 py-2 text-right">能耗(kW·h)</th>
                <th className="px-3 py-2 text-right">售后(分)</th>
                <th className="px-3 py-2 text-right">交付期(天)</th>
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => {
                const rowAnomaly = isRowAnomalous(s);
                return (
                  <tr key={s.id} className={cn(rowAnomaly && 'bg-red-50 border-l-4 border-l-red-400')}>
                    {(['name', 'source'] as const).map(field => (
                      <td key={field} className="px-3 py-2">
                        <input className="w-full bg-transparent border-b border-slate-200 focus:border-amber-400 outline-none"
                          value={s[field]} onChange={e => updateSupplier(s.id, field, e.target.value)} />
                      </td>
                    ))}
                    {(['price', 'energyConsumption', 'afterSales', 'deliveryPeriod'] as const).map(field => (
                      <td key={field} className={cn(
                        'px-3 py-2',
                        cellAnomalous(field, s[field]) && 'bg-red-100',
                        highlightedSupplierId === s.id && highlightedDimension === field && 'ring-2 ring-amber-400',
                      )}>
                        <input type="number" className="w-full text-right font-mono bg-transparent border-b border-slate-200 focus:border-amber-400 outline-none"
                          value={s[field]} onChange={e => updateSupplier(s.id, field, Number(e.target.value))} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeSupplier(s.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addSupplier}
          className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">+ 添加供应商</button>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-lg font-semibold text-slate-800">权重调节区</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(DIMENSION_LABELS) as (keyof WeightConfig)[]).map(key => (
            <div key={key} className="space-y-1">
              <label className={cn('text-sm font-medium', DIMENSION_COLORS[key])}>{DIMENSION_LABELS[key]}</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={draftWeights[key]}
                  onChange={e => handleWeightChange(key, Number(e.target.value))}
                  onBlur={handleWeightBlur}
                  className={cn('flex-1 h-2 rounded-lg cursor-pointer', DIMENSION_RANGE_BG[key])} />
                <input type="number" min={0} max={100} value={draftWeights[key]}
                  onChange={e => handleWeightChange(key, Number(e.target.value))}
                  onBlur={handleWeightBlur}
                  className="w-16 text-right font-mono text-sm border border-slate-200 rounded px-2 py-1" />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', weightTotal === 100 ? 'bg-emerald-500' : 'bg-amber-400')}
              style={{ width: `${Math.min(weightTotal, 100)}%` }} />
          </div>
          <div className={cn('mt-2 text-sm px-3 py-2 rounded border',
            weightTotal === 100 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-700')}>
            {weightTotal === 100
              ? '权重总和 100%，可以计算'
              : `权重总和为 ${weightTotal}%，需调整为 100% 才能计算`}
          </div>
        </div>
        <button onClick={recalculate}
          className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2 rounded-lg transition-colors">
          计算排名
        </button>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h2 className="text-lg font-semibold text-slate-800">评委备注区</h2>
        </div>
        <div className="space-y-4 mb-6">
          {Object.entries(notesBySupplier).map(([sid, ns]) => {
            const supplier = suppliers.find(s => s.id === sid);
            return (
              <div key={sid}>
                <h3 className="text-sm font-medium text-slate-600 mb-1">{supplier?.name ?? '未知供应商'}</h3>
                <div className="space-y-1">
                  {ns.map(n => (
                    <div key={n.id} className="text-xs text-slate-500 pl-3 border-l-2 border-slate-200">
                      <span className="font-medium text-slate-700">[{DIMENSION_LABELS[n.dimension] ?? n.dimension}]</span>
                      {' '}{n.content}
                      <span className="ml-2 text-slate-400">— {n.author}</span>
                      <span className="ml-2 text-slate-300">{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {notes.length === 0 && <p className="text-sm text-slate-400">暂无备注</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <select value={noteSupplier} onChange={e => setNoteSupplier(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1.5 text-sm">
            <option value="">选择供应商</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={noteDimension} onChange={e => setNoteDimension(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1.5 text-sm">
            {Object.entries(DIMENSION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="备注内容" value={noteContent} onChange={e => setNoteContent(e.target.value)}
            className="flex-1 min-w-[160px] border border-slate-200 rounded px-2 py-1.5 text-sm" />
          <input placeholder="作者" value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)}
            className="w-24 border border-slate-200 rounded px-2 py-1.5 text-sm" />
          <button onClick={handleAddNote}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-1.5 rounded transition-colors">
            添加
          </button>
        </div>
      </section>
    </div>
  );
}
