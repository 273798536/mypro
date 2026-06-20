import { useState } from 'react';
import { Download, AlertTriangle, Bug, Search, Filter, X } from 'lucide-react';
import SampleTable from '@/components/SampleTable';
import SampleDrawer from '@/components/SampleDrawer';
import OverrideModal from '@/components/OverrideModal';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { exportSamplesToCsv } from '@/utils/csvExport';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | 'negative' | 'contaminated';

export default function Samples() {
  const { currentSnapshot, selectedSample } = useGatekeeperStore();
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  if (!currentSnapshot) return null;

  const samples = currentSnapshot.samples.filter((s) => {
    if (query && !s.query.includes(query) && !s.groundTruth.includes(query) && !s.id.includes(query)) {
      return false;
    }
    return true;
  });

  const contaminatedSamples = currentSnapshot.samples.filter((s) => s.isContaminated);
  const negativeSamples = currentSnapshot.samples.filter((s) => !s.isHit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">样本明细</h1>
          <p className="mt-1 text-[12px] text-slate-400">
            共 {currentSnapshot.samples.length} 条样本 · {negativeSamples.length} 条未命中 ·{' '}
            {contaminatedSamples.length} 条污染
          </p>
        </div>
        <button
          onClick={() => exportSamplesToCsv(currentSnapshot.samples)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/20"
        >
          <Download className="h-4 w-4" />
          导出 CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 query / ground truth / 样本 ID"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 py-2.5 pl-9 pr-9 text-[12px] text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-slate-700 bg-slate-800/60 p-0.5">
          {[
            { key: 'all' as FilterMode, label: '全部', count: currentSnapshot.samples.length },
            { key: 'negative' as FilterMode, label: '异常样本', count: negativeSamples.length, icon: Bug, color: 'rose' },
            { key: 'contaminated' as FilterMode, label: '污染样本', count: contaminatedSamples.length, icon: AlertTriangle, color: 'amber' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition',
                filterMode === f.key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {f.icon && <f.icon className={cn('h-3.5 w-3.5', f.color === 'rose' && 'text-rose-400', f.color === 'amber' && 'text-amber-400')} />}
              {f.label}
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px]',
                  filterMode === f.key ? 'bg-slate-600 text-white' : 'bg-slate-900/50 text-slate-500'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {contaminatedSamples.length > 0 && filterMode !== 'contaminated' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-[12px]">
            <p className="font-medium text-amber-400">存在 {contaminatedSamples.length} 条验证集污染警告</p>
            <ul className="mt-2 space-y-1 text-amber-200/80">
              {contaminatedSamples.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span className="font-mono text-amber-300">{s.id}:</span>
                  <span className="text-[11px]">{s.contaminationSource}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <SampleTable
        samples={samples}
        showOnlyNegative={filterMode === 'negative'}
        showOnlyContaminated={filterMode === 'contaminated'}
      />

      <SampleDrawer />
      <OverrideModal />
    </div>
  );
}
