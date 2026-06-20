import { GitCompare, ChevronDown, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CURRENT_BATCH } from '@/data/mockData';
import { useAppStore } from '@/store/useAppStore';
import { buildGrayWaterfall, grayFactorColor, grayFactorLabel } from '@/utils/grayBreakdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useState } from 'react';

const BASE_RATE = 87.5; // v1.2 基线综合通过率

export default function GraylinePage() {
  const { openDrawer } = useAppStore();
  const batch = CURRENT_BATCH;
  const steps = buildGrayWaterfall(BASE_RATE, batch.grayBreakdown as any);
  const finalRate = steps.length ? steps[steps.length - 1].end : BASE_RATE;

  const chartData = [
    { name: `基线 ${batch.baselineVersion}`, start: 0, value: BASE_RATE, kind: 'baseline' },
    ...steps.map((s, i) => ({
      name: s.label,
      start: s.start,
      value: s.delta,
      end: s.end,
      kind: s.factor,
      idx: i,
    })),
    { name: `当前 ${batch.version}`, start: 0, value: finalRate, kind: 'final' },
  ];

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeBreakdown = activeIdx != null ? (batch.grayBreakdown[activeIdx]) : null;
  const activeSamples = activeBreakdown
    ? batch.samples.filter(s => activeBreakdown.sampleIds.includes(s.id))
    : [];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <section>
        <div className="text-[12px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <GitCompare size={12} /> Grayline Analysis
        </div>
        <h1 className="serif text-3xl md:text-4xl font-semibold text-slate-100 mt-1">灰度结果拆解</h1>
        <p className="mt-2 text-[13px] text-slate-400 serif italic">
          从基线 <b className="text-sky-300">{batch.baselineVersion}</b> → 当前 <b className="text-emerald-300">{batch.version}</b>，
          将通过率变化拆为三因素：样本变化 Δ / 阈值变化 Δ / 人工改判 Δ；点击每段可下钻对应样本。
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">基线版本</div>
          <div className="serif text-2xl font-semibold text-slate-100 mt-2">{batch.baselineVersion}</div>
          <div className="mt-3 text-[34px] serif font-bold text-sky-300 leading-none">{BASE_RATE.toFixed(1)}<span className="text-base font-normal text-slate-500">%</span></div>
          <div className="mt-2 text-[11.5px] text-slate-400">综合通过率（含离线+线上加权）</div>
        </div>
        {steps.map((s, idx) => (
          <button key={s.label} onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
            className={`text-left rounded-2xl border p-5 transition-all hover:-translate-y-0.5
              ${activeIdx === idx ? 'ring-2 shadow-xl' : 'border-ink-800 bg-ink-900/60 hover:border-ink-600'}`}
            style={{
              ...(activeIdx === idx ? { borderColor: s.color + '99', boxShadow: `0 10px 30px -10px ${s.color}66`, ringColor: s.color } : {}),
            }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-slate-500">{s.label}</div>
              {s.delta >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
            </div>
            <div className={`mt-3 text-[34px] serif font-bold leading-none ${s.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {s.delta >= 0 ? '+' : ''}{s.delta.toFixed(1)}<span className="text-base font-normal text-slate-500">pp</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(s.delta) * 40)}%`, background: s.color, opacity: 0.8 }} />
            </div>
            <div className="mt-2 text-[11.5px] text-slate-400 leading-snug">{s.description}</div>
            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
              <ChevronDown size={11} className={activeIdx === idx ? 'rotate-180 transition' : 'transition'} />
              {activeIdx === idx ? '收起样本明细' : `下钻 ${s.description.split(' ')[0]} 样本`}
            </div>
          </button>
        ))}
        <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-5 relative overflow-hidden">
          <div className="absolute right-4 top-4 w-16 h-16 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="text-[11px] uppercase tracking-widest text-emerald-300/80">当前版本 · 汇总</div>
          <div className="serif text-2xl font-semibold text-slate-100 mt-2">{batch.version}</div>
          <div className="mt-3 text-[34px] serif font-bold text-emerald-300 leading-none">{finalRate.toFixed(1)}<span className="text-base font-normal text-slate-500">%</span></div>
          <div className="mt-2 text-[11.5px] text-emerald-200/80">净提升 +{(finalRate - BASE_RATE).toFixed(1)} pp</div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">三因素瀑布图</div>
              <h2 className="serif text-xl text-slate-100 mt-1">通过率变化归因</h2>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1"><Info size={11}/>单位：百分比点(pp)</div>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData as any} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} fontFamily="Geist Mono" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={[84, 94]} tickFormatter={v => v + '%'} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d: any = payload[0].payload;
                    const title = d.name;
                    let body: React.ReactNode;
                    if (d.kind === 'baseline' || d.kind === 'final') {
                      body = <div className="serif text-lg font-semibold text-slate-100">{d.value.toFixed(2)}%</div>;
                    } else {
                      const color = grayFactorColor(d.kind);
                      body = (
                        <div>
                          <div className="serif text-lg font-semibold" style={{ color: d.value >= 0 ? '#10B981' : '#EC4899' }}>
                            {d.value >= 0 ? '+' : ''}{d.value.toFixed(2)} pp
                          </div>
                          <div className="text-[11.5px] text-slate-400 mt-1">{steps[d.idx].description}</div>
                          <div className="text-[11px] text-slate-500 mt-1">从 {d.start.toFixed(2)}% → {d.end.toFixed(2)}%</div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12, fontSize: 12 }}>
                        <div className="serif font-medium text-slate-200 mb-1">{title}</div>
                        {body}
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={BASE_RATE} stroke="#8B5CF6" strokeDasharray="4 4" strokeWidth={1} label={{ value: `基线 ${BASE_RATE}%`, fill: '#8B5CF6', fontSize: 10, position: 'insideTopLeft' }} />
                <Bar dataKey="value" stackId="a" barSize={52} radius={[6, 6, 0, 0]}>
                  {chartData.map((d: any, i) => {
                    let color = '#334155';
                    if (d.kind === 'baseline') color = '#8B5CF6';
                    else if (d.kind === 'final') color = '#10B981';
                    else color = grayFactorColor(d.kind);
                    return <Cell key={i} fill={color} fillOpacity={0.85} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-6 flex flex-col min-h-[0]">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">因素明细 · 样本列表</div>
          <h2 className="serif text-xl text-slate-100 mb-4">
            {activeBreakdown ? steps[activeIdx!].label : '请选择上方任一因素'}
          </h2>
          {!activeBreakdown ? (
            <div className="flex-1 grid place-items-center text-center text-slate-500 text-[13px] leading-relaxed p-6 border border-dashed border-ink-700 rounded-xl">
              <div>
                <GitCompare size={32} className="mx-auto opacity-40 mb-3" />
                <div className="serif italic">点击上方"样本变化 / 阈值变化 / 人工改判"<br/>即可查看对应样本清单</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {activeSamples.length === 0 && <div className="text-slate-500 text-[12px] italic serif p-3">（无关联样本）</div>}
              {activeSamples.map(s => (
                <button key={s.id} onClick={() => openDrawer(s.id)}
                  className="w-full text-left p-3 rounded-lg border border-ink-700 hover:border-violet-400/60 hover:bg-ink-800/60 transition group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-mono text-slate-400">{s.id.toUpperCase()}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: steps[activeIdx!].color + '22', color: steps[activeIdx!].color }}>
                      {grayFactorLabel(s.grayFactor as any) || '相关'}
                    </span>
                  </div>
                  <div className="mt-1 serif text-[14px] text-slate-200 font-medium group-hover:text-white transition truncate">{s.name}</div>
                  <div className="mt-1 text-[11.5px] text-slate-500 line-clamp-1 italic">{s.inputPreview}</div>
                </button>
              ))}
            </div>
          )}
          {activeBreakdown && (
            <div className="mt-4 pt-4 border-t border-ink-800 text-[12px] text-slate-400 leading-relaxed">
              <b className="text-slate-300 serif">说明：</b>{activeBreakdown.description}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
