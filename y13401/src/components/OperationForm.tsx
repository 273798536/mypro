import { useState } from "react";
import type { ParameterStatus, ValueType } from "@/types";

interface OperationFormProps {
  operationType: "supplement" | "withdraw" | "rejudge" | "approve" | "reject";
  parameterName: string;
  currentValue?: number | null;
  currentValueType?: ValueType;
  currentStatus?: ParameterStatus;
  onSubmit: (data: {
    value?: number | null;
    valueType?: ValueType;
    status?: ParameterStatus;
    reason: string;
  }) => void;
  onCancel: () => void;
}

const operationLabels = {
  supplement: "补录",
  withdraw: "撤回",
  rejudge: "改判",
  approve: "通过",
  reject: "驳回",
};

export function OperationForm({
  operationType,
  parameterName,
  currentValue,
  currentValueType,
  currentStatus,
  onSubmit,
  onCancel,
}: OperationFormProps) {
  const [value, setValue] = useState<string>(
    currentValue !== undefined && currentValue !== null ? String(currentValue) : "",
  );
  const [valueType, setValueType] = useState<ValueType>(currentValueType || "normal");
  const [status, setStatus] = useState<ParameterStatus>(currentStatus || "pending");
  const [reason, setReason] = useState("");

  const showValueFields = operationType === "supplement" || operationType === "rejudge";
  const showStatusFields =
    operationType === "rejudge" ||
    operationType === "approve" ||
    operationType === "reject";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const data: {
      value?: number | null;
      valueType?: ValueType;
      status?: ParameterStatus;
      reason: string;
    } = { reason: reason.trim() };

    if (showValueFields) {
      if (valueType === "empty_set") {
        data.value = null;
      } else if (valueType === "zero") {
        data.value = 0;
      } else {
        data.value = value ? Number(value) : null;
      }
      data.valueType = valueType;
    }

    if (showStatusFields) {
      if (operationType === "approve") {
        data.status = "approved";
      } else if (operationType === "reject") {
        data.status = "rejected";
      } else {
        data.status = status;
      }
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-ink-50 rounded-lg p-3 text-sm">
        <span className="text-ink-500">参数：</span>
        <span className="text-ink-800 font-medium">{parameterName}</span>
      </div>

      {showValueFields && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              值类型
            </label>
            <select
              value={valueType}
              onChange={(e) => setValueType(e.target.value as ValueType)}
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm bg-white text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
            >
              <option value="normal">正常值</option>
              <option value="zero">零值（有意义的零）</option>
              <option value="empty_set">空集合（∅）</option>
              <option value="null">空值</option>
            </select>
          </div>

          {(valueType === "normal" || valueType === "null") && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                数值
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="请输入数值"
                disabled={valueType === "null"}
                className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm font-mono-code text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft disabled:bg-ink-50 disabled:text-ink-400"
              />
            </div>
          )}
        </div>
      )}

      {showStatusFields && operationType === "rejudge" && (
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">
            新状态
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ParameterStatus)}
            className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm bg-white text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
          >
            <option value="pending">待复核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
            <option value="needs_review">需重点复核</option>
            <option value="duplicate">重复样本</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          理由 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`请输入${operationLabels[operationType]}理由，便于后续追溯...`}
          rows={3}
          className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-ink-600 bg-ink-50 hover:bg-ink-100 rounded-lg transition-soft"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!reason.trim()}
          className="px-4 py-2 text-sm text-white bg-ink-700 hover:bg-ink-800 rounded-lg transition-soft disabled:bg-ink-300 disabled:cursor-not-allowed"
        >
          确认{operationLabels[operationType]}
        </button>
      </div>
    </form>
  );
}
