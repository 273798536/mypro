import { useNavigate } from "react-router-dom";
import { useBuoyStore } from "@/store/useBuoyStore";
import { useWarningStore } from "@/store/useWarningStore";
import StatusCard from "@/components/StatusCard";
import QualityBadge from "@/components/QualityBadge";
import ReviewBadge from "@/components/ReviewBadge";
import DisplayTag from "@/components/DisplayTag";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { formatTimestamp } from "@/utils/correctionLogger";
import { useMemo } from "react";
import { calculateAllWarnings } from "@/utils/formulaEngine";

export default function Dashboard() {
  const navigate = useNavigate();
  const records = useBuoyStore((s) => s.records);
  const selectedBuoyId = useWarningStore((s) => s.selectedBuoyId);
  const thresholds = useWarningStore((s) => s.thresholds);

  const stats = useMemo(() => {
    let available = 0;
    let pending = 0;
    let recollect = 0;
    for (const r of records) {
      if (r.quality === "available" && r.reviewStatus === "approved") {
        available++;
      } else if (r.quality === "recollect") {
        recollect++;
      } else {
        pending++;
      }
    }
    return { available, pending, recollect };
  }, [records]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedBuoyId),
    [records, selectedBuoyId]
  );

  const warnings = useMemo(() => {
    if (!selectedRecord) return [];
    return calculateAllWarnings(selectedRecord, thresholds);
  }, [selectedRecord, thresholds]);

  const triggeredCount = useMemo(
    () => warnings.filter((w) => w.isTriggered).length,
    [warnings]
  );

  const total = useMemo(
    () => stats.available + stats.pending + stats.recollect,
    [stats]
  );

  const recentRecords = useMemo(
    () =>
      [...records]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6),
    [records]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          label="数据可用"
          value={stats.available}
          total={total}
          color="available"
          icon={<CheckCircle size={22} />}
          description="质量合格且已审核通过"
        />
        <StatusCard
          label="数据暂缓"
          value={stats.pending}
          total={total}
          color="pending"
          icon={<Clock size={22} />}
          description="含空值或备注混写，需人工修正"
        />
        <StatusCard
          label="建议重采"
          value={stats.recollect}
          total={total}
          color="recollect"
          icon={<AlertCircle size={22} />}
          description="重复数据或超过半数字段为空"
        />
        <StatusCard
          label="预警触发"
          value={triggeredCount}
          total={warnings.length}
          color="info"
          icon={<AlertTriangle size={22} />}
          description="当前水质预警指标异常数"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-ocean-50">
                最近浮标数据
              </h3>
              <p className="text-xs text-ocean-400/70 mt-0.5">
                点击行内操作按钮进入数据修正
              </p>
            </div>
            <button
              onClick={() => navigate("/buoy")}
              className="flex items-center gap-1 text-sm text-ocean-400 hover:text-ocean-50 transition-colors"
            >
              查看全部 <ChevronRight size={16} />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ocean-600/30">
                  <th className="table-header">浮标</th>
                  <th className="table-header">时间</th>
                  <th className="table-header">塑料浓度</th>
                  <th className="table-header">质量</th>
                  <th className="table-header">审核</th>
                  <th className="table-header">使用</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-ocean-700/20 hover:bg-ocean-700/20 transition-colors animate-float-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <td className="table-cell">
                      <div className="font-mono text-sm text-ocean-200">{r.buoyId}</div>
                      <div className="text-xs text-ocean-400/60">{r.location}</div>
                    </td>
                    <td className="table-cell text-ocean-300/80 text-xs">
                      {formatTimestamp(r.timestamp).slice(5)}
                    </td>
                    <td className="table-cell font-mono">
                      {r.plasticConcentration === null ? (
                        <span className="text-ocean-400/50 italic">—</span>
                      ) : (
                        <>
                          <span className="text-ocean-50">{r.plasticConcentration}</span>
                          <span className="text-ocean-400/60 text-xs ml-1">个/m³</span>
                        </>
                      )}
                    </td>
                    <td className="table-cell">
                      <QualityBadge quality={r.quality} />
                    </td>
                    <td className="table-cell">
                      <ReviewBadge status={r.reviewStatus} />
                    </td>
                    <td className="table-cell">
                      <DisplayTag record={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-ocean-50">
              课题组使用指引
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-quality-available/10 border border-quality-available/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-quality-available" />
                <span className="text-sm font-semibold text-quality-available">
                  直接可用（绿）
                </span>
              </div>
              <p className="text-xs text-ocean-200/80 leading-relaxed">
                数据质量为「可用」且审核状态为「已通过」，可直接用于报告与论文。
              </p>
            </div>

            <div className="p-4 rounded-lg bg-quality-pending/10 border border-quality-pending/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-quality-pending" />
                <span className="text-sm font-semibold text-quality-pending">
                  需复核（黄）
                </span>
              </div>
              <p className="text-xs text-ocean-200/80 leading-relaxed">
                数据存在空值、备注混写或仍在「待确认」状态，请联系科研助理确认后使用。
              </p>
            </div>

            <div className="p-4 rounded-lg bg-quality-recollect/10 border border-quality-recollect/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-quality-recollect" />
                <span className="text-sm font-semibold text-quality-recollect">
                  建议重采（红）
                </span>
              </div>
              <p className="text-xs text-ocean-200/80 leading-relaxed">
                数据重复或超过半数字段缺失，不建议使用，等待重新采集。
              </p>
            </div>

            <button
              onClick={() => navigate("/warning")}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
            >
              <TrendingUp size={16} />
              查看水质预警详情
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
