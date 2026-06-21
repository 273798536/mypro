import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Hash,
  Ruler,
  FileEdit,
  RotateCcw,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Copy,
  CircleSlash2,
  CircleDot,
  Clock,
  User,
} from "lucide-react";
import { useParameterStore } from "@/store/useParameterStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import { StatusBadge } from "@/components/StatusBadge";
import { FormulaDisplay } from "@/components/FormulaDisplay";
import { TimelineList } from "@/components/TimelineList";
import { Modal } from "@/components/Modal";
import { OperationForm } from "@/components/OperationForm";
import { formatValue, formatDateTime, getValueTypeName } from "@/utils/formatters";
import type { ParameterStatus } from "@/types";

export default function ParameterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getParameterById, supplementParameter, withdrawParameter, rejudgeParameter, updateParameterStatus } =
    useParameterStore();
  const { getEntriesByParameterId } = useTimelineStore();

  const [modalType, setModalType] = useState<
    "supplement" | "withdraw" | "rejudge" | "approve" | "reject" | null
  >(null);

  const parameter = useMemo(() => (id ? getParameterById(id) : undefined), [id, getParameterById]);
  const timelineEntries = useMemo(
    () => (id ? getEntriesByParameterId(id) : []),
    [id, getEntriesByParameterId],
  );

  const duplicateOfParam = useMemo(() => {
    if (parameter?.duplicateOf) {
      return getParameterById(parameter.duplicateOf);
    }
    return undefined;
  }, [parameter, getParameterById]);

  if (!parameter) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-20">
          <div className="text-ink-400 text-lg">参数不存在</div>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-ink-600 hover:text-ink-800 text-sm"
          >
            ← 返回沙盘
          </button>
        </div>
      </div>
    );
  }

  const handleOperationSubmit = (data: {
    value?: number | null;
    valueType?: any;
    status?: ParameterStatus;
    reason: string;
  }) => {
    if (!id) return;

    switch (modalType) {
      case "supplement":
        supplementParameter(id, data.value ?? null, data.valueType ?? "normal", data.reason);
        break;
      case "withdraw":
        withdrawParameter(id, data.reason);
        break;
      case "rejudge":
        if (data.status) {
          rejudgeParameter(id, data.status, data.reason);
        }
        break;
      case "approve":
        updateParameterStatus(id, "approved", data.reason);
        break;
      case "reject":
        updateParameterStatus(id, "rejected", data.reason);
        break;
    }
    setModalType(null);
  };

  const getRowBgClass = () => {
    if (parameter.valueType === "empty_set") return "bg-empty-50 border-empty-200";
    if (parameter.valueType === "zero") return "bg-zero-50 border-zero-200";
    if (parameter.status === "duplicate") return "bg-duplicate-50/50 border-duplicate-200";
    return "bg-white border-ink-100";
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-ink-500 hover:text-ink-700 text-sm mb-4 transition-soft"
      >
        <ArrowLeft className="w-4 h-4" />
        返回参数沙盘
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-xl shadow-card border ${getRowBgClass()} p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="font-serif-title text-xl font-bold text-ink-800">
                    {parameter.name}
                  </h1>
                  <StatusBadge status={parameter.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-ink-500">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    {parameter.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" />
                    单位：{parameter.unit}
                  </span>
                </div>
              </div>

              {parameter.valueType !== "normal" && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg border border-ink-200">
                  {parameter.valueType === "empty_set" && (
                    <CircleSlash2 className="w-4 h-4 text-ink-500" />
                  )}
                  {parameter.valueType === "zero" && (
                    <CircleDot className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-sm text-ink-600">
                    {getValueTypeName(parameter.valueType)}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-5">
              <div className="text-xs text-ink-500 mb-1.5">当前值</div>
              <div className="font-mono-code text-3xl font-semibold text-ink-800">
                {formatValue(parameter.value, parameter.valueType, parameter.unit)}
              </div>
              <p className="text-sm text-ink-500 mt-2 leading-relaxed">
                {parameter.description}
              </p>
            </div>

            {parameter.status === "duplicate" && duplicateOfParam && (
              <div className="mb-5 p-3 bg-duplicate-100/50 border border-duplicate-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-duplicate-600 font-medium mb-1">
                  <Copy className="w-4 h-4" />
                  疑似重复样本
                </div>
                <p className="text-sm text-ink-600">
                  与「{duplicateOfParam.name}」值和分类完全一致。
                  <button
                    onClick={() => navigate(`/parameter/${duplicateOfParam.id}`)}
                    className="text-ink-700 underline ml-1"
                  >
                    查看原始参数
                  </button>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-ink-500 font-medium">创建时间</div>
                <div className="text-sm text-ink-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ink-400" />
                  {formatDateTime(parameter.createdAt)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-ink-500 font-medium">更新时间</div>
                <div className="text-sm text-ink-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ink-400" />
                  {formatDateTime(parameter.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
            <h2 className="font-serif-title text-lg font-semibold text-ink-800 mb-4">
              公式与术语
            </h2>
            <FormulaDisplay
              formula={parameter.formula}
              explanation={parameter.formulaExplanation}
            />
          </div>

          <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
            <h2 className="font-serif-title text-lg font-semibold text-ink-800 mb-4">
              边界条件
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {parameter.boundaryConditions.min !== undefined && (
                <div className="p-3 bg-ink-50/50 rounded-lg">
                  <div className="text-xs text-ink-500 mb-1">最小值</div>
                  <div className="font-mono-code text-ink-800">
                    {parameter.boundaryConditions.min}
                  </div>
                </div>
              )}
              {parameter.boundaryConditions.max !== undefined && (
                <div className="p-3 bg-ink-50/50 rounded-lg">
                  <div className="text-xs text-ink-500 mb-1">最大值</div>
                  <div className="font-mono-code text-ink-800">
                    {parameter.boundaryConditions.max}
                  </div>
                </div>
              )}
              {parameter.boundaryConditions.mustBeInteger && (
                <div className="p-3 bg-ink-50/50 rounded-lg">
                  <div className="text-xs text-ink-500 mb-1">约束</div>
                  <div className="text-sm text-ink-700">必须为整数</div>
                </div>
              )}
              {parameter.boundaryConditions.mustBePositive && (
                <div className="p-3 bg-ink-50/50 rounded-lg">
                  <div className="text-xs text-ink-500 mb-1">约束</div>
                  <div className="text-sm text-ink-700">必须为正数</div>
                </div>
              )}
            </div>
            {parameter.boundaryConditions.notes && (
              <div className="mt-4 p-3 bg-review-50 border border-review-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-review-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-review-600 font-medium mb-0.5">备注</div>
                    <p className="text-sm text-ink-700">
                      {parameter.boundaryConditions.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
            <h2 className="font-serif-title text-lg font-semibold text-ink-800 mb-4">
              操作区
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModalType("supplement")}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-soft border border-blue-200"
              >
                <FileEdit className="w-4 h-4" />
                补录
              </button>
              <button
                onClick={() => setModalType("withdraw")}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 text-sm rounded-lg hover:bg-orange-100 transition-soft border border-orange-200"
              >
                <RotateCcw className="w-4 h-4" />
                撤回
              </button>
              <button
                onClick={() => setModalType("rejudge")}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100 transition-soft border border-purple-200"
              >
                <Gavel className="w-4 h-4" />
                改判
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setModalType("reject")}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 text-sm rounded-lg hover:bg-red-100 transition-soft border border-red-200"
              >
                驳回
              </button>
              <button
                onClick={() => setModalType("approve")}
                className="flex items-center gap-1.5 px-4 py-2 bg-approved-500 text-white text-sm rounded-lg hover:bg-approved-600 transition-soft shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                通过
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-card border border-ink-100 p-5 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif-title text-lg font-semibold text-ink-800">
                操作时间线
              </h2>
              <span className="text-xs text-ink-400">
                共 {timelineEntries.length} 条记录
              </span>
            </div>
            <TimelineList entries={timelineEntries} showParameterName={false} maxHeight="500px" />
          </div>
        </div>
      </div>

      {modalType && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title={`${
            modalType === "supplement"
              ? "补录参数"
              : modalType === "withdraw"
              ? "撤回参数"
              : modalType === "rejudge"
              ? "改判状态"
              : modalType === "approve"
              ? "通过复核"
              : "驳回参数"
          }`}
        >
          <OperationForm
            operationType={modalType}
            parameterName={parameter.name}
            currentValue={parameter.value}
            currentValueType={parameter.valueType}
            currentStatus={parameter.status}
            onSubmit={handleOperationSubmit}
            onCancel={() => setModalType(null)}
          />
        </Modal>
      )}
    </div>
  );
}
