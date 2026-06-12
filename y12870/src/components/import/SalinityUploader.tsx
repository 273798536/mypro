import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FlaskConical, CheckCircle2, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import { detectDominantUnit, markUnitMismatches, getUnitExplanation } from '@/utils/salinityConverter';
import type { SalinityRecord, SalinityUnit } from '@/types';

const UNIT_LABELS: Record<SalinityUnit, string> = {
  'PSU': 'PSU', '‰': '‰（千分比）', 'ppt': 'ppt', 'mS/cm': 'mS/cm（电导）',
};

function guessSalinityRows(raws: Record<string, any>[], source: string): SalinityRecord[] {
  return raws.map((r, i) => {
    const unitStr = String(r.unit ?? r.单位 ?? 'PSU').trim();
    const unit = (['PSU', '‰', 'ppt', 'mS/cm'].includes(unitStr) ? unitStr : 'PSU') as SalinityUnit;
    return {
      id: `imp_${Date.now()}_${i}`,
      station: String(r.station ?? r.站位 ?? 'ST' + (i + 1)),
      timestamp: String(r.timestamp ?? r.时间 ?? new Date().toISOString().slice(0, 16).replace('T', ' ')),
      depth: Number(r.depth ?? r.深度 ?? 0),
      value: Number(r.value ?? r.盐度 ?? r.salinity ?? 0),
      unit,
    };
  });
}

export default function SalinityUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const salinity = useCalcStore(s => s.salinity);
  const source = useCalcStore(s => s.salinitySourceName);
  const setSalinity = useCalcStore(s => s.setSalinity);
  const mismatch = useCalcStore(s => s.unitMismatchCount);
  const openModal = useCalcStore(s => s.openUnitModal);
  const [open, setOpen] = useState(true);
  const [err, setErr] = useState('');

  async function handleFile(f: File) {
    setErr('');
    try {
      let rows: Record<string, any>[] = [];
      if (f.name.toLowerCase().endsWith('.csv')) {
        rows = await new Promise((res, rej) => {
          Papa.parse(f, {
            header: true, skipEmptyLines: true,
            complete: r => res(r.data as Record<string, any>[]),
            error: e => rej(e),
          });
        });
      } else {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, any>[];
      }
      if (!rows.length) { setErr('文件为空'); return; }
      const records = markUnitMismatches(guessSalinityRows(rows, f.name));
      setSalinity(records, f.name);
    } catch (e: any) {
      setErr('解析失败：' + (e?.message || '未知错误'));
    }
  }

  function remove() { setSalinity([], ''); setErr(''); }

  const dominant = salinity.length ? detectDominantUnit(salinity) : null;
  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-ocean-500" />
          <span className="panel-title">盐度观测记录</span>
          {!source && <span className="status-tag-recollect">未导入</span>}
          {source && (
            <>
              <span className="status-tag-available">{salinity.length} 条 · {new Set(salinity.map(s => s.station)).size} 站</span>
              {mismatch > 0 && (
                <button
                  className="status-tag-recollect hover:opacity-80 transition"
                  onClick={e => { e.stopPropagation(); openModal(); }}
                >
                  混用 {mismatch} 行
                </button>
              )}
            </>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ocean-500" /> : <ChevronDown className="w-4 h-4 text-ocean-500" />}
      </div>
      {open && (
        <div className="p-4 space-y-3">
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                 onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button
            className="w-full py-5 border-2 border-dashed rounded-lg border-ocean-200
                       hover:border-ocean-500 hover:bg-ocean-50 transition-colors
                       flex flex-col items-center gap-2 text-ocean-700"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-6 h-6 text-ocean-500" />
            <span className="text-sm font-medium">上传盐度剖面 CSV / Excel</span>
            <span className="text-xs text-ocean-500/70">列：station / timestamp / depth / value / unit</span>
          </button>

          {source && (
            <div className="flex items-center justify-between text-sm p-2 rounded bg-status-available-soft">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-status-available shrink-0" />
                <div className="min-w-0">
                  <div className="truncate tabular-nums">{source}</div>
                  {dominant && <div className="text-[11px] text-ocean-700">主口径 {UNIT_LABELS[dominant]} · {getUnitExplanation('‰', 'PSU')}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {mismatch > 0 && (
                  <button className="status-tag-deferred hover:opacity-80" onClick={openModal}>
                    <AlertTriangle className="w-3 h-3" /> 处理单位混用
                  </button>
                )}
                <button className="btn-ghost" onClick={remove}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
          {err && <div className="p-2 rounded bg-status-recollect-soft text-xs text-status-recollect">{err}</div>}

          {salinity.length > 0 && (
            <div className="max-h-40 overflow-y-auto workbench-scroll border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-ocean-50 sticky top-0">
                  <tr className="text-ocean-700">
                    <th className="px-2 py-1.5 text-left font-medium">站位</th>
                    <th className="px-2 py-1.5 text-left font-medium">深度</th>
                    <th className="px-2 py-1.5 text-right font-medium">数值</th>
                    <th className="px-2 py-1.5 text-left font-medium">单位</th>
                    <th className="px-2 py-1.5 text-right font-medium">统一(PSU)</th>
                  </tr>
                </thead>
                <tbody>
                  {salinity.slice(0, 20).map(s => (
                    <tr key={s.id} className={`border-t border-slate-100 ${s.unitMismatch ? 'bg-status-deferred-soft/50' : ''}`}>
                      <td className="px-2 py-1 tabular-nums">{s.station}</td>
                      <td className="px-2 py-1 tabular-nums text-right">{s.depth}m</td>
                      <td className={`px-2 py-1 tabular-nums text-right font-mono ${s.unitMismatch ? 'text-status-deferred font-semibold' : ''}`}>
                        {s.value.toFixed(s.unit === 'mS/cm' ? 0 : 2)}
                      </td>
                      <td className="px-2 py-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${s.unitMismatch ? 'bg-status-deferred/20 text-status-deferred' : 'bg-ocean-100 text-ocean-700'}`}>
                          {s.unit}
                        </span>
                      </td>
                      <td className="px-2 py-1 tabular-nums text-right font-mono text-ocean-900">
                        {(s.normalizedValue ?? s.value).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {salinity.length > 20 && (
                    <tr><td colSpan={5} className="text-center py-1 text-ocean-500 text-[10px]">…另有 {salinity.length - 20} 条记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
