import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ScrollText,
  RefreshCw,
  Play,
  FilePlus,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Clock,
  User,
  Wrench,
  Download,
  FileCheck2,
} from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import { StepStatusBadge, RiskBadge, AnomalyBadge } from "@/components/Badges";

export default function ReviewWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const route = useRouteStore((s) => s.getRouteById(id || ""));
  const { setRerunStatus, setSupplementStatus, setManualConfirmStatus, attemptCameraRepair } =
    useRouteStore();

  const [running, setRunning] = useState(false);
  const [supplementing, setSupplementing] = useState(false);
  const [confirmSignature, setConfirmSignature] = useState("");
  const [confirmComments, setConfirmComments] = useState("");
  const [repairMethod, setRepairMethod] = useState("日志重放恢复");
  const [repairing, setRepairing] = useState(false);

  if (!route) {
    return (
      <div className="p-8 text-industrial-muted text-sm">
        <AlertTriangle className="w-5 h-5 inline mr-2" />
        航线不存在
        <Link to="/routes" className="ml-3 text-status-safe underline">
          返回列表
        </Link>
      </div>
    );
  }

  const handleRerun = () => {
    setRunning(true);
    setRerunStatus(route.id, "running", {
      executedBy: "系统自动",
    });
    setTimeout(() => {
      const deviationAfter = Math.max(1, route.heightDeviation + (Math.random() - 0.5) * 3);
      const passed = Math.abs(deviationAfter - route.heightDeviation) < 5;
      setRerunStatus(route.id, passed ? "passed" : "failed", {
        executedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        executedBy: "系统自动",
        result: passed ? `重算偏差 ${deviationAfter.toFixed(1)}m，与初值误差<3%，数据有效` : "重算差异过大，需人工复核",
        deviationBefore: route.heightDeviation,
        deviationAfter: Math.round(deviationAfter * 10) / 10,
      });
      setRunning(false);
    }, 2200);
  };

  const handleSupplement = () => {
    setSupplementing(true);
    setSupplementStatus(route.id, "in_progress", {
      supplementedBy: "当前用户",
    });
    setTimeout(() => {
      setSupplementStatus(route.id, "completed", {
        supplementedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        supplementedBy: "当前用户",
        supplementedFields: ["coordinates", "profileData"],
      });
      setSupplementing(false);
    }, 1500);
  };

  const handleManualConfirm = (accepted: boolean) => {
    setManualConfirmStatus(route.id, accepted ? "confirmed" : "rejected", {
      confirmedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      confirmedBy: "当前用户",
      signature: confirmSignature || "SIG_" + Date.now(),
      comments: confirmComments,
    });
    setConfirmSignature("");
    setConfirmComments("");
  };

  const handleCameraRepair = () => {
    setRepairing(true);
    setTimeout(() => {
      attemptCameraRepair(route.id, repairMethod, "当前用户");
      setRepairing(false);
    }, 1800);
  };

  const allStepsDone =
    (route.threeStepReview.rerun.status === "passed" || route.threeStepReview.rerun.status === "failed") &&
    (route.threeStepReview.supplement.status === "completed" ||
      route.threeStepReview.supplement.status === "not_needed") &&
    (route.threeStepReview.manualConfirm.status === "confirmed" ||
      route.threeStepReview.manualConfirm.status === "rejected");

  return (
    <div className="min-h-screen bg-industrial-bg">
      <header className="px-6 py-3 border-b border-industrial-border/60 flex items-center gap-4">
        <button
          onClick={() => navigate(`/routes/${route.id}`)}
          className="text-industrial-muted hover:text-industrial-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-status-warning" />
            <span className="font-mono text-sm font-bold text-industrial-text">评审工作台</span>
            <span className="font-mono text-xs text-industrial-muted">{route.routeCode}</span>
            <RiskBadge level={route.riskLevel} />
            {route.anomalyTypes.map((t) => (
              <AnomalyBadge key={t} type={t} />
            ))}
          </div>
          <div className="text-xs text-industrial-muted mt-0.5">{route.missionName}</div>
        </div>
        {allStepsDone && (
          <button className="btn btn-primary flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            导出评审报告
          </button>
        )}
      </header>

      {route.cameraViewIssue?.isReported && (
        <div className="px-6 py-3 bg-status-warning/10 border-b border-status-warning/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-status-warning/20 flex items-center justify-center shrink-0 mt-0.5">
              <Camera className="w-4 h-4 text-status-warning" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-status-warning font-medium">
                检测到相机视角丢失问题
              </div>
              <div className="text-xs text-industrial-muted mt-0.5">
                丢失参数：{route.cameraViewIssue.lostParams?.join("、")} · 已尝试修复{" "}
                {route.cameraViewIssue.repairAttempts} 次
              </div>
              <div className="mt-2 flex items-end gap-2 flex-wrap">
                <select
                  value={repairMethod}
                  onChange={(e) => setRepairMethod(e.target.value)}
                  className="input-field !py-1.5 text-xs w-44"
                >
                  <option>日志重放恢复</option>
                  <option>相邻航段外推插值</option>
                  <option>惯性导航推算</option>
                  <option>手动输入参数</option>
                </select>
                <button
                  onClick={handleCameraRepair}
                  disabled={repairing}
                  className="btn btn-warning text-xs flex items-center gap-1.5"
                >
                  {repairing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      修复中...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3.5 h-3.5" />
                      尝试修复
                    </>
                  )}
                </button>
                {route.cameraViewIssue.repairHistory.length > 0 && (
                  <div className="text-[10px] text-industrial-muted ml-2 space-y-0.5">
                    {route.cameraViewIssue.repairHistory.slice(-2).map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {h.result === "success" ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-status-safe" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5 text-status-danger" />
                        )}
                        <span>
                          {h.method} · {h.attemptedBy} · {h.attemptedAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-status-warning/15 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-status-warning" />
                </div>
                <div>
                  <div className="text-sm font-medium text-industrial-text">① 重复运行</div>
                  <div className="text-[10px] text-industrial-muted">重新解算验证数据一致性</div>
                </div>
              </div>
              <StepStatusBadge
                status={
                  running ? "running" : route.threeStepReview.rerun.status
                }
                okLabel="通过"
                notLabel="未执行"
                runLabel="运行中"
                failLabel="失败"
              />
            </div>

            {route.threeStepReview.rerun.status !== "not_started" &&
              route.threeStepReview.rerun.deviationBefore !== undefined && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-industrial-bg rounded border border-industrial-border/60 p-2">
                    <div className="text-[10px] text-industrial-muted">重算前偏差</div>
                    <div className="font-mono text-sm font-bold text-industrial-text">
                      {route.threeStepReview.rerun.deviationBefore} m
                    </div>
                  </div>
                  <div className="bg-industrial-bg rounded border border-industrial-border/60 p-2">
                    <div className="text-[10px] text-industrial-muted">重算后偏差</div>
                    <div
                      className={`font-mono text-sm font-bold ${
                        route.threeStepReview.rerun.status === "passed"
                          ? "text-status-safe"
                          : "text-status-danger"
                      }`}
                    >
                      {route.threeStepReview.rerun.deviationAfter} m
                    </div>
                  </div>
                </div>
              )}

            {route.threeStepReview.rerun.result && (
              <div className="text-[11px] text-industrial-muted mb-3 leading-relaxed bg-industrial-bg rounded border border-industrial-border/60 p-2">
                {route.threeStepReview.rerun.result}
              </div>
            )}

            <button
              onClick={handleRerun}
              disabled={running}
              className="w-full btn btn-warning flex items-center justify-center gap-1.5"
            >
              {running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  正在解算...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  执行重复运行
                </>
              )}
            </button>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-status-warning/15 flex items-center justify-center">
                  <FilePlus className="w-4 h-4 text-status-warning" />
                </div>
                <div>
                  <div className="text-sm font-medium text-industrial-text">② 补录数据</div>
                  <div className="text-[10px] text-industrial-muted">补充缺失的坐标或剖面数据</div>
                </div>
              </div>
              <StepStatusBadge
                status={
                  supplementing
                    ? "in_progress"
                    : route.threeStepReview.supplement.status === "not_needed"
                    ? "passed"
                    : route.threeStepReview.supplement.status
                }
                okLabel="已补录"
                notLabel="未执行"
                runLabel="补录中"
                failLabel="失败"
              />
            </div>

            {route.threeStepReview.supplement.status !== "not_started" && (
              <div className="text-[11px] text-industrial-muted mb-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-2.5 h-2.5" />
                  操作人：{route.threeStepReview.supplement.supplementedBy}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-2.5 h-2.5" />
                  时间：{route.threeStepReview.supplement.supplementedAt}
                </div>
                {route.threeStepReview.supplement.supplementedFields && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {route.threeStepReview.supplement.supplementedFields.map((f) => (
                      <span key={f} className="tag tag-warning font-mono text-[10px]">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSupplement}
                disabled={supplementing || route.threeStepReview.supplement.status === "completed"}
                className="flex-1 btn btn-warning flex items-center justify-center gap-1.5"
              >
                {supplementing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    补录中...
                  </>
                ) : (
                  <>
                    <FilePlus className="w-3.5 h-3.5" />
                    模拟补录
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  setSupplementStatus(route.id, "not_needed", { supplementedBy: "当前用户" })
                }
                disabled={route.threeStepReview.supplement.status !== "not_started"}
                className="btn btn-default text-xs"
                title="数据完整无需补录"
              >
                无需
              </button>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-status-warning/15 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-status-warning" />
                </div>
                <div>
                  <div className="text-sm font-medium text-industrial-text">③ 人工确认</div>
                  <div className="text-[10px] text-industrial-muted">仿真工程师签字确认结论</div>
                </div>
              </div>
              <StepStatusBadge
                status={route.threeStepReview.manualConfirm.status}
                okLabel="已确认"
                notLabel="未确认"
                runLabel=""
                failLabel="已驳回"
              />
            </div>

            {route.threeStepReview.manualConfirm.status !== "not_started" && (
              <div className="text-[11px] text-industrial-muted mb-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-2.5 h-2.5" />
                  {route.threeStepReview.manualConfirm.confirmedBy}
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="w-2.5 h-2.5" />
                  {route.threeStepReview.manualConfirm.signature}
                </div>
                {route.threeStepReview.manualConfirm.comments && (
                  <div className="bg-industrial-bg rounded border border-industrial-border/60 p-2 mt-1.5">
                    {route.threeStepReview.manualConfirm.comments}
                  </div>
                )}
              </div>
            )}

            {route.threeStepReview.manualConfirm.status === "not_started" && (
              <div className="space-y-2">
                <input
                  value={confirmSignature}
                  onChange={(e) => setConfirmSignature(e.target.value)}
                  placeholder="签字标识（如姓名缩写工号）"
                  className="input-field w-full !py-1.5 text-xs"
                />
                <textarea
                  value={confirmComments}
                  onChange={(e) => setConfirmComments(e.target.value)}
                  placeholder="确认意见（可选）"
                  className="input-field w-full !py-1.5 text-xs h-12 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManualConfirm(false)}
                    className="flex-1 btn btn-danger text-xs flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    驳回
                  </button>
                  <button
                    onClick={() => handleManualConfirm(true)}
                    className="flex-1 btn btn-primary text-xs flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    确认通过
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel p-4">
          <div className="font-mono text-xs text-industrial-text mb-3 flex items-center gap-2">
            <FileCheck2 className="w-3.5 h-3.5 text-status-safe" />
            三步复核汇总
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "重复运行", status: route.threeStepReview.rerun.status },
              {
                label: "补录数据",
                status:
                  route.threeStepReview.supplement.status === "completed" ||
                  route.threeStepReview.supplement.status === "not_needed"
                    ? "passed"
                    : route.threeStepReview.supplement.status,
              },
              { label: "人工确认", status: route.threeStepReview.manualConfirm.status },
            ].map((s, idx) => {
              const done =
                s.status === "passed" || s.status === "completed" || s.status === "confirmed";
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
                      done
                        ? "bg-status-safe/15 border-status-safe text-status-safe"
                        : s.status === "failed" || s.status === "rejected"
                        ? "bg-status-danger/15 border-status-danger text-status-danger"
                        : "bg-industrial-bg border-industrial-border text-industrial-muted"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : s.status === "failed" || s.status === "rejected" ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <span className="font-mono font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        done
                          ? "text-status-safe"
                          : s.status === "failed" || s.status === "rejected"
                          ? "text-status-danger"
                          : "text-industrial-muted"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="text-[10px] text-industrial-muted">
                      {done
                        ? "已完成"
                        : s.status === "failed" || s.status === "rejected"
                        ? "需重新处理"
                        : "待执行"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divider-line my-4" />

          <div className="flex items-center justify-between">
            <div className="text-xs">
              {allStepsDone ? (
                <span className="text-status-safe flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  三步复核已全部完成，可以提交评审会
                </span>
              ) : (
                <span className="text-industrial-muted flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                  评审会前请完成重复运行、补录、人工确认三项，少一项都会让日常使用打折
                </span>
              )}
            </div>
            <button
              disabled={!allStepsDone}
              className="btn btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              提交评审委员会
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
