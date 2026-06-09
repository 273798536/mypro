import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { AnomalyNote } from "@/types";

const typeLabels: Record<AnomalyNote["type"], { label: string; color: string }> = {
  duplicate: { label: "批号重复", color: "bg-red-100 text-red-700 border-red-200" },
  missing_time: { label: "反应时间漏记", color: "bg-amber-100 text-amber-700 border-amber-200" },
  irregular_band: { label: "条带异常", color: "bg-orange-100 text-orange-700 border-orange-200" },
  bad_data: { label: "数据无效", color: "bg-red-100 text-red-700 border-red-200" },
};

interface AnomalyCardProps {
  note: AnomalyNote;
  index?: number;
}

export default function AnomalyCard({ note, index = 0 }: AnomalyCardProps) {
  const [copied, setCopied] = useState(false);
  const tl = typeLabels[note.type];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="border rounded bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-4 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle width={18} height={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded ${tl.color}`}>
              {tl.label}
            </span>
            <p className="mt-1 text-sm font-medium text-lab-ink">{note.message}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="no-print inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-100 transition-colors"
        >
          {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
          {copied ? "已复制" : "一键复制"}
        </button>
      </div>
      <div className="pl-6 border-l-2 border-amber-300">
        <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">{note.explanation}</p>
      </div>
    </div>
  );
}
