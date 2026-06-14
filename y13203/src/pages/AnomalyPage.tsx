import { useStore } from "@/store";
import AnomalyList from "@/components/AnomalyList";
import BoundaryAnalysis from "@/components/BoundaryAnalysis";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import AuthorizationNoteInput from "@/components/AuthorizationNoteInput";
import { Activity } from "lucide-react";

export default function AnomalyPage() {
  const { anomalies } = useStore();
  const pending = anomalies.filter((a) => a.status === "pending").length;
  const confirmed = anomalies.filter((a) => a.status === "confirmed").length;
  const overridden = anomalies.filter((a) => a.status === "overridden").length;
  const boundary = anomalies.filter((a) => a.isBoundary).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Activity className="w-5 h-5 text-amber" />
        <h2 className="font-mono text-lg font-semibold text-zinc-100">异常提醒与分析</h2>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface-800 rounded-lg border border-surface-600 px-4 py-3">
          <p className="text-xs text-zinc-500">待处理</p>
          <p className="text-2xl font-mono font-semibold text-amber">{pending}</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-600 px-4 py-3">
          <p className="text-xs text-zinc-500">已确认</p>
          <p className="text-2xl font-mono font-semibold text-emerald">{confirmed}</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-600 px-4 py-3">
          <p className="text-xs text-zinc-500">已覆盖</p>
          <p className="text-2xl font-mono font-semibold text-zinc-400">{overridden}</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-amber/20 px-4 py-3">
          <p className="text-xs text-zinc-500">边界样本</p>
          <p className="text-2xl font-mono font-semibold text-amber">{boundary}</p>
        </div>
      </div>

      <AnomalyList />
      <BoundaryAnalysis />
      <AnnotationOverlay />
      <AuthorizationNoteInput />
    </div>
  );
}
