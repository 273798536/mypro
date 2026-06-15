import { useStore } from "@/store/useStore";
import type { SettlementBatch } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import {
  ClipboardCheck,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Anchor,
  Ship,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";

const statusLabel: Record<SettlementBatch["status"], string> = {
  pending: "待复核",
  reviewing: "复核中",
  approved: "已通过",
  rejected: "已退回",
};

const batchStatusToResultStatus: Record<SettlementBatch["status"], "可用" | "暂缓" | "重新采集"> = {
  pending: "暂缓",
  reviewing: "暂缓",
  approved: "可用",
  rejected: "重新采集",
};

const statusCardConfig: Record<SettlementBatch["status"], { icon: typeof CheckCircle2; color: string; bg: string }> = {
  pending: { icon: ClipboardCheck, color: "text-amber", bg: "bg-amber/10" },
  reviewing: { icon: Eye, color: "text-ice", bg: "bg-ocean-800" },
  approved: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  rejected: { icon: XCircle, color: "text-coral", bg: "bg-coral/10" },
};

export default function Dashboard() {
  const batches = useStore((s) => s.batches);
  const results = useStore((s) => s.results);
  const selectedBatchId = useStore((s) => s.selectedBatchId);
  const setSelectedBatch = useStore((s) => s.setSelectedBatch);
  const corrections = useStore((s) => s.corrections);
  const photos = useStore((s) => s.photos);
  const waterQualityAlerts = useStore((s) => s.waterQualityAlerts);
  const trajectoryCalcs = useStore((s) => s.trajectoryCalcs);

  const statusCounts = batches.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<SettlementBatch["status"], number>,
  );

  const currentBatch = batches.find((b) => b.id === selectedBatchId);
  const filteredResults = results.filter((r) => r.batchId === selectedBatchId);
  const batchCorrections = corrections.filter((c) => c.batchId === selectedBatchId);
  const batchPhotos = photos.filter((p) => p.batchId === selectedBatchId);
  const batchWaterQuality = waterQualityAlerts.filter((w) => w.batchId === selectedBatchId);
  const batchTrajectory = trajectoryCalcs.filter((t) => t.batchId === selectedBatchId);

  const summaryCounts = filteredResults.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<"可用" | "暂缓" | "重新采集", number>,
  );

  const canSettleDirectly = (summaryCounts["暂缓"] || 0) === 0 && (summaryCounts["重新采集"] || 0) === 0;
  const criticalCount = batchWaterQuality.filter((w) => w.level === "critical").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ice flex items-center gap-2">
          <Anchor className="w-7 h-7" />
          结算总览
        </h1>
        <div className="text-xs text-slate-500">
          共 {batches.length} 个批次
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(statusLabel) as SettlementBatch["status"][]).map((status) => {
          const { icon: Icon, color, bg } = statusCardConfig[status];
          const count = statusCounts[status] || 0;
          return (
            <div key={status} className="card-dark rounded-lg p-4 flex items-center gap-3">
              <div className={`${bg} rounded-lg p-2.5`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-slate-400 text-sm">{statusLabel[status]}</div>
                <div className={`font-mono text-2xl font-bold ${color}`}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {currentBatch && (
        <div className={`card-dark rounded-xl border-2 ${
          canSettleDirectly ? "border-reef/30" : criticalCount > 0 ? "border-coral/30" : "border-amber/30"
        }`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                canSettleDirectly ? "bg-reef/15" : criticalCount > 0 ? "bg-coral/15" : "bg-amber/15"
              }`}>
                <Ship className={`w-7 h-7 ${
                  canSettleDirectly ? "text-reef" : criticalCount > 0 ? "text-coral" : "text-amber"
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-100">{currentBatch.vesselName}</h2>
                  <span className="text-xs bg-ocean-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {selectedBatchId}
                  </span>
                  <StatusBadge status={batchStatusToResultStatus[currentBatch.status]} />
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentBatch.portName}
                  </span>
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {currentBatch.createdAt}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-slate-500 mb-1">结算状态</div>
              <div className={`text-lg font-bold ${
                canSettleDirectly ? "text-reef-light" : "text-amber-light"
              }`}>
                {canSettleDirectly ? "可直接结算" : "需处理后结算"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-ocean-700/40">
            <div className="bg-ocean-950/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">轨迹计算</div>
              <div className="data-mono text-xl font-bold text-ice">{batchTrajectory.length}</div>
            </div>
            <div className="bg-ocean-950/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">水质预警</div>
              <div className={`data-mono text-xl font-bold ${
                criticalCount > 0 ? "text-coral-light" : "text-reef-light"
              }`}>
                {batchWaterQuality.length}
              </div>
            </div>
            <div className="bg-ocean-950/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">人工修正</div>
              <div className="data-mono text-xl font-bold text-amber-light">{batchCorrections.length}</div>
            </div>
            <div className="bg-ocean-950/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">巡检照片</div>
              <div className="data-mono text-xl font-bold text-reef-light">{batchPhotos.length}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card-dark rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-ocean-800 flex items-center justify-between">
          <h2 className="text-ice font-semibold">批次列表</h2>
          <span className="text-xs text-slate-500">点击"查看"切换当前处理批次</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-800 text-slate-500">
                <th className="text-left px-5 py-3 font-medium">批次名称</th>
                <th className="text-left px-5 py-3 font-medium">船名</th>
                <th className="text-left px-5 py-3 font-medium">港口</th>
                <th className="text-left px-5 py-3 font-medium">创建时间</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
                <th className="text-left px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className={`border-b border-ocean-800/50 hover:bg-ocean-800/40 transition-colors ${
                    batch.id === selectedBatchId ? "bg-ocean-800/60" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {batch.id === selectedBatchId && (
                        <span className="w-2 h-2 rounded-full bg-ice animate-pulse" />
                      )}
                      <span className="font-mono text-ice">{batch.batchName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-300">{batch.vesselName}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{batch.portName}</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{batch.createdAt}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={batchStatusToResultStatus[batch.status]} />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setSelectedBatch(batch.id)}
                      className={`flex items-center gap-1 transition-colors text-sm ${
                        batch.id === selectedBatchId
                          ? "text-ice font-medium"
                          : "text-reef hover:text-ice"
                      }`}
                    >
                      {batch.id === selectedBatchId ? "当前批次" : "查看"}
                      {batch.id !== selectedBatchId && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-dark rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ice font-semibold flex items-center gap-2">
            结果汇总
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <span className="text-slate-400 font-normal text-sm">
              {currentBatch?.vesselName} · {selectedBatchId}
            </span>
          </h2>
          <div className="text-xs text-slate-500">
            共 {filteredResults.length} 项结果
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-lg p-4 text-center ${
            canSettleDirectly ? "bg-reef/10 border-2 border-reef/30" : "bg-reef/5 border border-reef/20"
          }`}>
            <div className="text-slate-400 text-sm mb-1">可用</div>
            <div className="font-mono text-3xl font-bold text-reef-light">{summaryCounts["可用"] || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">可直接用于结算</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${
            (summaryCounts["暂缓"] || 0) > 0 ? "bg-amber/10 border-2 border-amber/30" : "bg-amber/5 border border-amber/20"
          }`}>
            <div className="text-slate-400 text-sm mb-1">暂缓</div>
            <div className="font-mono text-3xl font-bold text-amber">{summaryCounts["暂缓"] || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">需调度员复核确认</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${
            (summaryCounts["重新采集"] || 0) > 0 ? "bg-coral/10 border-2 border-coral/30" : "bg-coral/5 border border-coral/20"
          }`}>
            <div className="text-slate-400 text-sm mb-1">重新采集</div>
            <div className="font-mono text-3xl font-bold text-coral">{summaryCounts["重新采集"] || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">数据异常需重采</div>
          </div>
        </div>

        {!canSettleDirectly && (
          <div className="mt-4 bg-amber/10 border border-amber/30 rounded-lg px-4 py-3">
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              <div className="text-sm text-amber">
                本批次存在 <strong>{(summaryCounts["暂缓"] || 0) + (summaryCounts["重新采集"] || 0)}</strong> 项待处理结果，
                请调度员完成复核后再进行结算。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
