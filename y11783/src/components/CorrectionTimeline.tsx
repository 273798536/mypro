import { useState } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { usePartitionStore } from "@/store";
import { cn } from "@/lib/utils";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${formatTime(ts)}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (Array.isArray(v)) return v.length === 0 ? "[]" : v.join(", ");
  return String(v);
}

function fieldNameLabel(field: string): string {
  const map: Record<string, string> = {
    "config.targetNumber": "目标数",
    "config.mode": "拆分模式",
    "config.minAddend": "最小加数",
    "config.maxAddend": "最大加数",
    "config.minCount": "最少份数",
    "config.maxCount": "最多份数",
    "config.allowDuplicate": "允许重复",
    "config.customPredicates": "自定义谓词",
    config: "配置",
  };
  return map[field] ?? field;
}

const EMPTY_CORRECTIONS: import("@/types").CorrectionRecord[] = [];

export default function CorrectionTimeline() {
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const corrections = usePartitionStore(
    (s) => s.currentSession?.corrections ?? EMPTY_CORRECTIONS
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "mx-auto flex items-center gap-2 rounded-t-lg px-5 py-2 text-sm font-medium",
          "bg-slate-800 text-chalk-yellow border border-b-0 border-slate-600",
          "hover:bg-slate-700 transition-colors",
          expanded ? "w-full justify-between rounded-none px-6 py-3" : ""
        )}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          修正记录
          {corrections.length > 0 && (
            <span className="ml-1 rounded-full bg-chalk-yellow/20 px-2 py-0.5 text-xs text-chalk-yellow">
              {corrections.length}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="max-h-80 overflow-y-auto bg-slate-900/95 border-t border-slate-600 px-6 py-4 backdrop-blur-sm">
          {corrections.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              暂无修正记录
            </div>
          ) : (
            <div className="relative ml-3">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-600" />

              <div className="flex flex-col gap-0">
                {corrections.map((c, i) => {
                  const isLast = i === corrections.length - 1;
                  const isActive = activeId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="relative flex items-start gap-4 pb-4"
                      onClick={() =>
                        setActiveId(isActive ? null : c.id)
                      }
                    >
                      <div
                        className={cn(
                          "relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                          isLast
                            ? "border-mint-green bg-mint-green shadow-[0_0_8px_rgba(110,231,183,0.5)]"
                            : "border-chalk-yellow bg-chalk-yellow shadow-[0_0_6px_rgba(250,204,21,0.4)]"
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{formatDate(c.timestamp)}</span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span
                            className={cn(
                              "font-medium",
                              isLast ? "text-mint-green" : "text-chalk-yellow"
                            )}
                          >
                            {fieldNameLabel(c.field)}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-300 line-through decoration-slate-500">
                            {formatValue(c.oldValue)}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span
                            className={cn(
                              "font-medium",
                              isLast ? "text-mint-green" : "text-chalk-yellow"
                            )}
                          >
                            {formatValue(c.newValue)}
                          </span>
                        </div>

                        {isActive && (
                          <div className="mt-2 rounded-md bg-slate-800 border border-slate-600 p-3 text-xs text-slate-300">
                            <div className="mb-1 font-medium text-slate-200">
                              修正详情
                            </div>
                            <div className="flex flex-col gap-1">
                              <span>
                                字段：
                                <span className="text-chalk-yellow">
                                  {fieldNameLabel(c.field)}
                                </span>
                              </span>
                              <span>
                                原值：
                                <span className="text-slate-400">
                                  {formatValue(c.oldValue)}
                                </span>
                              </span>
                              <span>
                                新值：
                                <span className="text-mint-green">
                                  {formatValue(c.newValue)}
                                </span>
                              </span>
                              <span>
                                原因：
                                <span className="text-slate-200">
                                  {c.reason}
                                </span>
                              </span>
                              <span>
                                时间：
                                <span className="text-slate-400">
                                  {formatDate(c.timestamp)}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
