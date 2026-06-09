import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronUp } from 'lucide-react';
import type { ReviewStatus } from '@/types';
import { reviewStatusColor, reviewStatusLabel } from '@/utils/validation';

interface ReviewItemProps {
  label: string;
  status: ReviewStatus;
  detail: string;
  icon?: React.ReactNode;
}

export const ReviewItem = ({ label, status, detail, icon }: ReviewItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const color = reviewStatusColor[status];

  const StatusIcon =
    status === 'pass'
      ? CheckCircle2
      : status === 'warning'
        ? AlertTriangle
        : XCircle;

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
          status === 'fail'
            ? 'border-[#F87171]/30 bg-[#F87171]/5 hover:bg-[#F87171]/10'
            : status === 'warning'
              ? 'border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10'
              : 'border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10'
        }`}
      >
        {icon && <span className="text-slate-400">{icon}</span>}
        <div className="flex items-center gap-1.5">
          <StatusIcon className="h-4 w-4" style={{ color }} />
          <span
            className="text-[11px] font-semibold text-slate-200"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {label}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              backgroundColor: `${color}22`,
              color,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {reviewStatusLabel[status]}
          </span>
        </div>
        <ChevronUp
          className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? '' : 'rotate-180'}`}
        />
      </button>
      {expanded && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-slate-700/60 bg-[#0B1026] p-3 shadow-2xl">
          <p className="text-[11px] leading-relaxed text-slate-300">{detail}</p>
        </div>
      )}
    </div>
  );
};
