import { StickyNote, ArrowRight, User, Clock } from "lucide-react";
import type { RemarkRecord } from "@/types";

interface Props {
  remarks: RemarkRecord[];
  onHighlightConclusion: () => void;
}

export default function RemarkPanel({ remarks, onHighlightConclusion }: Props) {
  if (remarks.length === 0) {
    return (
      <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h3 className="font-serif text-base font-semibold text-ink-800 mb-3 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-600" />
          后补备注与结论关联
        </h3>
        <p className="text-sm text-slate-500 italic">该点位暂无后补备注。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-3 flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-amber-600" />
        后补备注与结论关联
        <span className="ml-2 text-xs font-normal text-slate-500">
          （点击备注查看对结论的影响）
        </span>
      </h3>

      <div className="space-y-4">
        {remarks.map((r, i) => (
          <div
            key={r.id}
            className="remark-paper p-4 rounded cursor-pointer hover:scale-[1.01] transition-transform"
            onClick={onHighlightConclusion}
            style={{ animationDelay: `${140 + i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                  后补备注 #{i + 1}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-800">
                  <User className="w-3 h-3" /> {r.author}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-800">
                  <Clock className="w-3 h-3" /> {r.createdAt}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
            </div>

            <p className="text-sm text-amber-950 leading-relaxed mb-3">{r.content}</p>

            <div className="flex items-start gap-2 p-2.5 rounded bg-white border border-amber-300 border-dashed">
              <span className="shrink-0 text-amber-700 font-bold text-sm">→</span>
              <div>
                <p className="text-[11px] font-semibold text-amber-800 mb-0.5">对结论的影响</p>
                <p className="text-xs text-amber-900 leading-relaxed">{r.conclusionImpact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
