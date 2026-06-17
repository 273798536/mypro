import { useSchemeStore } from "@/store/useSchemeStore";
import { ANOMALY_STATUS_LABELS } from "@/types";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function Check() {
  const scheme = useSchemeStore((s) => s.getActiveScheme());
  const handleAnomaly = useSchemeStore((s) => s.handleAnomaly);
  const revertMerge = useSchemeStore((s) => s.revertMerge);

  if (!scheme) return null;

  const anomalies = scheme.anomalies;
  const pendingCount = anomalies.filter((a) => a.status === "pending").length;
  const confirmedCount = anomalies.filter((a) => a.status === "confirmed").length;
  const revertedCount = anomalies.filter((a) => a.status === "reverted").length;

  const handleConfirm = (anomalyId: string) => {
    handleAnomaly(scheme.id, anomalyId, "confirmed", "值班员");
  };

  const handleRevert = (anomalyId: string, mergeRecordId: string) => {
    handleAnomaly(scheme.id, anomalyId, "reverted", "值班员");
    revertMerge(scheme.id, mergeRecordId);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif-title text-2xl font-bold flex items-center gap-2">
          <ShieldAlert size={28} className="text-amber-600" />
          异常卡口
        </h1>
        <p className="text-sm text-gray-500 mt-1">相邻路口合错检测 · 需人工确认时给出原因和下一步建议</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">待确认</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
        </div>
        <div className="card bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">已确认</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{confirmedCount}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-600" />
            <span className="text-sm font-medium text-red-800">已拆分</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{revertedCount}</p>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
          <p className="text-lg font-medium text-gray-600">暂无异常，所有归并均通过检测</p>
          <p className="text-sm text-gray-400 mt-1">系统将持续监控相邻路口的归并操作</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => {
            const mergeRecord = scheme.mergeRecords.find((r) => r.id === anomaly.mergeRecordId);
            return (
              <div key={anomaly.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className={`badge-${anomaly.status}`}>
                      {ANOMALY_STATUS_LABELS[anomaly.status]}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-800 leading-relaxed">{anomaly.description}</p>

                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">💡</span>
                    <p className="text-sm text-amber-900 leading-relaxed">{anomaly.suggestion}</p>
                  </div>
                </div>

                {mergeRecord && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                    <p>
                      <span className="font-medium">归并记录：</span>
                      {mergeRecord.evidenceSnapshot.originalA} + {mergeRecord.evidenceSnapshot.originalB}
                    </p>
                    <p>
                      <span className="font-medium">归并原因：</span>{mergeRecord.reason}
                    </p>
                    <p>
                      <span className="font-medium">操作人：</span>{mergeRecord.operator}
                      <span className="ml-3">
                        <span className="font-medium">时间：</span>
                        {new Date(mergeRecord.timestamp).toLocaleString("zh-CN")}
                      </span>
                    </p>
                  </div>
                )}

                {anomaly.status === "pending" ? (
                  <div className="flex gap-3 pt-1">
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-sm"
                      onClick={() => handleConfirm(anomaly.id)}
                    >
                      确认归并
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 bg-red-600 hover:bg-red-700 hover:shadow-md text-sm"
                      onClick={() => handleRevert(anomaly.id, anomaly.mergeRecordId)}
                    >
                      拆分回退
                    </button>
                  </div>
                ) : (
                  anomaly.handledBy &&
                  anomaly.handledAt && (
                    <div className="text-xs text-gray-400 flex items-center gap-1 pt-1">
                      {anomaly.status === "confirmed" ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                      <span>
                        由 {anomaly.handledBy} 于 {new Date(anomaly.handledAt).toLocaleString("zh-CN")} 处理
                      </span>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
