import { X, AlertTriangle, Clock, Users, ChevronDown, ChevronRight, Link2, Tag } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { CURRENT_BATCH } from '@/data/mockData';
import { getCategoryLabel, getSafeResultText } from '@/utils/statusCalc';
import { hasCaliperIssue, caliperGap, getCaliperNote, metricLabel, metricFormat } from '@/utils/caliperAlign';
import { useState } from 'react';

export default function EvidenceDrawer() {
  const { drawerOpen, selectedSampleId, closeDrawer } = useAppStore();
  const sample = CURRENT_BATCH.samples.find(s => s.id === selectedSampleId);
  const [panels, setPanels] = useState<Record<string, boolean>>({
    original: true, metrics: true, content: true, judgment: true,
  });
  const toggle = (k: string) => setPanels(p => ({ ...p, [k]: !p[k] }));

  if (!drawerOpen || !sample) return null;

  const categoryClass =
    sample.category === 'validation_pollution'
      ? 'pollution-stripe border-rose-400/60'
      : sample.category === 'boundary'
      ? 'border-amber-400/50 bg-amber-500/5'
      : 'border-ink-700 bg-ink-900/60';

  const resultText = getSafeResultText(sample);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDrawer} />
      <aside className="absolute right-0 top-0 h-full w-[680px] max-w-full bg-ink-900 border-l border-ink-800 shadow-2xl animate-slide-in-right flex flex-col">
        <header className={`h-20 border-b border-ink-800 p-5 flex items-start gap-4 ${categoryClass}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded bg-ink-800 text-slate-400 font-mono tracking-wide">{sample.id.toUpperCase()}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded border
                ${sample.category === 'validation_pollution' ? 'border-rose-400/50 text-rose-300 bg-rose-500/10' :
                  sample.category === 'boundary' ? 'border-amber-400/50 text-amber-300 bg-amber-500/10' :
                  'border-slate-600 text-slate-300 bg-ink-800'}`}>
                {sample.category === 'validation_pollution' && <AlertTriangle size={11} className="inline -mt-0.5 mr-1" />}
                {getCategoryLabel(sample.category)}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-violet-500/15 border border-violet-400/30 text-violet-300">
                <Tag size={11} className="inline -mt-0.5 mr-1" />{sample.modelVersion}
              </span>
            </div>
            <h3 className="serif text-xl font-semibold text-slate-100 mt-1.5 leading-snug truncate">{sample.name}</h3>
          </div>
          <button onClick={closeDrawer}
            className="w-8 h-8 rounded-md border border-ink-700 grid place-items-center text-slate-400 hover:text-white hover:bg-ink-800 transition">
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-emerald-300/80">处理结论</div>
              {sample.processedBy && <div className="text-[11px] text-slate-400 flex items-center gap-1"><Users size={11}/>{sample.processedBy}</div>}
            </div>
            <div className="mt-2 serif text-lg text-emerald-200 font-medium">{resultText}</div>
            {sample.processedNote && (
              <p className="mt-2 text-[13px] leading-relaxed text-slate-300 border-t border-emerald-500/20 pt-2">{sample.processedNote}</p>
            )}
          </div>

          <Panel title="原始说法时间线" icon={<Clock size={13} />} open={panels.original} onToggle={() => toggle('original')} count={sample.originalStatement.length}>
            <ol className="relative border-l border-ink-700 ml-2 space-y-4">
              {sample.originalStatement.map((e, idx) => (
                <li key={e.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-400 to-sky-400 border-2 border-ink-900" />
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="serif italic font-medium text-slate-300">{e.title}</span>
                    <span>·</span>
                    <span>{e.source}</span>
                    <span>·</span>
                    <span>{new Date(e.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-300 leading-relaxed">{e.content}</p>
                  {idx < sample.originalStatement.length - 1 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Link2 size={10} className="text-slate-600" />
                      <span className="italic">→ 下一条补充记录</span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="离线/线上指标对比（点击分数查看口径差异）" icon={<AlertTriangle size={13} className="text-amber-400"/>} open={panels.metrics} onToggle={() => toggle('metrics')}>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(sample.metrics).map(([key, m]) => {
                if (!m) return null;
                const k = key as keyof typeof sample.metrics;
                const issue = hasCaliperIssue(m);
                return (
                  <div key={key} className={`rounded-md border p-3 transition
                    ${issue ? 'border-rose-400/40 bg-rose-500/5' : 'border-ink-700 bg-ink-800/40'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] text-slate-400">{metricLabel(k as any)}</div>
                      {issue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 animate-pulse">
                        gap {caliperGap(m)}
                      </span>}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-3">
                      <button onClick={() => {}}
                        className="group text-left rounded-md border border-dashed border-ink-600 hover:border-violet-400/60 bg-ink-900/40 p-2 transition">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">离线</div>
                        <div className="text-lg serif font-semibold text-slate-100 group-hover:text-violet-300 transition">
                          {metricFormat(k as any, m.offline)}
                        </div>
                      </button>
                      <button onClick={() => {}}
                        className="group text-left rounded-md border border-dashed border-ink-600 hover:border-violet-400/60 bg-ink-900/40 p-2 transition">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">线上</div>
                        <div className="text-lg serif font-semibold text-slate-100 group-hover:text-violet-300 transition">
                          {metricFormat(k as any, m.online)}
                        </div>
                      </button>
                    </div>
                    {issue && (
                      <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-400/20 text-[11.5px] text-amber-200 leading-relaxed">
                        <span className="font-semibold">口径说明：</span>{getCaliperNote(m)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="样本内容（输入 / 模型输出 / 人工标注）" open={panels.content} onToggle={() => toggle('content')}>
            <div className="space-y-3">
              <Field label="样本输入摘要" value={sample.inputPreview} tone="sky" />
              <Field label="模型输出" value={sample.modelOutput} tone="violet" />
              <Field label="人工标注 / 真值" value={sample.groundTruth} tone="emerald" />
            </div>
          </Panel>

          <Panel title="判定规则命中说明" open={panels.judgment} onToggle={() => toggle('judgment')}>
            <div className="code-block border-l-4 border-l-violet-500/60">
              <div className="text-[11px] text-slate-500 mb-1"># rule_hit / {sample.failureType}</div>
              {sample.judgmentRule}
            </div>
          </Panel>

        </div>
      </aside>
    </div>
  );
}

function Panel(props: {
  title: string; icon?: React.ReactNode; open: boolean; onToggle: () => void; count?: number; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/40 overflow-hidden">
      <button onClick={props.onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-ink-800/40 transition">
        {props.open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        {props.icon}
        <span className="serif text-[14px] text-slate-200 font-medium flex-1">{props.title}</span>
        {typeof props.count === 'number' && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-ink-800 text-slate-400">{props.count}</span>
        )}
      </button>
      {props.open && <div className="px-4 pb-4 pt-1">{props.children}</div>}
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'violet' | 'emerald' }) {
  const colors = {
    sky: 'border-sky-400/30 text-sky-200 bg-sky-500/5',
    violet: 'border-violet-400/30 text-violet-200 bg-violet-500/5',
    emerald: 'border-emerald-400/30 text-emerald-200 bg-emerald-500/5',
  } as const;
  const lcolors = { sky: 'text-sky-400', violet: 'text-violet-400', emerald: 'text-emerald-400' } as const;
  return (
    <div>
      <div className={`text-[11px] uppercase tracking-wider mb-1 ${lcolors[tone]}`}>{label}</div>
      <div className={`rounded-md border ${colors[tone]} p-3 text-[13px] leading-relaxed`}>{value || '—'}</div>
    </div>
  );
}
