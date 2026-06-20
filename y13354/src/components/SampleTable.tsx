import { useState } from 'react';
import { ChevronRight, AlertTriangle, Bug, ExternalLink } from 'lucide-react';
import type { Sample } from '@/types';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

interface Props {
  samples: Sample[];
  showOnlyNegative?: boolean;
  showOnlyContaminated?: boolean;
}

type SortKey = 'query' | 'isHit' | 'score' | 'contribution' | 'latency';
type SortOrder = 'asc' | 'desc';

export default function SampleTable({ samples, showOnlyNegative, showOnlyContaminated }: Props) {
  const { selectSample } = useGatekeeperStore();
  const [sortKey, setSortKey] = useState<SortKey>('contribution');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filtered = samples.filter((s) => {
    if (showOnlyNegative && s.isHit) return false;
    if (showOnlyContaminated && !s.isContaminated) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    switch (sortKey) {
      case 'query':
        va = a.query;
        vb = b.query;
        break;
      case 'isHit':
        va = a.isHit ? 1 : 0;
        vb = b.isHit ? 1 : 0;
        break;
      case 'score':
        va = a.score;
        vb = b.score;
        break;
      case 'contribution':
        va = a.contributionToMetric;
        vb = b.contributionToMetric;
        break;
      case 'latency':
        va = a.latencyMs;
        vb = b.latencyMs;
        break;
    }
    if (typeof va === 'string') {
      return sortOrder === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    }
    return sortOrder === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => (
    <span className={cn('ml-1 text-[10px]', active ? 'text-blue-400' : 'text-slate-600')}>
      {active ? (order === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('query')}>
                查询词
                <SortIcon active={sortKey === 'query'} order={sortOrder} />
              </th>
              <th className="px-4 py-3 font-medium">真实标签</th>
              <th className="px-4 py-3 font-medium">Top3预测</th>
              <th className="px-4 py-3 font-medium cursor-pointer select-none text-center" onClick={() => toggleSort('isHit')}>
                命中
                <SortIcon active={sortKey === 'isHit'} order={sortOrder} />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer select-none text-right" onClick={() => toggleSort('score')}>
                分数
                <SortIcon active={sortKey === 'score'} order={sortOrder} />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer select-none text-right" onClick={() => toggleSort('contribution')}>
                指标影响
                <SortIcon active={sortKey === 'contribution'} order={sortOrder} />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer select-none text-right" onClick={() => toggleSort('latency')}>
                延迟
                <SortIcon active={sortKey === 'latency'} order={sortOrder} />
              </th>
              <th className="px-4 py-3 font-medium text-center">标记</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  没有匹配的样本
                </td>
              </tr>
            ) : (
              sorted.map((sample) => {
                const override = sample.id === 'demo-override-001';
                return (
                  <tr
                    key={sample.id}
                    className={cn(
                      'group border-b border-slate-700/50 transition-colors',
                      !sample.isHit && !override && 'bg-rose-500/5',
                      sample.isContaminated && 'bg-amber-500/10',
                      override && 'bg-blue-500/10',
                      'hover:bg-slate-700/30'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{sample.query}</span>
                        <span className="font-mono text-[9px] text-slate-600">{sample.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{sample.groundTruth}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sample.predictions.slice(0, 3).map((p) => (
                          <span
                            key={p.rank}
                            className={cn(
                              'rounded px-1.5 py-0.5 font-mono text-[10px]',
                              p.docId === sample.groundTruth
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700 text-slate-300'
                            )}
                          >
                            {p.docId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {override ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                          <ExternalLink className="h-2.5 w-2.5" />
                          改判通过
                        </span>
                      ) : sample.isHit ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">✓</span>
                      ) : (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-300">{sample.score.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'font-mono text-[11px]',
                          sample.contributionToMetric >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {sample.contributionToMetric >= 0 ? '+' : ''}
                        {sample.contributionToMetric.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">{sample.latencyMs.toFixed(0)}ms</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {sample.isContaminated && (
                          <span title={sample.contaminationSource}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          </span>
                        )}
                        {override && (
                          <span title="人工改判样本">
                            <Bug className="h-3.5 w-3.5 text-blue-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => selectSample(sample)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 rounded-md p-1 hover:bg-slate-700 text-slate-400 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
