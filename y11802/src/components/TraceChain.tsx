import { FileText, CheckCircle, Calculator, Gauge } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getSourceTypeText, getSourceTypeColor, formatDateTime } from '@/utils/formatters';
import type { SourceType } from '@/types';

const sourceTypeIcons: Record<SourceType, React.ElementType> = {
  redemption_application: FileText,
  share_confirmation: CheckCircle,
  quota_threshold: Gauge,
  settlement_rule: Calculator,
};

interface TraceChainProps {
  requestId: string;
}

export default function TraceChain({ requestId }: TraceChainProps) {
  const { traceRecords } = useRedemptionStore();
  const traces = traceRecords
    .filter(t => t.requestId === requestId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (traces.length === 0) {
    return <p className="text-sm text-slate-500 italic">暂无溯源记录</p>;
  }

  return (
    <div className="relative">
      {traces.map((trace, index) => {
        const Icon = sourceTypeIcons[trace.sourceType] || FileText;
        return (
          <div key={trace.id} className="relative pl-8 pb-5 last:pb-0">
            {index < traces.length - 1 && (
              <div className="absolute left-[11px] top-7 w-0.5 h-full bg-slate-700" />
            )}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
              <Icon className="w-3 h-3 text-slate-400" />
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className={`source-tag ${getSourceTypeColor(trace.sourceType)}`}>
                  {getSourceTypeText(trace.sourceType)}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(trace.timestamp)}</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">{trace.conclusion}</p>
              <p className="text-xs text-slate-400">
                <span className="text-slate-500">来源：</span>
                {trace.source}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
