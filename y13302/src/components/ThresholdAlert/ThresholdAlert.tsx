import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  affectedCount?: number;
  compact?: boolean;
}

const steps = [
  {
    title: "优先处理高权重样本",
    desc: "进入改判工作台，先筛选近7天 impact_weight ≥ 1.2 的记录完成复核，这部分约占总结论偏差的 60%。",
  },
  {
    title: "对比调整前后阈值区间",
    desc: "参考工单附带的阈值版本说明（如风控 v3.1.4→v3.2.1），核对落入新旧阈值交界区的 2~3 条典型样本。",
  },
  {
    title: "确认完成后导出差异清单",
    desc: "在历史追溯页点击「导出复盘材料」，拿到的 JSON 可直接用于社区公示前的算法值班人追问。",
  },
];

export default function ThresholdAlert({ affectedCount, compact }: Props) {
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div
      className={cn(
        "card border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/70 to-transparent animate-fade-in-up overflow-hidden",
        compact && "stagger-2"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle
              className="w-6 h-6 text-amber-600 animate-pulse-soft"
              strokeWidth={1.75}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-semibold text-navy-800 text-base leading-tight">
                  检测到阈值漂移 · 旧结论需人工复核
                </h3>
                <p className="mt-1 text-sm text-navy-600">
                  6月16日 23:00 摘要分类阈值从 v2.3 调整至 v2.4，{" "}
                  {affectedCount !== undefined ? (
                    <span className="font-semibold text-amber-700">
                      当前仍有 {affectedCount} 条
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      多条
                    </span>
                  )}{" "}
                  受影响的待处理记录，改判时请注意边界样本。
                </p>
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="shrink-0 w-8 h-8 rounded-lg hover:bg-white/80 flex items-center justify-center text-amber-700 transition"
                aria-label={expanded ? "收起" : "展开"}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <ChevronDown className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </div>

            {expanded && (
              <div className="mt-4 space-y-2.5 animate-slide-in">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  人可照着执行的 3 步处理指引
                </p>
                <ol className="space-y-2">
                  {steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-3 bg-white/60 backdrop-blur rounded-lg p-3 border border-amber-100/80"
                    >
                      <div className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-800">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-xs text-navy-600 leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />
    </div>
  );
}
