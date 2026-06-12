import { useState } from 'react';
import { Waves, ChevronDown, ChevronUp, Plus, Trash2, FileDigit } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import type { TidalHarmonic } from '@/types';
import { getSourceMaterials } from '@/utils/tideCalculator';

const MAJOR = ['M2', 'S2', 'K1', 'O1'];
const MINOR = ['P1', 'K2', 'N2', 'Q1', 'M4', 'MS4'];

export default function HarmonicsForm() {
  const harmonics = useCalcStore(s => s.harmonics);
  const setHarmonics = useCalcStore(s => s.setHarmonics);
  const [open, setOpen] = useState(true);

  function update(i: number, field: keyof TidalHarmonic, val: string | number) {
    const copy = harmonics.map((h, k) => k === i ? { ...h, [field]: val } : h);
    setHarmonics(copy);
  }
  function remove(i: number) { setHarmonics(harmonics.filter((_, k) => k !== i)); }
  function addConstituent(name: string) {
    if (harmonics.find(h => h.constituent === name)) return;
    setHarmonics([
      ...harmonics,
      { constituent: name, amplitude: 0, phase: 0, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
    ]);
  }

  const missingMajor = MAJOR.filter(c => !harmonics.find(h => h.constituent === c));
  const sources = getSourceMaterials(harmonics);

  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-ocean-500" />
          <span className="panel-title">潮汐调和常数</span>
          <span className="status-tag-available">{harmonics.length} 分潮</span>
          {missingMajor.length > 0 && (
            <span className="status-tag-deferred">缺主分潮 {missingMajor.join('、')}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ocean-500" /> : <ChevronDown className="w-4 h-4 text-ocean-500" />}
      </div>
      {open && (
        <div className="p-4 space-y-3">
          {sources.length > 0 && (
            <div className="p-2 rounded bg-ocean-50 border border-ocean-100 text-xs flex items-start gap-2">
              <FileDigit className="w-3.5 h-3.5 text-ocean-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-ocean-700 font-medium mb-0.5">来源材料（用于结论回链）：</div>
                <div className="text-ocean-900">{sources.map(s => `《${s}》`).join(' · ')}</div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {MAJOR.map(c => {
              const exists = harmonics.find(h => h.constituent === c);
              return (
                <button key={c}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    exists ? 'bg-status-available-soft text-status-available'
                           : 'bg-slate-100 text-ocean-500 hover:bg-ocean-50 border border-dashed border-ocean-300'
                  }`}
                  onClick={() => !exists && addConstituent(c)}>
                  {c} {exists ? '✓' : ''}
                </button>
              );
            })}
            <span className="px-1.5 py-0.5 text-[11px] text-ocean-400">主分潮</span>
            {MINOR.map(c => {
              const exists = harmonics.find(h => h.constituent === c);
              return (
                <button key={c}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    exists ? 'bg-ocean-50 text-ocean-700 border border-ocean-200'
                           : 'bg-slate-50 text-ocean-400 hover:bg-ocean-50'
                  }`}
                  onClick={() => !exists && addConstituent(c)}>
                  {c} {exists ? '✓' : '+'}
                </button>
              );
            })}
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-ocean-50 text-ocean-700">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium w-16">分潮</th>
                  <th className="px-3 py-1.5 text-right font-medium">振幅 (cm)</th>
                  <th className="px-3 py-1.5 text-right font-medium">迟角 (°)</th>
                  <th className="px-3 py-1.5 text-left font-medium">来源材料编号</th>
                  <th className="px-3 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {harmonics.map((h, i) => (
                  <tr key={h.constituent + i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono font-semibold text-ocean-900">{h.constituent}</td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.1" className="input-field !py-1 text-xs !px-2 tabular-nums font-mono text-right"
                             value={h.amplitude} onChange={e => update(i, 'amplitude', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.1" className="input-field !py-1 text-xs !px-2 tabular-nums font-mono text-right"
                             value={h.phase} onChange={e => update(i, 'phase', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-1">
                      <input className="input-field !py-1 text-xs !px-2" value={h.sourceMaterial}
                             onChange={e => update(i, 'sourceMaterial', e.target.value)} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button className="text-ocean-400 hover:text-status-recollect" onClick={() => remove(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {harmonics.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-ocean-500 text-xs">
                    请点击上方分潮名录入调和常数，或使用"载入示例"自动填入
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
