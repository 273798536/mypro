import { X, FileCheck, AlertCircle, GitBranch, CheckCircle2, Clipboard } from 'lucide-react';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SummaryModal() {
  const dataset = useSpeckleStore((s) => s.dataset);
  const isOpen = useSpeckleStore((s) => s.isSummaryOpen);
  const setOpen = useSpeckleStore((s) => s.setSummaryOpen);
  const selectAnomaly = useSpeckleStore((s) => s.selectAnomaly);
  const [copied, setCopied] = useState(false);

  if (!dataset) return null;

  const anomalies = dataset.dataPoints
    .filter((p) => p.anomaly)
    .map((p) => p.anomaly!)
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  const handleCopy = async () => {
    const text = `【激光散斑参数回放摘要】
设备：${dataset.deviceName}
材料：${dataset.materialName}
参数版本：${dataset.summary.paramVersion}
异常点数：${dataset.summary.anomalyCount} 处

异常清单：
${anomalies
  .map(
    (a, i) =>
      `${i + 1}. [${a.type === 'extreme' ? '极端值' : a.type === 'noise' ? '噪声' : '缺失'}] ${a.description}（影响采样点 #${a.affectedRangeStart}-#${a.affectedRangeEnd}）`
  )
  .join('\n')}

处理结论：
${dataset.summary.conclusion}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 z-40',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          'fixed inset-x-0 top-[8%] mx-auto max-w-2xl w-[92%] bg-slate-900/95 border border-slate-700/60 rounded-3xl shadow-2xl shadow-black/60 z-50 transition-all duration-500 ease-out overflow-hidden',
          isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
      >
        <div className="relative px-7 pt-7 pb-4">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">页面摘要</h2>
                <p className="text-xs text-slate-400 mt-0.5">激光散斑参数回放 · 复核摘要</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600'
                )}
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制文本'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  参数版本
                </span>
              </div>
              <div className="text-sm font-mono text-white">{dataset.summary.paramVersion}</div>
              <div className="text-[11px] text-slate-500 mt-1">{dataset.materialName}</div>
            </div>
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  异常点清单
                </span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {dataset.summary.anomalyCount}
                <span className="text-sm font-normal text-slate-500 ml-1">处</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">点击可跳转追溯</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                异常明细
              </span>
              <span className="text-[10px] text-slate-600">点击条目查看追溯</span>
            </div>
            <div className="divide-y divide-slate-700/40">
              {anomalies.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => {
                    selectAnomaly(a);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center shrink-0 text-[11px] font-mono text-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          a.type === 'extreme' && 'bg-orange-500/20 text-orange-400',
                          a.type === 'noise' && 'bg-amber-500/20 text-amber-400',
                          a.type === 'missing' && 'bg-rose-500/20 text-rose-400'
                        )}
                      >
                        {a.type === 'extreme' ? '极端值' : a.type === 'noise' ? '疑似噪声' : '数据缺失'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">
                        #{a.affectedRangeStart}-#
                        {a.affectedRangeEnd}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{a.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                处理结论
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{dataset.summary.conclusion}</p>
          </div>
        </div>
      </div>
    </>
  );
}
