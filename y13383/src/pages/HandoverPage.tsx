import { CheckSquare, Square, ArrowRight, Copy, Check, GitBranch, FileCheck } from 'lucide-react';
import { CURRENT_BATCH } from '@/data/mockData';
import { useAppStore } from '@/store/useAppStore';
import { getSafeResultText, getStatusLabel, getCategoryLabel } from '@/utils/statusCalc';
import { useState } from 'react';

const CHECKLIST_META: { key: keyof typeof CURRENT_BATCH.handoverChecklist; label: string; desc: string; icon: any }[] = [
  { key: 'caliperAligned', label: '离线/线上口径已对齐', desc: 's001、s003口径差异说明已标注', icon: GitBranch },
  { key: 'boundaryMarked', label: '边界样本已标记', desc: 's005边界样本已提交三人复核组', icon: FileCheck },
  { key: 'pollutionIsolated', label: '验证集污染已隔离', desc: 's006不计入通过率，处理结论禁用"通过"', icon: FileCheck },
  { key: 'grayBreakdownReady', label: '灰度三因素拆解完成', desc: '样本/阈值/人工改判三因素已拆分', icon: GitBranch },
];

export default function HandoverPage() {
  const { handoverChecklist, toggleChecklistItem, openDrawer, setActiveView } = useAppStore();
  const batch = CURRENT_BATCH;
  const [copied, setCopied] = useState(false);

  const samples = [...batch.samples].sort((a, b) => a.createdAt - b.createdAt);

  const summaryCopy = `【模型压缩 v1.3 交接摘要】
共 ${batch.samples.length} 条失败样本：
  · 已处理：${batch.overallMetrics.processedCount} 条
  · 待补材料：${batch.overallMetrics.pendingCount} 条（s007 多模态图）
  · 人工改判：${batch.overallMetrics.manualCount} 条（s004标注错误、s005边界、s006污染、s008翻译争议）
  · 验证集污染：${batch.overallMetrics.pollutionCount} 条（s006 LeetCode原题，不计入通过率）
口径差异：s001（截断长度差异）、s003（ASR口语化分布漂移）
灰度提升：v1.2→v1.3 净提升 +1.4pp（样本+1.2 / 阈值-0.6 / 人工+0.8）
-- 评测工程师 小唐`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const checklistPassed = CHECKLIST_META.every(m => handoverChecklist[m.key]);
  const checklistCount = CHECKLIST_META.filter(m => handoverChecklist[m.key]).length;

  return (
    <div className="p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      <section>
        <div className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Engineer · Handover View</div>
        <h1 className="serif text-3xl md:text-4xl font-semibold text-slate-100 mt-1">评测工程师交接视图</h1>
        <p className="mt-2 text-[13px] text-slate-400 serif italic">
          左栏：失败队列 → 原始说法；右栏：摘要处理结果；逐项映射，确保"能从失败找到原始说法，能从摘要讲清处理结果"。
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 rounded-2xl border border-ink-800 bg-ink-900/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-800 flex items-center justify-between">
            <h2 className="serif text-lg text-slate-100 flex items-center gap-2">
              <GitBranch size={15} className="text-violet-400" />
              双栏映射：失败队列原始说法 → 页面摘要处理结果
            </h2>
            <span className="text-[11px] text-slate-500">共 {samples.length} 条逐项对应</span>
          </div>
          <div className="max-h-[540px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-ink-900/95 backdrop-blur z-10 border-b border-ink-800">
                <tr className="text-left text-[10.5px] uppercase tracking-widest text-slate-500">
                  <th className="py-3 px-4 font-normal w-[44px]">#</th>
                  <th className="py-3 px-3 font-normal w-[78px]">样本</th>
                  <th className="py-3 px-3 font-normal">失败队列原始说法</th>
                  <th className="py-3 px-2 w-[28px]"></th>
                  <th className="py-3 px-3 font-normal">页面摘要 · 处理结果</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s, idx) => {
                  const firstStmt = s.originalStatement[0];
                  const pollution = s.category === 'validation_pollution';
                  const boundary = s.category === 'boundary';
                  const rowCls = pollution ? 'bg-rose-500/4' : boundary ? 'bg-amber-500/4' : '';
                  return (
                    <tr key={s.id} className={`border-b border-ink-800/60 hover:bg-ink-800/30 transition ${rowCls}`}>
                      <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 align-top">
                        <button onClick={() => openDrawer(s.id)}
                          className="text-left group">
                          <div className="text-[10.5px] font-mono text-slate-500 group-hover:text-violet-300 transition">{s.id.toUpperCase()}</div>
                          <div className={`text-[10px] mt-0.5 px-1.5 py-px rounded inline-block border
                            ${s.status === 'processed' ? 'border-emerald-400/30 text-emerald-300' :
                              s.status === 'pending_material' ? 'border-amber-400/30 text-amber-300' :
                              'border-violet-400/30 text-violet-300'}`}>
                            {getStatusLabel(s.status)}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 align-top pr-4">
                        <button onClick={() => openDrawer(s.id)} className="text-left w-full group">
                          <div className="serif text-slate-200 font-medium group-hover:text-white transition">{s.name}</div>
                          <div className="mt-1 text-[11.5px] text-slate-400 leading-snug">
                            <span className="text-slate-500 italic">[{firstStmt?.source || '无来源'}]</span>{' '}
                            {firstStmt?.content || '原始说法缺失'}
                          </div>
                          {s.category !== 'normal' && (
                            <div className={`mt-1 text-[10.5px] inline-block px-1.5 py-px rounded
                              ${pollution ? 'bg-rose-500/15 text-rose-300 border border-rose-400/30' : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'}`}>
                              {getCategoryLabel(s.category)}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-2 align-top">
                        <div className="mt-6">
                          <ArrowRight size={14} className="text-slate-600" />
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <button onClick={() => openDrawer(s.id)} className="text-left w-full group">
                          <div className={`text-[12px] serif font-medium
                            ${pollution ? 'text-rose-300' : boundary ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {getSafeResultText(s)}
                          </div>
                          <div className="mt-1 text-[11.5px] text-slate-400 leading-snug line-clamp-3">
                            {s.processedNote || '（处理备注待补充）'}
                          </div>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">交接检查清单</div>
                <h2 className="serif text-xl text-slate-100 mt-1">{checklistCount}/{CHECKLIST_META.length} 项就绪</h2>
              </div>
              <div className={`w-12 h-12 rounded-2xl grid place-items-center border-2 transition
                ${checklistPassed ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}>
                {checklistPassed ? <Check size={22} strokeWidth={2.5} /> : checklistCount}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CHECKLIST_META.map(m => {
                const checked = handoverChecklist[m.key];
                const Icon = m.icon;
                return (
                  <button key={m.key} onClick={() => toggleChecklistItem(m.key)}
                    className={`group w-full text-left p-3.5 rounded-xl border transition-all
                      ${checked ? 'border-emerald-400/40 bg-emerald-500/8 hover:bg-emerald-500/12' : 'border-ink-700 bg-ink-800/40 hover:bg-ink-800/70 hover:border-ink-500'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded border grid place-items-center transition
                        ${checked ? 'border-emerald-400/60 bg-emerald-500/30 text-emerald-200' : 'border-ink-600 text-slate-600'}`}>
                        {checked ? <CheckSquare size={13} /> : <Square size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`serif text-[13.5px] font-medium ${checked ? 'text-emerald-200' : 'text-slate-200'}`}>
                          {m.label}
                        </div>
                        <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">{m.desc}</div>
                      </div>
                      <Icon size={14} className={checked ? 'text-emerald-400/70' : 'text-slate-600'} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">交接话术 · 一键复制</div>
            <h2 className="serif text-xl text-slate-100 mb-3">给现场老师的口述稿</h2>
            <pre className="text-[11.5px] leading-relaxed text-slate-300 whitespace-pre-wrap font-mono p-3 rounded-lg bg-ink-950/70 border border-ink-800">
{summaryCopy}
            </pre>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={onCopy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2
                  ${copied ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50' :
                    'bg-gradient-to-r from-violet-500 to-sky-500 text-white hover:shadow-lg hover:shadow-violet-500/30'}`}>
                {copied ? <><Check size={14} />已复制到剪贴板</> : <><Copy size={14} />复制交接话术</>}
              </button>
              <button onClick={() => { setActiveView('teacher'); window.location.hash = '#/'; }}
                className="px-4 py-2.5 rounded-xl border border-ink-700 text-slate-300 text-sm hover:bg-ink-800 transition">
                切老师视图
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
