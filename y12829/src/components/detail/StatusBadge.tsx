import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PrimerSample, SampleStatus } from "@/types";
import { statusLabel, statusBgClass, statusTextClass } from "@/utils/boundaryCheck";

interface StatusBadgeProps {
  sample: PrimerSample;
}

const statusIconMap = {
  [SampleStatus.NORMAL]: CheckCircle2,
  [SampleStatus.BORDERLINE]: AlertTriangle,
  [SampleStatus.ABNORMAL]: XCircle,
};

const statusRingMap = {
  [SampleStatus.NORMAL]: "ring-lab-teal/30",
  [SampleStatus.BORDERLINE]: "ring-lab-amber/30",
  [SampleStatus.ABNORMAL]: "ring-lab-danger/30",
};

export default function StatusBadge({ sample }: StatusBadgeProps) {
  const navigate = useNavigate();
  const StatusIcon = statusIconMap[sample.status];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-8 shadow-card ring-4 transition-all",
        statusBgClass(sample.status),
        statusRingMap[sample.status]
      )}
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/40 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-inner",
                statusTextClass(sample.status)
              )}
            >
              <StatusIcon className="h-9 w-9" strokeWidth={2.2} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-primary-900">
                  样本 ID：{sample.id}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
                    statusBgClass(sample.status),
                    statusTextClass(sample.status)
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusLabel(sample.status)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-primary-600">
                <span>
                  <span className="font-medium text-primary-700">名称：</span>
                  {sample.name}
                </span>
                <span>
                  <span className="font-medium text-primary-700">批次：</span>
                  {sample.batch}
                </span>
                <span>
                  <span className="font-medium text-primary-700">采集：</span>
                  {sample.collectionDate}
                </span>
                <span>
                  <span className="font-medium text-primary-700">位置：</span>
                  {sample.location}
                </span>
                <span>
                  <span className="font-medium text-primary-700">操作人：</span>
                  {sample.operator}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/report/${sample.id}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg active:translate-y-0"
            >
              <FileText className="h-4 w-4" />
              查看报告
            </button>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:shadow-md active:translate-y-0"
            >
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/70 p-5 backdrop-blur">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary-500">
            系统自动判定理由
          </div>
          <p className="text-base leading-relaxed text-primary-800">
            {sample.autoDetectReason}
          </p>
        </div>
      </div>
    </div>
  );
}
