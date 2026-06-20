import { useMemo } from 'react';
import { Filter, AlertTriangle, AlertOctagon, Link2, Search, ChevronRight, Sparkles } from 'lucide-react';
import { CURRENT_BATCH } from '@/data/mockData';
import { useAppStore } from '@/store/useAppStore';
import { getCategoryLabel, getSafeResultText, getStatusLabel } from '@/utils/statusCalc';
import { hasCaliperIssue, metricFormat } from '@/utils/caliperAlign';
import type { CompressionSample, FailureType, SampleCategory, SampleStatus } from '@/types';

const FAILURE_LABEL: Record<FailureType, string> = {
  metric_mismatch: '口径不一致',
  threshold: '阈值未达标',
  label_error: '标注争议',
  pollution: '数据污染',
  unknown: '待分类',
};

export default function QueuePage() {
  const { activeStatusFilter, setStatusFilter, openDrawer } = useAppStore();
  const batch = CURRENT_BATCH;

  const filtered = useMemo(() => {
    if (activeStatusFilter === 'all') return batch.samples;
    return batch.samples.filter(s => s.status === activeStatusFilter);
  }, [batch.samples, activeStatusFilter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => a.createdAt - b.createdAt),
  [filtered]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <section>
        <div className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Failure Queue · 主流程时间线</div>
        <h1 className="serif text-3xl md:text-4xl font-semibold text-slate-100 mt-1">失败队列</h1>
        <p className="mt-2 text-[13px] text-slate-400 serif italic">
          按材料出现顺序拼接，断点用虚线标注；<b className="text-rose-300">玫红斜纹</b>为验证集污染、
          <b className="text-amber-300">琥珀边</b>为边界样本；点击任意卡片唤起证据抽屉回溯样本。
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <FilterBar active={activeStatusFilter} onChange={setStatusFilter} />
        <div className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 px-3.5 py-2 text-[12.5px] text-slate-300">
          <Search size={13} className="text-slate-500" />
          小样例包 · 共 {batch.samples.length} 条 / 筛选后 {filtered.length} 条
        </div>
        <CategoryLegend />
      </section>

      <section className="relative pl-8">
        <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-sky-500/30 to-emerald-500/40" />
        <ol className="space-y-4">
          {sorted.map((s, idx) => {
            const gap = idx > 0 ? (s.createdAt - sorted[idx - 1].createdAt) / 86400000 : 0;
            return (
              <li key={s.id}>
                {gap > 1 && (
                  <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500 pl-2">
                    <span className="inline-block w-6 border-t border-dashed border-slate-600" />
                    <span className="italic serif">材料断点 · 间隔 {gap.toFixed(1)} 天</span>
                    <span className="inline-block flex-1 border-t border-dashed border-slate-600" />
                  </div>
                )}
                <SampleCard sample={s} onClick={() => openDrawer(s.id)} index={idx + 1} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function FilterBar({ active, onChange }: { active: string; onChange: (v: any) => void }) {
  const items: { key: 'all' | SampleStatus; label: string; color: string }[] = [
    { key: 'all', label: '全部', color: 'text-slate-300' },
    { key: 'processed', label: '已处理', color: 'text-emerald-300' },
    { key: 'pending_material', label: '待补材料', color: 'text-amber-300' },
    { key: 'manual_review', label: '人工改判', color: 'text-violet-300' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-ink-800 bg-ink-900/50 p-1">
      <span className="px-2.5 text-[12px] text-slate-500 flex items-center gap-1.5"><Filter size={12} />状态</span>
      {items.map(it => (
        <button key={it.key} onClick={() => onChange(it.key)}
          className={`px-3.5 py-1.5 rounded-lg text-[12.5px] transition
            ${active === it.key ? `bg-ink-800 ${it.color} shadow-inner shadow-black/30` : 'text-slate-400 hover:text-slate-200'}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

function CategoryLegend() {
  const items = [
    { c: 'bg-rose-500/20 border-rose-400/50 pollution-stripe', t: '验证集污染（禁用"通过"文案）' },
    { c: 'bg-amber-500/10 border-amber-400/50', t: '边界样本（人工复核）' },
    { c: 'bg-ink-800 border-ink-700', t: '正常失败样本' },
  ];
  return (
    <div className="flex items-center gap-2 ml-auto flex-wrap">
      {items.map(i => (
        <div key={i.t} className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className={`w-4 h-4 rounded border ${i.c}`} />
          <span>{i.t}</span>
        </div>
      ))}
    </div>
  );
}

function SampleCard({ sample, onClick, index }: { sample: CompressionSample; onClick: () => void; index: number }) {
  const pollution = sample.category === 'validation_pollution';
  const boundary = sample.category === 'boundary';
  const pending = sample.status === 'pending_material';
  const result = getSafeResultText(sample);

  const cardBase = 'hover-leftbar group relative w-full text-left rounded-xl border p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5';
  const borderCls = pollution
    ? 'border-rose-400/60 pollution-stripe bg-rose-500/5 hover:border-rose-400/80'
    : boundary
    ? 'border-amber-400/50 bg-amber-500/5 hover:border-amber-400/70'
    : pending
    ? 'border-amber-700/40 bg-ink-900/80 hover:border-amber-500/50'
    : 'border-ink-700 bg-ink-900/60 hover:border-sky-400/40';

  const caliperSamples = Object.entries(sample.metrics).filter(([, m]) => m && hasCaliperIssue(m));

  return (
    <div className="relative">
      <div className="absolute -left-[38px] top-6 w-[30px] grid place-items-center">
        <div className={`w-5 h-5 rounded-full border-2 border-ink-950 grid place-items-center text-[10px] font-bold text-white
          ${pollution ? 'bg-rose-500' : boundary ? 'bg-amber-500' : pending ? 'bg-amber-700' : 'bg-gradient-to-br from-violet-500 to-sky-500'}`}>
          {index}
        </div>
      </div>

      <button onClick={onClick} className={`${cardBase} ${borderCls}`}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-ink-800/80 text-slate-400 font-mono">{sample.id.toUpperCase()}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/30 text-sky-300">
                <Sparkles size={10} className="inline -mt-0.5 mr-1" />{FAILURE_LABEL[sample.failureType]}
              </span>
              {pollution && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/40 text-rose-300 font-medium">
                  <AlertOctagon size={10} className="inline -mt-0.5 mr-1" />{getCategoryLabel(sample.category)}
                </span>
              )}
              {boundary && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 font-medium">
                  <AlertTriangle size={10} className="inline -mt-0.5 mr-1" />{getCategoryLabel(sample.category)}
                </span>
              )}
              {sample.status && (
                <span className={`text-[11px] px-2 py-0.5 rounded border
                  ${sample.status === 'processed' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' :
                    sample.status === 'pending_material' ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' :
                    'border-violet-400/30 bg-violet-500/10 text-violet-300'}`}>
                  {getStatusLabel(sample.status)}
                </span>
              )}
            </div>

            <h3 className="serif text-lg font-semibold text-slate-100 group-hover:text-white transition">{sample.name}</h3>

            <p className="mt-2 text-[12.5px] text-slate-400 leading-relaxed line-clamp-2 italic serif">
              {sample.inputPreview}
            </p>

            {caliperSamples.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-rose-300">
                <Link2 size={11} className="shrink-0" />
                <span>存在 {caliperSamples.length} 个指标的离线/线上口径差异，点击卡片查看详细说明</span>
              </div>
            )}
          </div>

          <div className="shrink-0 min-w-[220px]">
            <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">关键指标</div>
              {Object.entries(sample.metrics).slice(0, 2).map(([k, m]) => {
                if (!m) return null;
                const issue = hasCaliperIssue(m);
                return (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-ink-800/70 last:border-0">
                    <span className="text-[11px] text-slate-400 uppercase">{k.slice(0, 4)}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[12px]">
                      <span className="text-violet-300 cursor-help border-b border-dashed border-violet-500/50" title="离线">{metricFormat(k as any, m.offline)}</span>
                      <span className="text-slate-600">/</span>
                      <span className={`${issue ? 'text-rose-300 animate-pulse' : 'text-emerald-300'} cursor-help border-b border-dashed ${issue ? 'border-rose-500/50' : 'border-emerald-500/50'}`} title="线上">{metricFormat(k as any, m.online)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mt-3 rounded-lg border p-3 text-[12px]
              ${pollution ? 'border-rose-400/40 bg-rose-500/10 text-rose-200' :
                pending ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' :
                boundary ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' :
                'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">处理结论</div>
              <div className="serif font-medium">{result}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-ink-800/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-3">
            <span>提交 {new Date(sample.createdAt).toLocaleDateString('zh-CN')}</span>
            {sample.processedBy && <span>· 处理人：{sample.processedBy}</span>}
          </div>
          <span className="text-[11.5px] text-slate-400 group-hover:text-violet-300 flex items-center gap-1 transition">
            查看证据链 <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
          </span>
        </div>
      </button>
    </div>
  );
}
