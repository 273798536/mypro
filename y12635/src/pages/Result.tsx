import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReplayStore } from "../store/useReplayStore";
import { IssueList } from "../components/Feedback";
import { Board } from "../components/Board";
import { buildExportPayload, exportProjectToJSON } from "../utils/export";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../types";
import type { ProjectStatus } from "../types";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Flag,
  Check,
  Clock,
  Edit3,
  ThumbsUp,
  Users,
  FileJson,
} from "lucide-react";
import { cn } from "../lib/utils";

function StatusBadge({ status }: { status: ProjectStatus }) {
  const label = PROJECT_STATUS_LABELS[status];
  const color = PROJECT_STATUS_COLORS[status];
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "error"
      ? XCircle
      : status === "pending_review"
      ? AlertTriangle
      : Clock;
  return (
    <span
      className="badge !text-sm !py-1.5 !px-3"
      style={{
        backgroundColor: `${color}15`,
        color,
        boxShadow: `inset 0 0 0 1.5px ${color}55`,
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}

export function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, loadProjects, validateProject, updateProjectStatus } =
    useReplayStore();

  useEffect(() => {
    if (projects.length === 0) {
      loadProjects();
    }
  }, [projects.length, loadProjects]);

  const project = projects.find((p) => p.id === id);

  const issues = useMemo(() => {
    if (!id) return [];
    return validateProject(id);
  }, [id, validateProject, projects]);

  const summary = useMemo(() => {
    if (!project) return null;
    return buildExportPayload(project);
  }, [project]);

  if (!project || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🫥</div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            未找到复盘项目
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            项目 ID「{id}」不存在，或尚未完成编辑。
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const canUseDirectly = summary.summary.canUseDirectly;
  const needsReview = summary.summary.needsMapEditorReview;

  const handleExport = () => {
    exportProjectToJSON(project);
  };

  const handleMarkComplete = () => {
    updateProjectStatus(project.id, "completed");
  };

  const handleMarkPending = () => {
    updateProjectStatus(project.id, "pending_review");
  };

  const handleBackEdit = () => {
    navigate(`/editor/${project.id}`);
  };

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <button onClick={handleBackEdit} className="btn-ghost !px-2.5 !py-1.5">
            <ArrowLeft className="w-4 h-4" />
            返回编辑
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              复盘结算 · {project.name}
            </h1>
            <p className="text-[11px] text-slate-500">
              导出内容与本页状态完全一致，可放心交付训练或复核
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <section
          className={cn(
            "rounded-2xl p-6 border transition-all",
            canUseDirectly
              ? "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-200"
              : "bg-gradient-to-br from-amber-50 via-white to-red-50/40 border-amber-200"
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md",
                canUseDirectly
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-500 text-white"
              )}
            >
              {canUseDirectly ? (
                <ThumbsUp className="w-7 h-7" />
              ) : (
                <Users className="w-7 h-7" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {canUseDirectly ? "可以直接用于训练 ✅" : "请先复核再使用 ⚠️"}
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {canUseDirectly
                  ? "所有落子状态均已确认，无越界错误，导出文件可直接进入训练流程。"
                  : "当前存在需要复核的内容，已在下方问题清单中逐条标注。训练员请勿直接使用，请联系地图编辑修正后再导出。"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  {canUseDirectly ? (
                    <span className="badge-success">
                      <Check className="w-3 h-3" />
                      训练员可直接使用
                    </span>
                  ) : (
                    <span className="badge-warning">
                      <Users className="w-3 h-3" />
                      需地图编辑复核
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "有效落子",
              value: summary.summary.totalMoves,
              icon: Flag,
              color: "text-blue-600",
              bg: "bg-blue-50",
              ring: "ring-blue-100",
            },
            {
              label: "已确认",
              value: summary.summary.confirmedMoves,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              ring: "ring-emerald-100",
            },
            {
              label: "待确认",
              value: summary.summary.pendingMoves,
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-50",
              ring: "ring-amber-100",
            },
            {
              label: "越界错误",
              value: summary.summary.errorMoves,
              icon: XCircle,
              color: "text-red-600",
              bg: "bg-red-50",
              ring: "ring-red-100",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`card p-4 ring-1 ${item.ring}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.bg}`}
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary-700 rounded-full" />
              棋盘总览
            </h3>
            <div className="flex justify-center">
              <Board
                size={project.boardSize}
                moves={project.moves}
                layers={project.layers}
                selectedMoveId={null}
                interactive={false}
                cellSize={36}
              />
            </div>
          </div>

          <div className="lg:col-span-2 card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-accent-600 rounded-full" />
                颜色规则（与导出 JSON 一致）
              </h3>
              <div className="space-y-2">
                {(["confirmed", "pending", "boundary_error", "normal"] as const).map(
                  (k) => (
                    <div
                      key={k}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: STATUS_COLORS[k] }}
                      />
                      <span className="text-slate-700 font-medium">
                        {STATUS_LABELS[k]}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {STATUS_COLORS[k]}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-700 rounded-full" />
                操作
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="btn-primary w-full justify-start"
                >
                  <Download className="w-4 h-4" />
                  导出 JSON（含状态标识）
                </button>
                <button
                  onClick={handleBackEdit}
                  className="btn-secondary w-full justify-start"
                >
                  <Edit3 className="w-4 h-4" />
                  返回编辑页继续修改
                </button>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleMarkComplete}
                    className="btn-ghost flex-1 !text-emerald-700 hover:!bg-emerald-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    标记已完成
                  </button>
                  <button
                    onClick={handleMarkPending}
                    className="btn-ghost flex-1 !text-amber-700 hover:!bg-amber-50"
                  >
                    <Clock className="w-4 h-4" />
                    标记待复核
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-red-500 rounded-full" />
              问题清单
              {issues.length > 0 && (
                <span className="badge-error">{issues.length}</span>
              )}
            </h3>
            <span className="text-[11px] text-slate-400">
              每条问题都附带可操作的处理建议
            </span>
          </div>
          {issues.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                没有发现问题 🎉
              </p>
              <p className="text-xs text-slate-500 mt-1">
                所有落子均已确认且坐标合法，可放心使用。
              </p>
            </div>
          ) : (
            <IssueList issues={issues} />
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary-700 rounded-full" />
              轨迹摘要（与导出文件 moves 字段一致）
            </h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <FileJson className="w-3 h-3" />
              needsReview=true 的条目需复核
            </span>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left py-2 px-3 font-medium">手数</th>
                  <th className="text-left py-2 px-3 font-medium">坐标</th>
                  <th className="text-left py-2 px-3 font-medium">方</th>
                  <th className="text-left py-2 px-3 font-medium">状态</th>
                  <th className="text-left py-2 px-3 font-medium">图层</th>
                  <th className="text-left py-2 px-3 font-medium">复核</th>
                </tr>
              </thead>
              <tbody>
                {summary.moves
                  .filter((m) => m.status !== "undone")
                  .map((m) => (
                    <tr
                      key={`${m.order}-${m.coordinate}`}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                        m.needsReview && "bg-amber-50/40"
                      )}
                    >
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                        {m.order}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {m.coordinate}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            "inline-flex w-4 h-4 rounded-full ring-1 ring-slate-300",
                            m.player === "black"
                              ? "bg-slate-800"
                              : "bg-white"
                          )}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="badge !text-[10px] !py-0.5"
                          style={{
                            backgroundColor: `${m.statusColor}15`,
                            color: m.statusColor,
                            boxShadow: `inset 0 0 0 1px ${m.statusColor}40`,
                          }}
                        >
                          {m.statusLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{m.layer}</td>
                      <td className="py-2 px-3">
                        {m.needsReview ? (
                          <span className="badge-warning">
                            <Users className="w-3 h-3" />
                            需复核
                          </span>
                        ) : (
                          <span className="badge-success">
                            <Check className="w-3 h-3" />
                            可用
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5 bg-gradient-to-br from-primary-50/30 to-white">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-accent-600 rounded-full" />
            训练员使用建议
          </h3>
          <ul className="text-sm text-slate-700 space-y-2">
            {summary.reviewInstructions.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-600 flex-shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
