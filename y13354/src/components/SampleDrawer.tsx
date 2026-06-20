import { X, AlertTriangle, Bug, FileText, GripVertical, User, Clock } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function SampleDrawer() {
  const { selectedSample, selectSample, openOverrideModal } = useGatekeeperStore();
  if (!selectedSample) return null;

  const override = selectedSample.id === 'demo-override-001';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => selectSample(null)}
      />
      <div className="fixed right-0 top-0 z-50 h-screen w-[520px] border-l border-slate-700/60 bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <h2 className="text-[15px] font-semibold text-white">样本下钻详情</h2>
            <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {selectedSample.id}
            </span>
          </div>
          <button
            onClick={() => selectSample(null)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100vh-64px)] overflow-auto p-6 space-y-5">
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">查询词</p>
            <p className="rounded-lg bg-slate-800 p-3 text-[14px] text-white">{selectedSample.query}</p>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">真实标签 (Ground Truth)</p>
            <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 font-mono text-[13px] text-emerald-400">
              {selectedSample.groundTruth}
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Top10 预测结果</p>
            <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-2 space-y-1">
              {selectedSample.predictions.map((p) => (
                <div
                  key={p.rank}
                  className={cn(
                    'flex items-center gap-3 rounded px-3 py-2',
                    p.docId === selectedSample.groundTruth
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'hover:bg-slate-700/50'
                  )}
                >
                  <span className="w-6 text-center font-mono text-[11px] text-slate-500">#{p.rank}</span>
                  <GripVertical className="h-3 w-3 text-slate-600" />
                  <span className="flex-1 font-mono text-[12px] text-white">{p.docId}</span>
                  <span className="font-mono text-[11px] text-slate-400">{p.score.toFixed(4)}</span>
                  {p.docId === selectedSample.groundTruth && (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400">MATCH</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">命中状态</p>
              {override ? (
                <p className="text-[13px] font-semibold text-blue-400">人工改判通过</p>
              ) : (
                <p className={cn('text-[13px] font-semibold', selectedSample.isHit ? 'text-emerald-400' : 'text-rose-400')}>
                  {selectedSample.isHit ? '✓ 已命中' : '✗ 未命中'}
                </p>
              )}
            </section>
            <section className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">相似度分数</p>
              <p className="font-mono text-[13px] text-white">{selectedSample.score.toFixed(4)}</p>
            </section>
            <section className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">对指标影响</p>
              <p
                className={cn(
                  'font-mono text-[13px]',
                  selectedSample.contributionToMetric >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {selectedSample.contributionToMetric >= 0 ? '+' : ''}
                {selectedSample.contributionToMetric.toFixed(3)}
              </p>
            </section>
            <section className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">查询延迟</p>
              <p className="font-mono text-[13px] text-white">{selectedSample.latencyMs.toFixed(0)} ms</p>
            </section>
          </div>

          {selectedSample.isContaminated && (
            <section className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-[12px] font-semibold text-amber-400">验证集污染</p>
              </div>
              <p className="text-[12px] leading-relaxed text-amber-200/90">
                <span className="font-semibold">特征快照原始说法：</span>
                {selectedSample.contaminationSource}
              </p>
            </section>
          )}

          {selectedSample.rawSnapshot && (
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">特征快照原始数据</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                {JSON.stringify(selectedSample.rawSnapshot, null, 2)}
              </pre>
            </section>
          )}

          {!override && (
            <button
              onClick={() => openOverrideModal(selectedSample.id)}
              className="w-full rounded-lg border border-blue-500/40 bg-blue-500/10 py-3 text-[13px] font-medium text-blue-400 transition hover:bg-blue-500/20"
            >
              <span className="inline-flex items-center gap-2">
                <Bug className="h-4 w-4" />
                人工改判此样本
              </span>
            </button>
          )}

          {override && (
            <section className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-blue-400" />
                <p className="text-[12px] font-semibold text-blue-400">已有人工改判记录</p>
              </div>
              <div className="space-y-1.5 text-[11px] text-blue-200/80">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>操作人：小林</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>时间：2026-06-19 09:15:00</span>
                </div>
                <p className="pt-1">
                  理由：该query为长尾case，线上真实场景占比{'<'}0.1%，不影响整体质量
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
