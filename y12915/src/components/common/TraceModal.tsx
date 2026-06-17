import { X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import type { EvaluationSample, ModelVersion, CorrectionLog } from '@/types';
import { buildTraceBreadcrumb } from '@/utils/traceability';
import { format } from 'date-fns';
import useAppStore from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface TraceModalProps {
  open: boolean;
  onClose: () => void;
  sample: EvaluationSample | null;
  versions: ModelVersion[];
}

export default function TraceModal({ open, onClose, sample, versions }: TraceModalProps) {
  const correctionLogs = useAppStore((s) => s.correctionLogs);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !sample) return null;

  const breadcrumb = buildTraceBreadcrumb(sample, versions);
  const logs: CorrectionLog[] = correctionLogs.filter((l) => l.sampleId === sample.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-[640px] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-3">
          <div className="flex-1">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-slate-300">/</span>}
                  <span className={cn(i === breadcrumb.length - 1 && 'text-slate-700 font-medium')}>
                    {b}
                  </span>
                </span>
              ))}
            </nav>
            <h2 className="mt-2 text-xl font-bold text-slate-800">追溯详情</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">原始行号</div>
            <div className="text-5xl font-mono font-bold text-sky-600">
              #{sample.originalRowNumber}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">源文件名</div>
              <div className="text-sm font-medium text-slate-800 font-mono">
                {sample.sourceFileName}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">批次 ID</div>
              <div className="text-sm font-medium text-slate-800 font-mono">{sample.batchId}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">数据来源</div>
              <div className="text-sm font-medium text-slate-800">{sample.dataSource}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">模型分数</div>
              <div className="text-sm font-mono font-semibold text-slate-800">
                {sample.modelScore.toFixed(2)}
                {sample.humanCorrectedScore !== undefined && (
                  <span className="ml-2 text-emerald-600">
                    → {sample.humanCorrectedScore.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(sample.imageName || sample.imageUrl) && (
            <div>
              <div className="text-xs text-slate-500 mb-2">
                图片{sample.imageName ? `：${sample.imageName}` : ''}
              </div>
              {sample.imageUrl ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={sample.imageUrl}
                    alt={sample.imageName ?? 'preview'}
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-400">暂无图片预览</div>
              )}
            </div>
          )}

          {sample.sourceNote && (
            <div>
              <div className="text-xs text-slate-500 mb-1">来源备注</div>
              <div className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                {sample.sourceNote}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-slate-500 mb-2">历次修正记录</div>
            {logs.length > 0 ? (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 text-sm bg-slate-50 rounded-md px-3 py-2 border border-slate-100"
                  >
                    <div className="text-slate-400 font-mono text-xs pt-0.5 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MM-dd HH:mm')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-slate-500">
                          {log.oldScore.toFixed(2)}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="font-mono font-semibold text-sky-600">
                          {log.newScore.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">{log.operator}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{log.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400 bg-slate-50 rounded-md px-3 py-2 border border-dashed border-slate-200">
                暂无修正记录
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            关闭
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm">
            <ExternalLink size={14} />
            跳转原始记录
          </button>
        </div>
      </div>
    </div>
  );
}
