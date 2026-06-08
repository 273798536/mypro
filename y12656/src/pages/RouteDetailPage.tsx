import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Route,
  GitBranch,
  Clock,
  User,
  MapPin,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Activity,
  Link2,
  ChevronRight,
  ScrollText,
  RefreshCw,
  FilePlus,
  UserCheck,
  ArrowLeftRight,
} from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import {
  RiskBadge,
  AnomalyBadge,
  ConclusionBadge,
  StepStatusBadge,
} from "@/components/Badges";
import ProfileChart from "@/components/ProfileChart";
import type { NoteConclusion } from "@/types";

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const route = useRouteStore((s) => s.getRouteById(id || ""));
  const { addViewSnapshot, setCurrentView, addRiskNote, addHandlingOpinion, updateOpinionStatus } =
    useRouteStore();

  const [compareViewId, setCompareViewId] = useState<string | undefined>();
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteConclusion, setNewNoteConclusion] = useState<NoteConclusion>("pending");
  const [newOpinion, setNewOpinion] = useState("");

  if (!route) {
    return (
      <div className="p-8 text-industrial-muted text-sm">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        航线不存在
        <Link to="/routes" className="ml-3 text-status-safe underline">
          返回列表
        </Link>
      </div>
    );
  }

  const currentNote =
    route.riskNoteHistory.find((n) => n.id === route.currentNoteId) ||
    route.riskNoteHistory[route.riskNoteHistory.length - 1];
  const prevNote =
    route.riskNoteHistory.length > 1
      ? route.riskNoteHistory[route.riskNoteHistory.length - 2]
      : null;

  const handleSaveView = (params: { panX: number; panY: number; zoom: number; visibleRange: [number, number] }, name: string) =>
    addViewSnapshot(route.id, {
      id: `vs-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      createdBy: "当前用户",
      cameraParams: params,
    });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    addRiskNote(route.id, {
      content: newNoteContent,
      createdBy: "当前用户",
      conclusion: newNoteConclusion,
    });
    setNewNoteContent("");
    setNewNoteConclusion("pending");
    setShowNoteEditor(false);
  };

  const handleAddOpinion = () => {
    if (!newOpinion.trim()) return;
    addHandlingOpinion(route.id, {
      type: "manual_input",
      content: newOpinion,
      createdBy: "当前用户",
      status: "proposed",
    });
    setNewOpinion("");
  };

  const threeStepItems = [
    {
      key: "rerun",
      label: "重复运行",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      status: route.threeStepReview.rerun.status,
    },
    {
      key: "supplement",
      label: "补录数据",
      icon: <FilePlus className="w-3.5 h-3.5" />,
      status:
        route.threeStepReview.supplement.status === "completed"
          ? "completed"
          : route.threeStepReview.supplement.status === "in_progress"
          ? "in_progress"
          : route.threeStepReview.supplement.status === "not_needed"
          ? "passed"
          : "not_started",
    },
    {
      key: "manual",
      label: "人工确认",
      icon: <UserCheck className="w-3.5 h-3.5" />,
      status:
        route.threeStepReview.manualConfirm.status === "confirmed"
          ? "completed"
          : route.threeStepReview.manualConfirm.status,
    },
  ];

  return (
    <div className="min-h-screen bg-industrial-bg">
      <header className="px-6 py-3 border-b border-industrial-border/60 flex items-center gap-4">
        <button
          onClick={() => navigate("/routes")}
          className="text-industrial-muted hover:text-industrial-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-status-warning" />
            <span className="font-mono text-sm font-bold text-industrial-text">
              {route.routeCode}
            </span>
            <RiskBadge level={route.riskLevel} />
            <div className="flex gap-1">
              {route.anomalyTypes.map((t) => (
                <AnomalyBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <div className="text-xs text-industrial-muted mt-0.5 truncate">
            {route.missionName}
          </div>
        </div>
        <button
          onClick={() => navigate(`/routes/${route.id}/review`)}
          className="btn btn-warning flex items-center gap-1.5"
        >
          <ScrollText className="w-3.5 h-3.5" />
          评审工作台
        </button>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        <div className="col-span-4 space-y-4">
          <div className="panel p-4">
            <div className="font-mono text-xs text-industrial-text mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-status-safe" />
              基础信息
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-industrial-muted">创建时间</span>
                <span className="font-mono text-industrial-text">{route.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">高度偏差</span>
                <span
                  className={`font-mono font-bold ${
                    route.heightDeviation > 15
                      ? "text-status-danger"
                      : route.heightDeviation > 8
                      ? "text-status-warning"
                      : "text-status-safe"
                  }`}
                >
                  {route.heightDeviation} 米
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">坐标点数</span>
                <span className="font-mono text-industrial-text">{route.coordinates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">剖面数据</span>
                <span className="font-mono text-industrial-text">{route.profileData.length} 点</span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">视角快照</span>
                <span className="font-mono text-industrial-text">{route.viewSnapshots.length} 个</span>
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <div className="font-mono text-xs text-industrial-text mb-3 flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-status-warning" />
              来源追溯链
            </div>
            <ol className="space-y-2">
              {route.sourceChain.map((src, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-industrial-bg border border-industrial-border flex items-center justify-center mt-0.5 shrink-0">
                    <span className="font-mono text-[10px] text-industrial-muted">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-industrial-text truncate font-mono">{src}</div>
                    <div className="text-industrial-muted text-[10px] mt-0.5">
                      {idx === 0 ? "原始数据" : idx === route.sourceChain.length - 1 ? "最终评估" : "中间产物"}
                    </div>
                  </div>
                  {idx < route.sourceChain.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-industrial-border mt-1" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="panel p-4">
            <div className="font-mono text-xs text-industrial-text mb-3 flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-status-warning" />
              状态时间线
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-status-safe mt-1.5 shrink-0" />
                <div>
                  <div className="text-industrial-text">数据导入</div>
                  <div className="text-industrial-muted text-[10px]">{route.createdAt}</div>
                </div>
              </div>
              {threeStepItems.map((item, idx) => (
                <div key={item.key} className="flex items-start gap-2 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      item.status === "completed" || item.status === "passed"
                        ? "bg-status-safe"
                        : item.status === "in_progress" || item.status === "running"
                        ? "bg-status-warning"
                        : "bg-industrial-border"
                    }`}
                  />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="text-industrial-text flex items-center gap-1.5">
                      {item.icon}
                      {item.label}
                    </div>
                    <StepStatusBadge
                      status={item.status}
                      okLabel="完成"
                      notLabel="未开始"
                      runLabel="进行中"
                      failLabel="失败"
                    />
                  </div>
                </div>
              ))}
              {route.status === "all_completed" && (
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-status-safe mt-1.5 shrink-0" />
                  <div>
                    <div className="text-industrial-text">全部复核完成</div>
                    <div className="text-industrial-muted text-[10px]">可提交评审会</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          <div className="panel p-4">
            <div className="font-mono text-xs text-industrial-text mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-status-warning" />
                高度剖切图
              </div>
              {compareViewId && (
                <span className="flex items-center gap-1 text-[10px] text-status-safe">
                  <ArrowLeftRight className="w-3 h-3" />
                  双视角对比模式
                </span>
              )}
            </div>
            <ProfileChart
              data={route.profileData}
              savedSnapshots={route.viewSnapshots}
              currentSnapshotId={route.currentViewId}
              compareSnapshotId={compareViewId}
              onSaveSnapshot={handleSaveView}
              onSelectSnapshot={(sid) => setCurrentView(route.id, sid)}
              onToggleCompare={setCompareViewId}
              height={300}
            />
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs text-industrial-text flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-status-warning" />
                风险备注对比
              </div>
              <button
                onClick={() => setShowNoteEditor((v) => !v)}
                className="btn btn-default !py-1 !px-2 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                新增备注版本
              </button>
            </div>

            {showNoteEditor && (
              <div className="mb-4 p-3 bg-industrial-bg rounded border border-industrial-border/60">
                <div className="text-xs text-industrial-muted mb-2">新增风险备注版本</div>
                <textarea
                  className="input-field w-full h-20 mb-2 text-xs resize-none"
                  placeholder="输入风险评估说明..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-industrial-muted">结论：</span>
                    {(["safe", "warning", "dangerous", "pending"] as NoteConclusion[]).map((c) => (
                      <label
                        key={c}
                        className={`cursor-pointer tag ${
                          newNoteConclusion === c
                            ? c === "safe"
                              ? "bg-status-safe/20 border-status-safe/50 text-status-safe"
                              : c === "warning"
                              ? "bg-status-warning/20 border-status-warning/50 text-status-warning"
                              : c === "dangerous"
                              ? "bg-status-critical/20 border-status-critical/50 text-status-critical"
                              : "bg-status-pending/20 border-status-pending/50 text-status-pending"
                            : "bg-industrial-panel border-industrial-border text-industrial-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={newNoteConclusion === c}
                          onChange={() => setNewNoteConclusion(c)}
                        />
                        {c === "safe" ? "安全" : c === "warning" ? "告警" : c === "dangerous" ? "危险" : "待评"}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-default text-xs" onClick={() => setShowNoteEditor(false)}>
                      取消
                    </button>
                    <button className="btn btn-primary text-xs" onClick={handleAddNote}>
                      保存版本
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {prevNote && (
                <div className="bg-industrial-bg rounded border border-industrial-border/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="tag tag-pending font-mono text-[10px]">
                      旧版本 v{prevNote.version}
                    </span>
                    <ConclusionBadge conclusion={prevNote.conclusion} />
                  </div>
                  <div className="text-[11px] text-industrial-text leading-relaxed whitespace-pre-wrap">
                    {prevNote.content}
                  </div>
                  <div className="mt-2 pt-2 border-t border-industrial-border/50 text-[10px] text-industrial-muted flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {prevNote.createdBy}
                    <Clock className="w-3 h-3 ml-1" />
                    {prevNote.createdAt}
                  </div>
                </div>
              )}
              <div
                className={`rounded border p-3 ${
                  prevNote
                    ? "bg-status-warning/5 border-status-warning/30"
                    : "bg-industrial-bg border-industrial-border/60 col-span-2"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="tag tag-warning font-mono text-[10px]">
                    当前版本 v{currentNote?.version}
                  </span>
                  <ConclusionBadge conclusion={currentNote?.conclusion || "pending"} />
                </div>
                <div className="text-[11px] text-industrial-text leading-relaxed whitespace-pre-wrap">
                  {currentNote?.content}
                </div>
                <div className="mt-2 pt-2 border-t border-industrial-border/50 text-[10px] text-industrial-muted flex items-center gap-2">
                  <User className="w-3 h-3" />
                  {currentNote?.createdBy}
                  <Clock className="w-3 h-3 ml-1" />
                  {currentNote?.createdAt}
                </div>
              </div>
            </div>

            {prevNote && prevNote.conclusion !== currentNote?.conclusion && (
              <div className="mt-3 px-3 py-2 bg-status-danger/10 border border-status-danger/30 rounded text-[11px] text-status-danger flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">结论变更检测</div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    结论从「
                    {prevNote.conclusion === "safe"
                      ? "安全"
                      : prevNote.conclusion === "warning"
                      ? "告警"
                      : prevNote.conclusion === "dangerous"
                      ? "危险"
                      : "待评"}
                    」变更为「
                    {currentNote?.conclusion === "safe"
                      ? "安全"
                      : currentNote?.conclusion === "warning"
                      ? "告警"
                      : currentNote?.conclusion === "dangerous"
                      ? "危险"
                      : "待评"}
                    」，请在评审会上说明影响范围。
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs text-industrial-text flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-status-safe" />
                处理意见
              </div>
            </div>
            <div className="space-y-2 mb-3">
              {route.handlingOpinions.map((op) => (
                <div
                  key={op.id}
                  className={`rounded border p-3 ${
                    op.type === "auto_suggestion"
                      ? "bg-industrial-bg border-industrial-border/60"
                      : "bg-status-safe/5 border-status-safe/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`tag font-mono text-[10px] ${
                          op.type === "auto_suggestion" ? "tag-pending" : "tag-safe"
                        }`}
                      >
                        {op.type === "auto_suggestion" ? "系统建议" : "人工输入"}
                      </span>
                      <span className="text-[10px] text-industrial-muted">
                        {op.createdBy} · {op.createdAt}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        disabled={op.status !== "proposed"}
                        onClick={() => updateOpinionStatus(route.id, op.id, "accepted")}
                        className="text-[10px] px-1.5 py-0.5 rounded text-status-safe hover:bg-status-safe/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                        采纳
                      </button>
                      <button
                        disabled={op.status !== "proposed"}
                        onClick={() => updateOpinionStatus(route.id, op.id, "rejected")}
                        className="text-[10px] px-1.5 py-0.5 rounded text-status-danger hover:bg-status-danger/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-3 h-3 inline mr-0.5" />
                        驳回
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-industrial-text leading-relaxed">
                    {op.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newOpinion}
                onChange={(e) => setNewOpinion(e.target.value)}
                placeholder="输入人工处理意见..."
                className="input-field flex-1 !py-1.5 text-xs"
              />
              <button onClick={handleAddOpinion} className="btn btn-primary text-xs">
                <Plus className="w-3 h-3 inline mr-1" />
                添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
