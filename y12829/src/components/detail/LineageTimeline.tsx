import {
  GitBranch,
  User,
  Clock,
  ArrowRight,
  FileInput,
  Sparkles,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineageNode, SampleStatus } from "@/types";
import { formatDate, statusBgClass, statusLabel, statusTextClass } from "@/utils/boundaryCheck";

interface LineageTimelineProps {
  lineage: LineageNode[];
}

function stageIconOf(stage: string) {
  const s = stage.toLowerCase();
  if (s.includes("采样") || s.includes("登记")) return FileInput;
  if (s.includes("自动") || s.includes("初检") || s.includes("引擎")) return Sparkles;
  if (s.includes("复核") || s.includes("确认") || s.includes("调整")) return ClipboardCheck;
  if (s.includes("重测") || s.includes("重采样") || s.includes("废弃")) return AlertTriangle;
  return GitBranch;
}

const stageIconBgMap = [
  "bg-indigo-100 text-indigo-600",
  "bg-primary-100 text-primary-700",
  "bg-lab-teal/15 text-lab-teal",
  "bg-lab-amber/15 text-lab-amber",
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
];

function StatusPill({ status }: { status: SampleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold",
        statusBgClass(status),
        statusTextClass(status)
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function LineageTimeline({ lineage }: LineageTimelineProps) {
  const sorted = [...lineage].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-primary-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-primary-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary-700" />
          <h3 className="text-lg font-bold text-primary-900">谱系追踪时间轴</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
          <Clock className="h-3.5 w-3.5" />
          共 {sorted.length} 个节点
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {sorted.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 text-center">
            <GitBranch className="h-10 w-10 text-primary-300" />
            <p className="text-sm font-medium text-primary-500">暂无谱系记录</p>
          </div>
        ) : (
          <ol className="relative space-y-5">
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-200 via-primary-300 to-primary-200" />

            {sorted.map((node, idx) => {
              const isLatest = idx === sorted.length - 1;
              const Icon = stageIconOf(node.stage);
              const iconBg = stageIconBgMap[idx % stageIconBgMap.length];
              const statusChanged =
                node.statusBefore !== null && node.statusBefore !== node.statusAfter;

              return (
                <li
                  key={node.id}
                  className={cn(
                    "relative animate-fade-in-up",
                    isLatest && "z-10"
                  )}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-xl ring-4 transition",
                      iconBg,
                      isLatest ? "ring-primary-100 shadow-lg scale-110" : "ring-white shadow"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>

                  <div
                    className={cn(
                      "ml-14 rounded-xl border p-4 transition",
                      isLatest
                        ? "border-primary-300 bg-gradient-to-br from-primary-50/80 to-white shadow-md ring-2 ring-primary-200/60"
                        : "border-primary-100 bg-white shadow-sm hover:border-primary-200 hover:shadow-md"
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="text-sm font-bold text-primary-900">
                        {node.stage}
                        {isLatest && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-800 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Sparkles className="h-3 w-3" />
                            最新
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-primary-500">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-primary-700">{node.operator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-primary-400 ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatDate(node.timestamp)}
                      </div>
                    </div>

                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      {node.statusBefore !== null ? (
                        <StatusPill status={node.statusBefore} />
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-dashed border-primary-300 bg-white px-2 py-0.5 text-[11px] font-bold text-primary-400">
                          初始状态
                        </span>
                      )}
                      <ArrowRight
                        className={cn(
                          "h-4 w-4",
                          statusChanged ? "text-lab-amber animate-pulse-soft" : "text-primary-300"
                        )}
                      />
                      <StatusPill status={node.statusAfter} />
                      {statusChanged && (
                        <span className="rounded-md bg-lab-amber/15 px-2 py-0.5 text-[10px] font-bold text-lab-amber">
                          状态变更
                        </span>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-primary-700">{node.note}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
