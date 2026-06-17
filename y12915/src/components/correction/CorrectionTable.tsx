import { useState, useMemo } from 'react';
import type { EvaluationSample } from '@/types';
import { cn } from '@/lib/utils';
import TraceButton from '@/components/common/TraceButton';
import TraceModal from '@/components/common/TraceModal';
import StatusBadge from '@/components/common/StatusBadge';
import useAppStore from '@/store/useAppStore';
import { Search, Eye } from 'lucide-react';

interface CorrectionTableProps {
  samples: EvaluationSample[];
  onEditSample: (sample: EvaluationSample) => void;
  statusFilter?: string;
  searchQuery?: string;
  className?: string;
}

function getStatusLabel(s: EvaluationSample): 'direct_use' | 'need_review' | 'rejected' | 'pending' {
  if (s.isCorrected || s.humanCorrectedScore !== undefined) return 'direct_use';
  return s.reviewStatus;
}

export default function CorrectionTable({
  samples,
  onEditSample,
  statusFilter = 'all',
  searchQuery = '',
  className,
}: CorrectionTableProps) {
  const versions = useAppStore((s) => s.versions);
  const [traceSample, setTraceSample] = useState<EvaluationSample | null>(null);
  const [traceModalOpen, setTraceModalOpen] = useState(false);

  const filteredSamples = useMemo(() => {
    let result = samples;

    if (statusFilter !== 'all') {
      result = result.filter((s) => {
        if (statusFilter === 'corrected') return s.isCorrected || s.humanCorrectedScore !== undefined;
        if (statusFilter === 'not_corrected') return !s.isCorrected && s.humanCorrectedScore === undefined;
        if (statusFilter === 'need_review') return s.reviewStatus === 'need_review';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.originalRowNumber?.toString().includes(q) ||
          s.imageName?.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [samples, statusFilter, searchQuery]);

  function handleTrace(sample: EvaluationSample) {
    setTraceSample(sample);
    setTraceModalOpen(true);
  }

  return (
    <div className={cn(
      'rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden',
      className
    )}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-200">样本修正列表</div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30">
            {filteredSamples.length} 条
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="按行号/图片名搜索..."
              className="w-60 pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[65vh]">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 sticky top-0 z-10">
            <tr className="text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-14">追溯</th>
              <th className="px-3 py-3 text-left">行号</th>
              <th className="px-3 py-3 text-left">图片</th>
              <th className="px-3 py-3 text-right">模型分</th>
              <th className="px-3 py-3 text-right">人工分</th>
              <th className="px-3 py-3 text-right">差值</th>
              <th className="px-3 py-3 text-left">修正理由</th>
              <th className="px-3 py-3 text-left">来源备注</th>
              <th className="px-3 py-3 text-center">状态</th>
              <th className="px-3 py-3 text-center w-28">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {filteredSamples.map((sample, idx) => {
              const modelScore = sample.modelScore;
              const humanScore = sample.humanCorrectedScore;
              const diff = humanScore !== undefined ? humanScore - modelScore : null;
              const status = getStatusLabel(sample);

              return (
                <tr
                  key={sample.id}
                  className={cn(
                    'transition-colors hover:bg-slate-700/30',
                    idx % 2 === 1 && 'bg-slate-800/30'
                  )}
                >
                  <td className="px-3 py-3">
                    <TraceButton sample={sample} onTrace={handleTrace} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-slate-300 font-semibold">
                      #{sample.originalRowNumber}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {sample.imageUrl ? (
                        <img
                          src={sample.imageUrl}
                          alt={sample.imageName}
                          className="w-12 h-10 object-cover rounded-md border border-slate-600"
                        />
                      ) : (
                        <div className="w-12 h-10 rounded-md border border-slate-600 border-dashed bg-slate-700/30 flex items-center justify-center text-slate-500 text-xs">
                          无图
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-slate-200 truncate max-w-[160px]">
                          {sample.imageName ?? '-'}
                        </div>
                        {sample.dataSource && (
                          <div className="text-xs text-slate-500">{sample.dataSource}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono text-slate-300">{modelScore.toFixed(1)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {humanScore !== undefined ? (
                      <span className="font-mono font-semibold text-sky-400">
                        {humanScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {diff !== null ? (
                      <span className={cn(
                        'font-mono font-semibold',
                        diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'
                      )}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {sample.correctionReason ? (
                      <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                        {sample.correctionReason}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {sample.sourceNote ? (
                      <span className="text-xs text-slate-400 truncate max-w-[120px] block">
                        {sample.sourceNote}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onEditSample(sample)}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        humanScore !== undefined
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600'
                          : 'bg-sky-600 text-white hover:bg-sky-500 shadow-sm hover:shadow-sky-500/20'
                      )}
                    >
                      <Eye size={12} />
                      {humanScore !== undefined ? '重新修正' : '修正'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredSamples.length === 0 && (
        <div className="px-5 py-12 text-center">
          <div className="text-slate-500 text-sm">暂无匹配的样本数据</div>
        </div>
      )}

      <TraceModal
        open={traceModalOpen}
        onClose={() => setTraceModalOpen(false)}
        sample={traceSample}
        versions={versions}
      />
    </div>
  );
}
