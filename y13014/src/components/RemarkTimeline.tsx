import { BookOpen, FileSignature } from 'lucide-react';
import type { Remark } from '@/types';

interface Props {
  remarks: Remark[];
}

export default function RemarkTimeline({ remarks }: Props) {
  if (remarks.length === 0) {
    return <div className="text-sm text-slate-400">暂无备注</div>;
  }

  return (
    <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
      {remarks.map((r) => (
        <li key={r.id} className="pl-5 relative animate-fade-in-up">
          <span
            className={[
              'absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4',
              r.isTemporaryLedger
                ? 'bg-amber-500 ring-amber-100'
                : 'bg-deep-sea-600 ring-deep-sea-50',
            ].join(' ')}
          />
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{r.author}</span>
            <span className="text-xs text-slate-400">{r.createdAt}</span>
            {r.isTemporaryLedger && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium ring-1 ring-amber-600/20">
                <FileSignature size={11} />
                临时台账备注
              </span>
            )}
          </div>
          <div className="text-sm text-slate-700 leading-relaxed flex items-start gap-2">
            <BookOpen size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <span>{r.content}</span>
          </div>
          {r.judgmentImpact && (
            <div className="mt-2 ml-4 pl-3 border-l-2 border-amber-200">
              <div className="text-xs font-medium text-amber-700 mb-0.5">对判断的影响</div>
              <div className="text-sm text-amber-800 leading-relaxed">{r.judgmentImpact}</div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
