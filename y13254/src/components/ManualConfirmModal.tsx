import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type NextAction = "remeasure" | "adjust_boundary" | "remark_release";

const NEXT_ACTIONS: { value: NextAction; label: string }[] = [
  { value: "remeasure", label: "重新测绘坐标" },
  { value: "adjust_boundary", label: "调整边界范围" },
  { value: "remark_release", label: "录入说明备注放行" },
];

interface CoordCheck {
  lng: number;
  lat: number;
  valid: boolean;
  reason?: string;
}

interface ManualConfirmModalProps {
  open: boolean;
  onClose: () => void;
  reasons: string[];
  coordCheck?: CoordCheck;
  itemId?: string;
  onConfirm?: (remark: string, action: NextAction) => void;
}

export default function ManualConfirmModal({
  open,
  onClose,
  reasons,
  coordCheck,
  onConfirm,
}: ManualConfirmModalProps) {
  const [selectedAction, setSelectedAction] = useState<NextAction>("remeasure");

  if (!open) return null;

  const handleConfirm = () => {
    const actionLabel = NEXT_ACTIONS.find((a) => a.value === selectedAction)?.label;
    const remark = `人工确认：${actionLabel}${
      coordCheck?.reason ? ` | 原因：${coordCheck.reason}` : ""
    }`;
    onConfirm?.(remark, selectedAction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[520px] bg-white rounded-lg shadow-card overflow-hidden">
        <div className="bg-purple-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-serif-display text-lg font-semibold text-purple-900">
              需要人工确认
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-purple-100 transition-all"
          >
            <X className="w-4 h-4 text-purple-600" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">问题原因</div>
            <ul className="space-y-2">
              {reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {coordCheck && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">坐标信息</div>
              <div className="bg-slate-50 px-4 py-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">经度</span>
                  <span className="font-mono text-slate-700">{coordCheck.lng.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">纬度</span>
                  <span className="font-mono text-slate-700">{coordCheck.lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">校验结果</span>
                  <span
                    className={`font-medium ${
                      coordCheck.valid ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {coordCheck.valid ? "正常" : "异常"}
                  </span>
                </div>
                {coordCheck.reason && (
                  <div className="pt-2 border-t border-slate-200 text-slate-600">
                    {coordCheck.reason}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">下一步操作</div>
            <div className="space-y-2">
              {NEXT_ACTIONS.map((action) => {
                const isActive = selectedAction === action.value;
                return (
                  <button
                    key={action.value}
                    onClick={() => setSelectedAction(action.value)}
                    className={`w-full px-4 py-3 rounded-md text-left text-sm transition-all border ${
                      isActive
                        ? "bg-purple-50 border-purple-400 text-purple-900 font-medium"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isActive ? "border-purple-500" : "border-slate-300"
                        }`}
                      >
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                        )}
                      </span>
                      {action.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-md text-sm transition-all"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm transition-all hover:shadow-md"
          >
            记录并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
