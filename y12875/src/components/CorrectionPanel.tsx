import { useState, useMemo } from "react";
import { BuoyRecord, BuoyField, FIELD_LABELS, FIELD_UNITS } from "@/types";
import { useBuoyStore } from "@/store/useBuoyStore";
import { useReviewStore } from "@/store/useReviewStore";
import { formatValue, formatTimestamp } from "@/utils/correctionLogger";
import { X, Check, ArrowRight, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS: (BuoyField | "remark")[] = [
  "plasticConcentration",
  "turbidity",
  "salinity",
  "temperature",
  "remark",
];

interface Props {
  record: BuoyRecord;
  onClose: () => void;
  onEditField: (field: BuoyField | "remark") => void;
}

export default function CorrectionPanel({ record, onClose, onEditField }: Props) {
  const correctField = useBuoyStore((s) => s.correctField);
  const approveRecord = useBuoyStore((s) => s.approveRecord);
  const allLogs = useReviewStore((s) => s.logs);

  const logs = useMemo(() => {
    return allLogs
      .filter((log) => log.buoyRecordId === record.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allLogs, record.id]);

  const [activeField, setActiveField] = useState<BuoyField | "remark" | null>(null);
  const [newValue, setNewValue] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [sourceMaterial, setSourceMaterial] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const startEdit = (field: BuoyField | "remark") => {
    onEditField(field);
    setActiveField(field);
    if (field === "remark") {
      setNewValue(record.extractedRemark || record.rawRemark || "");
    } else {
      setNewValue(record[field] === null ? "" : String(record[field]));
    }
    setRemark("");
    setSourceMaterial("");
  };

  const getFieldValue = (field: BuoyField | "remark"): number | string | null => {
    if (field === "remark") return record.extractedRemark || record.rawRemark || null;
    return record[field];
  };

  const handleSubmit = () => {
    if (!activeField) return;

    let parsedValue: number | string | null = newValue;
    if (activeField !== "remark") {
      parsedValue = newValue === "" ? null : parseFloat(newValue);
      if (parsedValue !== null && isNaN(parsedValue as number)) {
        alert("请输入有效数值");
        return;
      }
    }

    correctField({
      recordId: record.id,
      fieldName: activeField,
      oldValue: getFieldValue(activeField),
      newValue: parsedValue,
      operator: "当前用户",
      remark,
      sourceMaterial,
    });

    setActiveField(null);
    setNewValue("");
    setRemark("");
    setSourceMaterial("");
  };

  const handleApprove = () => {
    approveRecord(record.id);
    onClose();
  };

  return (
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="font-serif text-lg text-ocean-50">人工修正面板</h4>
            <span className="font-mono text-sm text-ocean-400">{record.buoyId}</span>
            <span className="text-xs text-ocean-400/70">
              {formatTimestamp(record.timestamp)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-ocean-400 hover:text-ocean-50 hover:bg-ocean-700/50 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {FIELDS.map((field) => {
          const oldVal = getFieldValue(field);
          const isActive = activeField === field;
          const label =
            field === "remark"
              ? "备注文本"
              : `${FIELD_LABELS[field]} (${FIELD_UNITS[field as BuoyField]})`;

          return (
            <div
              key={field}
              className={cn(
                "p-4 rounded-lg border transition-all",
                isActive
                  ? "bg-ocean-600/30 border-ocean-500/50"
                  : "bg-ocean-900/40 border-ocean-600/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-ocean-300/80">
                  {label}
                </span>
                {!isActive && (
                  <button
                    onClick={() => startEdit(field)}
                    className="text-xs px-2 py-1 rounded bg-ocean-700/60 text-ocean-200 hover:bg-ocean-600 transition-colors"
                  >
                    修正
                  </button>
                )}
              </div>

              {!isActive ? (
                <div className="font-mono text-lg text-ocean-50">
                  {oldVal === null || oldVal === undefined || oldVal === ""
                    ? "—（空值）"
                    : String(oldVal)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-ocean-400 mb-1">原值</div>
                      <div className="font-mono text-sm text-quality-recollect line-through">
                        {formatValue(oldVal, field)}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-ocean-500" />
                    <div className="flex-1">
                      <div className="text-xs text-ocean-400 mb-1">新值</div>
                      <input
                        type={field === "remark" ? "text" : "number"}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={field === "remark" ? "输入备注..." : "输入数值..."}
                        className="input-field text-lg"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="修正说明..."
                      className="input-field text-sm"
                    />
                    <input
                      type="text"
                      value={sourceMaterial}
                      onChange={(e) => setSourceMaterial(e.target.value)}
                      placeholder="来源材料（如：巡检照片编号/潮汐表）"
                      className="input-field text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmit}
                      className="btn-primary text-sm py-1.5 flex items-center gap-1"
                    >
                      <Check size={14} />
                      保存修正
                    </button>
                    <button
                      onClick={() => setActiveField(null)}
                      className="btn-secondary text-sm py-1.5"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ocean-600/20 flex-wrap gap-3">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-sm text-ocean-300 hover:text-ocean-50 transition-colors"
        >
          <FileText size={14} />
          修正留痕记录（{logs.length}）
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {record.reviewStatus === "pending" && (
          <button onClick={handleApprove} className="btn-primary text-sm">
            <Check size={14} className="inline mr-1" />
            审核通过（待确认 → 通过）
          </button>
        )}
      </div>

      {showHistory && logs.length > 0 && (
        <div className="mt-4 space-y-2 max-h-56 overflow-y-auto scrollbar-thin animate-float-in">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-lg bg-ocean-900/50 border border-ocean-600/30"
            >
              <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ocean-100">
                    {log.fieldLabel}
                  </span>
                  <span className="text-xs text-ocean-400">{log.operator}</span>
                </div>
                <span className="text-xs text-ocean-500">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-3 my-1.5 flex-wrap">
                <span className="font-mono text-sm text-quality-recollect line-through">
                  {formatValue(log.oldValue, log.fieldName)}
                </span>
                <ArrowRight size={14} className="text-ocean-500" />
                <span className="font-mono text-sm text-quality-available">
                  {formatValue(log.newValue, log.fieldName)}
                </span>
              </div>
              <p className="text-xs text-ocean-300/80">{log.remark}</p>
              {log.sourceMaterial && (
                <p className="text-xs text-ocean-500 mt-1 flex items-center gap-1">
                  <FileText size={12} />
                  来源：{log.sourceMaterial}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
