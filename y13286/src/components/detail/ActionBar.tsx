import { CheckCircle2, Clock, ArrowLeft, Download, FilePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReviewStore } from "@/store/reviewStore";
import type { PointStatus } from "@/types";
import { STATUS_LABEL } from "@/types";

interface Props {
  pointId: string;
  currentStatus: PointStatus;
}

export default function ActionBar({ pointId, currentStatus }: Props) {
  const nav = useNavigate();
  const updateStatus = useReviewStore((s) => s.updatePointStatus);

  const actions: { status: Exclude<PointStatus, "conflict">; icon: typeof CheckCircle2; style: string }[] = [
    { status: "processed", icon: CheckCircle2, style: "bg-moss-600 hover:bg-moss-700 text-white" },
    { status: "pending_site", icon: Clock, style: "bg-amber-600 hover:bg-amber-700 text-white" },
  ];

  return (
    <div className="sticky bottom-4 z-20">
      <div className="bg-white border border-ink-200 rounded-lg shadow-lg p-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => nav(-1)}
          className="btn bg-ink-50 text-ink-700 border border-ink-200 hover:bg-ink-100"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        <div className="ml-2 h-6 w-px bg-ink-200" />

        <span className="text-xs text-slate-500 mr-1">标记状态：</span>
        {actions.map((a) => {
          const Icon = a.icon;
          const active = currentStatus === a.status;
          return (
            <button
              key={a.status}
              onClick={() => updateStatus(pointId, a.status)}
              className={`btn ${active ? a.style : "bg-white border border-ink-200 text-ink-700 hover:bg-ink-50"}`}
            >
              <Icon className="w-4 h-4" />
              {STATUS_LABEL[a.status]}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50">
            <FilePlus className="w-4 h-4" /> 添加新版意见
          </button>
          <button className="btn bg-ink-700 text-white hover:bg-ink-800">
            <Download className="w-4 h-4" /> 导出复核单
          </button>
        </div>
      </div>
    </div>
  );
}
