import { FileSearch, AlertOctagon, ArrowRightCircle } from "lucide-react";
import type { Issue } from "@/types";
import { ISSUE_TYPE_LABELS } from "@/types";

interface IssueTraceProps {
  issues: Issue[];
}

export default function IssueTrace({ issues }: IssueTraceProps) {
  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-medium text-[#1B2A4A] mb-2">错因追溯链</h3>
        <p className="text-xs text-zinc-400">未检测到问题</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">错因追溯链</h3>
      <div className="space-y-5">
        {issues.map((issue) => (
          <div key={issue.id} className="border-l-2 border-[#D4A843]/30 pl-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  issue.type === "part_misalignment"
                    ? "bg-[#C44E52]/10 text-[#C44E52]"
                    : issue.type === "unmarked_modulation"
                    ? "bg-[#D4A843]/10 text-[#D4A843]"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {ISSUE_TYPE_LABELS[issue.type]}
              </span>
              <span className="text-xs text-zinc-400">
                {issue.startTime.toFixed(1)}s — {issue.endTime.toFixed(1)}s
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#C44E52]/10 flex items-center justify-center">
                  <FileSearch className="w-3.5 h-3.5 text-[#C44E52]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700 mb-0.5">触发材料</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{issue.triggerMaterial}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
                  <AlertOctagon className="w-3.5 h-3.5 text-[#D4A843]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700 mb-0.5">卡点位置</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{issue.stuckAt}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                  <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700 mb-0.5">下一步建议</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{issue.nextStep}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
