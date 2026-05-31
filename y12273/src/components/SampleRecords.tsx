import { useFieldStore } from "@/store/fieldStore";
import type { SampleRecordStatus } from "@/types";
import { AlertTriangle, CheckCircle, Clock, Edit3, ArrowLeftRight, FileQuestion } from "lucide-react";

const statusConfig: Record<SampleRecordStatus, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  normal: { label: "正常", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: <CheckCircle size={10} /> },
  missing_field: { label: "缺字段", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", icon: <FileQuestion size={10} /> },
  late_supplement: { label: "晚补", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", icon: <Clock size={10} /> },
  modified_note: { label: "备注改过", color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/30", icon: <Edit3 size={10} /> },
  reversed_arrow: { label: "方向箭头反", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: <ArrowLeftRight size={10} /> },
};

const filters: { value: "all" | SampleRecordStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "normal", label: "正常" },
  { value: "missing_field", label: "缺字段" },
  { value: "reversed_arrow", label: "方向箭头反" },
];

export default function SampleRecords() {
  const records = useFieldStore((s) => s.sampleRecords);
  const filter = useFieldStore((s) => s.recordFilter);
  const setFilter = useFieldStore((s) => s.setRecordFilter);

  const filtered = filter === "all" ? records : records.filter((r) => r.status === filter);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">样例记录</h3>

      <div className="flex gap-1 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2 py-0.5 text-[9px] rounded-full transition-all duration-200 border ${
              filter === f.value
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-white/40 border-white/10 hover:text-white/60 hover:border-white/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
        {filtered.map((rec) => {
          const config = statusConfig[rec.status];
          return (
            <div
              key={rec.id}
              className={`p-2 rounded-lg border ${config.bg} space-y-1`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1 text-[10px] ${config.color}`}>
                  {config.icon}
                  <span className="font-medium">{config.label}</span>
                </div>
                <span className="text-[8px] text-white/25 font-mono">{rec.id}</span>
              </div>

              {rec.note && (
                <div className="text-[10px] text-white/60 leading-relaxed">{rec.note}</div>
              )}

              {rec.status === "modified_note" && rec.noteHistory && rec.noteHistory.length > 1 && (
                <div className="space-y-0.5 pl-2 border-l border-white/10">
                  {rec.noteHistory.map((h, i) => (
                    <div key={i} className="text-[8px] text-white/30">
                      {i === rec.noteHistory!.length - 1 ? "→ " : "  "}{h}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 text-[8px] text-white/30">
                {rec.position && <span>pos: ({rec.position.join(", ")})</span>}
                {rec.charge !== undefined && <span>q: {rec.charge}</span>}
                {!rec.position && <span className="text-amber-400/60 flex items-center gap-0.5"><AlertTriangle size={7} />缺位置</span>}
              </div>

              {rec.status === "reversed_arrow" && (
                <div className="text-[9px] text-red-400/80 bg-red-500/10 rounded px-1.5 py-0.5 mt-0.5">
                  ⚡ 方向箭头反转 — 物理老师可确认此分支生效
                </div>
              )}

              <div className="text-[8px] text-white/20">
                {new Date(rec.createdAt).toLocaleString("zh-CN")}
                {rec.updatedAt && (
                  <span className="text-purple-400/50 ml-1">
                    (更新: {new Date(rec.updatedAt).toLocaleString("zh-CN")})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
