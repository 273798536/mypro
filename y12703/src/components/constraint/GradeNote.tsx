import type { SequenceProblem } from "@/types";
import GradeBadge from "@/components/common/GradeBadge";
import { CheckCircle, Clock, RefreshCcw, AlertTriangle, FileText } from "lucide-react";
import { formatDate } from "@/utils/format";

interface Props {
  problem: SequenceProblem;
  onCorrect: () => void;
  onMarkSuspended: () => void;
  onMarkRecollect: () => void;
  onApprove: () => void;
}

export default function GradeNote({
  problem,
  onCorrect,
  onMarkSuspended,
  onMarkRecollect,
  onApprove,
}: Props) {
  const gradeSections = {
    available: {
      icon: CheckCircle,
      title: "数据可用",
      color: "text-confirm",
      bg: "bg-confirm-soft",
      desc: "历史答案与计算值一致，可直接用于教学。",
    },
    pending: {
      icon: Clock,
      title: "数据暂缓",
      color: "text-warn",
      bg: "bg-warn-soft",
      desc: "部分项存在偏差或越界，需人工复核后确定是否可用。",
    },
    recollect: {
      icon: RefreshCcw,
      title: "需重新采集",
      color: "text-alert",
      bg: "bg-alert-soft",
      desc: "数据严重偏离预期或存在明显录入错误，需返回数据源重新采集。",
    },
  };
  const section = gradeSections[problem.dataGrade];
  const Icon = section.icon;

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-semibold text-ink-800">结果说明</h4>
        <GradeBadge grade={problem.dataGrade} />
      </div>
      <div className={`rounded-lg p-3 ${section.bg} border border-black/5`}>
        <div className={`flex items-start gap-2 ${section.color}`}>
          <Icon size={16} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <div className="font-semibold mb-1">{section.title}</div>
            <div className="text-ink-600">{section.desc}</div>
          </div>
        </div>
      </div>
      {problem.isExtrapolationOutlier && (
        <div className="rounded-lg p-3 bg-alert-soft border border-alert/10">
          <div className="flex items-start gap-2 text-alert">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-semibold mb-0.5">外推越界警告</div>
              <div className="text-ink-600">
                第 {problem.outlierIndices.map((i) => `a${i + 1}`).join("、")} 项偏离 3σ
                区间，疑似录入错误或算法溢出。
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg p-3 bg-ink-50 border border-ink-100">
        <div className="flex items-start gap-2 text-ink-600">
          <FileText size={14} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed flex-1">
            <div className="font-semibold text-ink-700 mb-0.5">备注</div>
            <div className="text-ink-600">{problem.note || "（暂无备注）"}</div>
            <div className="mt-1 text-ink-400">
              更新于 {formatDate(problem.updatedAt)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button
          onClick={onCorrect}
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-ink-700 text-ivory hover:bg-ink-800 transition"
        >
          人工修正
        </button>
        {problem.status !== "approved" && (
          <button
            onClick={onApprove}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-confirm text-white hover:opacity-90 transition"
          >
            标记通过
          </button>
        )}
        <button
          onClick={onMarkSuspended}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-warn text-white hover:opacity-90 transition"
        >
          暂缓
        </button>
        <button
          onClick={onMarkRecollect}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-alert text-white hover:opacity-90 transition"
        >
          重采
        </button>
      </div>
    </div>
  );
}
