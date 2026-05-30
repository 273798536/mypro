import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useSoundscapeStore } from '@/store/useSoundscapeStore';
import { TraceVisualization } from '@/components/TraceVisualization';
import type { TraceEntry } from '../../shared/types';

export default function ReplayReport() {
  const { id } = useParams<{ id: string }>();
  const { traceReport, loading, error, fetchTraceReport } = useSoundscapeStore();
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) fetchTraceReport(id);
  }, [id, fetchTraceReport]);

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!id) return;
    const a = document.createElement('a');
    a.href = `/api/reports/${id}/export`;
    a.download = `report-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading && traceReport.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              返回关卡大厅
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              溯源报告
            </h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出 JSON
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {traceReport.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">暂无审判记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {traceReport.map((entry: TraceEntry, index: number) => {
              const entryId = entry.judgment.id;
              const isExpanded = expandedEntries.has(entryId);

              return (
                <div
                  key={entryId}
                  className="bg-[var(--bg-secondary)] rounded-xl border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => toggleEntry(entryId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">审判 #{traceReport.length - index}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          ID: {entryId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-[var(--text-secondary)]">得分</div>
                        <div
                          className={`font-bold ${
                            entry.judgment.score >= 20 ? 'text-green-400' : entry.judgment.score >= 10 ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          +{entry.judgment.score}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[var(--text-secondary)]">情绪修正</div>
                        <div
                          className={`font-bold ${
                            entry.judgment.emotionModifier >= 1.0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          x{entry.judgment.emotionModifier.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[var(--text-secondary)]">时间</div>
                        <div className="text-sm">
                          {new Date(entry.judgment.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10">
                      <TraceVisualization entry={entry} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
