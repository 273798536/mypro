import { AlertTriangle, CheckCircle2, FileAudio, Music, MessageSquare } from "lucide-react";
import type { Case } from "@/types";
import { ISSUE_TYPE_LABELS } from "@/types";

interface CaseCardProps {
  caseItem: Case;
  onClick: () => void;
}

export default function CaseCard({ caseItem, onClick }: CaseCardProps) {
  const typeSet = [...new Set(caseItem.issues.map((i) => i.type))];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-md hover:border-[#D4A843]/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h4 className="text-sm font-medium text-[#1B2A4A] group-hover:text-[#D4A843] transition-colors leading-snug">
          {caseItem.title}
        </h4>
        {caseItem.status === "resolved" ? (
          <span className="shrink-0 flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> 已解决
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-xs text-[#C44E52] bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> 待处理
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {typeSet.map((t) => (
          <span
            key={t}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              t === "part_misalignment"
                ? "bg-[#C44E52]/10 text-[#C44E52]"
                : t === "unmarked_modulation"
                ? "bg-[#D4A843]/10 text-[#D4A843]"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {ISSUE_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
        {caseItem.linkedRecordings.length > 0 && (
          <span className="flex items-center gap-1">
            <FileAudio className="w-3 h-3" />
            {caseItem.linkedRecordings.length} 份录音
          </span>
        )}
        {caseItem.linkedMeasures.length > 0 && (
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            {caseItem.linkedMeasures.join("、")}
          </span>
        )}
        {caseItem.annotations.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {caseItem.annotations.length} 条批注
          </span>
        )}
      </div>
    </button>
  );
}
