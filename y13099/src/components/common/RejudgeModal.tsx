import { useState, useEffect } from "react";
import { X, Edit3, FileText, AlertCircle } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PlanStatus, STATUS_LABEL_MAP } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function RejudgeModal() {
  const { showRejudgeModal, rejudgePlanId, setShowRejudgeModal, rejudgePlan, loading, plans } =
    useStore();
  const [reason, setReason] = useState("");
  const [materials, setMaterials] = useState("");
  const [newStatus, setNewStatus] = useState<PlanStatus>("pass");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plan = plans.find((p) => p.id === rejudgePlanId);

  useEffect(() => {
    if (showRejudgeModal) {
      setReason("");
      setMaterials("");
      setNewStatus("pass");
      setErrors({});
    }
  }, [showRejudgeModal, rejudgePlanId]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!reason.trim()) newErrors.reason = "请填写改判理由";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const materialList = materials
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    if (rejudgePlanId) {
      rejudgePlan(rejudgePlanId, {
        reason: reason.trim(),
        supplementedMaterials: materialList,
        newStatus,
      });
    }
  };

  const statusOptions: PlanStatus[] = ["pass", "supplement", "exception"];

  return (
    <AnimatePresence>
      {showRejudgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRejudgeModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-warning/15 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-4.5 h-4.5 text-warning" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">方案改判</h2>
                  {plan && (
                    <p className="text-xs text-muted font-mono">
                      {plan.corridorCode} · {plan.corridorName}
                    </p>
                  )}
                </div>
              </div>
              <button
                className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-surface-hover"
                onClick={() => setShowRejudgeModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  改判为 <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewStatus(status)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        newStatus === status
                          ? status === "pass"
                            ? "bg-success/10 border-success/40 text-success"
                            : status === "supplement"
                            ? "bg-warning/10 border-warning/40 text-warning"
                            : "bg-danger/10 border-danger/40 text-danger"
                          : "bg-background border-border text-text-secondary hover:border-primary/40"
                      )}
                    >
                      {STATUS_LABEL_MAP[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  改判理由 <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="请详细说明改判原因，例如：新收到空域协调函、补充了雷达校验数据等"
                  className={cn(
                    "w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none resize-none",
                    errors.reason
                      ? "border-danger focus:border-danger"
                      : "border-border focus:border-primary/60"
                  )}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-danger flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.reason}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  补充材料清单
                  <span className="text-muted font-normal text-xs ml-1">
                    (每行一项)
                  </span>
                </label>
                <textarea
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  rows={3}
                  placeholder={"空域协调函V2\n备选航线评估报告\n冲突规避预案"}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/60 resize-none font-mono"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-start gap-2 text-xs text-text-secondary">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-primary font-medium mb-0.5">改判后自动处理</p>
                    <p>
                      系统将自动更新方案状态、新增改判时间节点、更新行动清单、同步结论依据。改判记录将永久保留在历史时间轴中。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-hover/30">
              <button
                className="btn-secondary text-sm"
                onClick={() => setShowRejudgeModal(false)}
              >
                取消
              </button>
              <button
                className="btn-primary text-sm"
                onClick={handleSubmit}
                disabled={loading.rejudge}
              >
                {loading.rejudge ? "提交中..." : "确认改判"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
