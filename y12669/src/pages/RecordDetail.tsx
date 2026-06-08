import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Edit3,
  History,
  ArrowLeft,
  FileText,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Gauge,
  Layers,
  PlusCircle,
} from "lucide-react";
import { useRecordsStore } from "../store/useRecordsStore";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import AnomalyBadge from "../components/AnomalyBadge";
import RopeAngleCanvas from "../components/RopeAngleCanvas";
import CrossSectionCanvas from "../components/CrossSectionCanvas";
import AnomalyPanel from "../components/AnomalyPanel";
import { SAFETY_THRESHOLDS } from "../../shared/constants";
import type { AnomalyType } from "../../shared/types";
import { cn } from "@/lib/utils";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse",
        className
      )}
    />
  );
}

function Skeleton({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-100 rounded animate-pulse"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function InfoItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm font-medium text-slate-800 break-all">
          {children}
        </div>
      </div>
    </div>
  );
}

function ThresholdItem({
  icon: Icon,
  title,
  value,
  unit,
  min,
  max,
  isSafe,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  isSafe: boolean;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isSafe
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : "bg-orange-50 text-orange-600 border border-orange-100"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            {isSafe ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                达标
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" />
                不达标
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2">
        <span
          className={cn(
            "text-2xl font-bold",
            isSafe ? "text-emerald-600" : "text-orange-600"
          )}
        >
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-slate-500 ml-1">{unit}</span>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-1.5">安全阈值范围</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-700">
            {min} ~ {max} {unit}
          </span>
          <span className="text-xs text-slate-400">
            {isSafe ? "数值在合理区间内" : "数值超出安全阈值"}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed pt-3 border-t border-slate-200">
        {description}
      </p>
    </div>
  );
}

function SupplementDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">
              操作成功
            </div>
            <div className="text-sm text-slate-500">剖面参数补录</div>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-700 leading-relaxed">
            剖面参数补录完成，时间回放已同步更新。
          </p>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-lg shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRecord, loading, fetchRecord } = useRecordsStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecord(id);
    }
  }, [id, fetchRecord]);

  const handleSupplement = () => {
    setDialogOpen(true);
  };

  if (loading || !selectedRecord) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <SkeletonCard className="h-24 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <SkeletonCard className="h-80" />
              <SkeletonCard className="h-96" />
              <SkeletonCard className="h-96" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <SkeletonCard className="h-96" />
              <SkeletonCard className="h-64" />
              <SkeletonCard className="h-[520px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const record = selectedRecord;
  const isAngleSafe =
    record.ropeAngle >= SAFETY_THRESHOLDS.ANGLE_MIN &&
    record.ropeAngle <= SAFETY_THRESHOLDS.ANGLE_MAX;
  const isTensionSafe =
    record.ropeTension >= SAFETY_THRESHOLDS.TENSION_MIN &&
    record.ropeTension <= SAFETY_THRESHOLDS.TENSION_MAX;
  const isLengthSafe = record.ropeLength >= 5 && record.ropeLength <= 200;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <PageHeader
          title={record.recordNumber}
          description={
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <button
                onClick={() => navigate("/records")}
                className="hover:text-primary-600 transition-colors cursor-pointer"
              >
                记录列表
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-700">详情</span>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/records/${id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg shadow-md shadow-orange-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              >
                <Edit3 className="w-4 h-4" />
                修正记录
              </button>
              <button
                onClick={() => navigate(`/records/${id}/history`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-lg shadow-sm border border-slate-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                <History className="w-4 h-4" />
                查看历史
              </button>
              <button
                onClick={() => navigate("/records")}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-lg shadow-sm border border-slate-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回列表
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-primary-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  基础信息
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={FileText} label="记录编号">
                  {record.recordNumber}
                </InfoItem>
                <InfoItem icon={Clock} label="时间参数">
                  {record.timeParameter}
                </InfoItem>
                <InfoItem icon={Calendar} label="创建时间">
                  {formatDateTime(record.createdAt)}
                </InfoItem>
                <InfoItem icon={Calendar} label="更新时间">
                  {formatDateTime(record.updatedAt)}
                </InfoItem>
                <InfoItem icon={User} label="操作人">
                  {record.operator}
                </InfoItem>
                <InfoItem icon={AlertTriangle} label="状态">
                  <StatusBadge status={record.status} />
                </InfoItem>
                {record.anomalyType && (
                  <div className="sm:col-span-2">
                    <InfoItem icon={AlertTriangle} label="异常类型">
                      <AnomalyBadge anomalyType={record.anomalyType} />
                    </InfoItem>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  绳索角度模拟
                </h3>
              </div>
              <div className="p-6">
                <RopeAngleCanvas
                  angle={record.ropeAngle}
                  length={record.ropeLength}
                  tension={record.ropeTension}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  剖面图分析
                </h3>
              </div>
              <div className="p-6">
                <CrossSectionCanvas
                  crossSectionData={record.crossSectionData}
                  editable={true}
                  onSupplement={handleSupplement}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {record.anomalyType && (
              <AnomalyPanel anomalyType={record.anomalyType as AnomalyType} />
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  风险备注
                </h3>
              </div>
              <div className="p-6">
                {record.riskNote ? (
                  <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-base font-medium text-amber-800 leading-relaxed whitespace-pre-wrap">
                        {record.riskNote}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 text-center">
                    <PlusCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">
                      暂无风险备注，请补充
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      至少填写 10 字以上，包含角度值、张力读数、现场环境判断
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  绳索参数明细
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <ThresholdItem
                  icon={Gauge}
                  title="绳索角度"
                  value={record.ropeAngle}
                  unit="°"
                  min={SAFETY_THRESHOLDS.ANGLE_MIN}
                  max={SAFETY_THRESHOLDS.ANGLE_MAX}
                  isSafe={isAngleSafe}
                  description={`绳索与水平基准面的夹角为 ${record.ropeAngle.toFixed(
                    1
                  )}°，安全范围为 ${SAFETY_THRESHOLDS.ANGLE_MIN}°~${
                    SAFETY_THRESHOLDS.ANGLE_MAX
                  }°。角度过小（<${SAFETY_THRESHOLDS.ANGLE_MIN}°）会导致绳索受力不均，角度过大（>${
                    SAFETY_THRESHOLDS.ANGLE_MAX
                  }°）可能导致锚点过载。当前读数${
                    isAngleSafe ? "处于" : "超出"
                  }安全阈值，${
                    isAngleSafe
                      ? "符合救援作业规范要求。"
                      : "请现场复核并重新测量，确保作业安全。"
                  }`}
                />

                <ThresholdItem
                  icon={Layers}
                  title="绳索长度"
                  value={record.ropeLength}
                  unit="m"
                  min={5}
                  max={200}
                  isSafe={isLengthSafe}
                  description={`绳索两锚点之间的有效长度为 ${record.ropeLength.toFixed(
                    1
                  )}m，系统允许范围为 5m~200m。绳长直接影响张力计算与救援方案设计，过短会限制作业范围，过长则增加绳索自重影响。当前读数${
                    isLengthSafe ? "处于" : "超出"
                  }合理范围。`}
                />

                <ThresholdItem
                  icon={TrendingUp}
                  title="绳索张力"
                  value={record.ropeTension}
                  unit="kgf"
                  min={SAFETY_THRESHOLDS.TENSION_MIN}
                  max={SAFETY_THRESHOLDS.TENSION_MAX}
                  isSafe={isTensionSafe}
                  description={`绳索承受的静态张力为 ${record.ropeTension.toFixed(
                    0
                  )}kgf，安全阈值为 ${SAFETY_THRESHOLDS.TENSION_MIN}~${
                    SAFETY_THRESHOLDS.TENSION_MAX
                  }kgf。张力过低（<${SAFETY_THRESHOLDS.TENSION_MIN}kgf）可能意味着绳索松弛，张力过高（>${
                    SAFETY_THRESHOLDS.TENSION_MAX
                  }kgf）则接近绳索破断载荷，存在断裂风险。当前读数${
                    isTensionSafe ? "处于" : "超出"
                  }安全阈值，${
                    isTensionSafe
                      ? "绳索受力状态正常。"
                      : "需要立即检查载荷分布或调整锚点位置。"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        <SupplementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </div>
    </div>
  );
}
