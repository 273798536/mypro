import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { HistoryAction } from "@/types";
import { ACTION_LABEL } from "@/types";
import clsx from "clsx";
import {
  CheckCircle2,
  Scissors,
  Combine,
  HelpCircle,
  RotateCcw,
  AlertCircle,
  Send,
  X,
} from "lucide-react";

const ACTIONS: {
  key: HistoryAction;
  label: string;
  cls: string;
  Icon: typeof CheckCircle2;
}[] = [
  { key: "confirm", label: "确认归并", cls: "btn-primary", Icon: CheckCircle2 },
  { key: "split", label: "拆分点位", cls: "btn-warning", Icon: Scissors },
  { key: "merge", label: "合并至他组", cls: "btn-outline", Icon: Combine },
  { key: "doubt", label: "标记存疑", cls: "btn-danger", Icon: HelpCircle },
  { key: "return", label: "退回算法", cls: "btn-risk", Icon: RotateCcw },
];

export function ActionFooter() {
  const selected = useAppStore((s) => s.selectedGroupIds);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const performAction = useAppStore((s) => s.performAction);
  const operator = useAppStore((s) => s.currentOperator);
  const [expanded, setExpanded] = useState(false);
  const [remark, setRemark] = useState("");
  const [pendingAction, setPendingAction] = useState<HistoryAction | null>(null);

  if (selected.length === 0 && !expanded) return null;

  const handleActionClick = (action: HistoryAction) => {
    if (selected.length === 0) return;
    setPendingAction(action);
    setExpanded(true);
  };

  const execute = () => {
    if (!pendingAction || !remark.trim()) return;
    selected.forEach((gid) =>
      performAction({ groupId: gid, action: pendingAction, remark: remark.trim() })
    );
    setRemark("");
    setPendingAction(null);
    setExpanded(false);
    clearSelection();
  };

  return (
    <div className="fixed bottom-0 left-60 right-0 z-40 px-6 pb-5 pt-4 bg-gradient-to-t from-neutral-50 via-neutral-50 to-transparent pointer-events-none">
      <div className="max-w-[calc(100vw-288px)] mx-auto pointer-events-auto">
        <div className="card-base shadow-lg border-neutral-300 p-4 animate-fade-up">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-[200px]">
              <AlertCircle className="w-5 h-5 text-civic-600" />
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  已选择 <span className="font-mono text-civic-600 text-lg font-bold">{selected.length}</span> 个点位
                </div>
                <div className="text-[11px] text-neutral-500">
                  操作人：{operator} · 备注必填，将写入历史
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[280px] flex items-center gap-2">
              {ACTIONS.map((a) => {
                const Icon = a.Icon;
                const disabled = selected.length === 0;
                const active = pendingAction === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => handleActionClick(a.key)}
                    disabled={disabled}
                    className={clsx(
                      a.cls,
                      "flex-1 whitespace-nowrap",
                      active && "ring-2 ring-offset-2 ring-civic-500",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{a.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={clearSelection}
              className="btn-outline px-3"
              title="清除选择"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-neutral-200 animate-fade-up">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[320px]">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1 mb-1">
                    {pendingAction && (
                      <span className="badge bg-civic-100 text-civic-700">
                        {ACTION_LABEL[pendingAction]}
                      </span>
                    )}
                    操作备注 <span className="text-late-600">*</span>
                    <span className="text-neutral-400 font-normal ml-1">
                      — 请写清判断理由，下一班会看
                    </span>
                  </label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="例如：与G008坐标虽近但投诉主体不同，老曹已明确拆分；或：四条反馈描述一致，证据相互印证..."
                    className="input-field min-h-[72px] resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end h-[104px]">
                  <button
                    onClick={execute}
                    disabled={!remark.trim() || !pendingAction}
                    className="btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    执行并写入历史
                  </button>
                  <button
                    onClick={() => {
                      setExpanded(false);
                      setPendingAction(null);
                      setRemark("");
                    }}
                    className="btn-outline"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
