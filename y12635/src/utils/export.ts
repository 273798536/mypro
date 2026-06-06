import type { Project, ExportResult, Issue } from "../types";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "../types";

interface ExportableMove {
  order: number;
  coordinate: string;
  player: "black" | "white";
  status: string;
  statusLabel: string;
  statusColor: string;
  layer: string;
  note?: string;
  timestamp: string;
  needsReview: boolean;
}

interface ExportableLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

interface ExportableIssue {
  type: string;
  severity: string;
  message: string;
  actionable: string;
}

interface ExportPayload {
  projectId: string;
  projectName: string;
  projectStatus: string;
  projectStatusLabel: string;
  projectStatusColor: string;
  boardSize: number;
  exportedAt: string;
  summary: {
    totalMoves: number;
    confirmedMoves: number;
    pendingMoves: number;
    errorMoves: number;
    undoneMoves: number;
    canUseDirectly: boolean;
    needsMapEditorReview: boolean;
  };
  colorRules: {
    confirmed: { label: string; color: string };
    pending: { label: string; color: string };
    error: { label: string; color: string };
    info: { label: string; color: string };
  };
  layers: ExportableLayer[];
  moves: ExportableMove[];
  issues: ExportableIssue[];
  reviewInstructions: string[];
}

export function buildExportPayload(project: Project): ExportPayload {
  const validMoves = project.moves.filter((m) => m.status !== "undone");
  const confirmedMoves = validMoves.filter(
    (m) => m.status === "confirmed" || m.status === "normal"
  );
  const pendingMoves = validMoves.filter((m) => m.status === "pending");
  const errorMoves = validMoves.filter((m) => m.status === "boundary_error");
  const undoneMoves = project.moves.filter((m) => m.status === "undone");

  const canUseDirectly =
    errorMoves.length === 0 && pendingMoves.length === 0;
  const needsMapEditorReview =
    errorMoves.length > 0 || pendingMoves.length > 0;

  const layerMap = new Map(project.layers.map((l) => [l.id, l]));

  const moves: ExportableMove[] = project.moves
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const layer = layerMap.get(m.layerId);
      return {
        order: m.order,
        coordinate: `(${m.x}, ${m.y})`,
        player: m.player,
        status: m.status,
        statusLabel: STATUS_LABELS[m.status],
        statusColor: STATUS_COLORS[m.status],
        layer: layer?.name ?? "未知图层",
        note: m.note,
        timestamp: new Date(m.timestamp).toISOString(),
        needsReview: m.status === "pending" || m.status === "boundary_error",
      };
    });

  const instructions: string[] = [];
  if (canUseDirectly) {
    instructions.push(
      "✅ 所有落子均已确认，可直接用于训练数据。"
    );
  }
  if (pendingMoves.length > 0) {
    instructions.push(
      `⚠️ 有 ${pendingMoves.length} 手状态为「待确认」，需要训练员复核。`
    );
  }
  if (errorMoves.length > 0) {
    instructions.push(
      `❌ 有 ${errorMoves.length} 手存在越界错误，必须联系地图编辑修正后才能使用。`
    );
  }
  if (undoneMoves.length > 0) {
    instructions.push(
      `ℹ️ 另有 ${undoneMoves.length} 手已被撤销，不计入有效对局。`
    );
  }
  if (needsMapEditorReview) {
    instructions.push(
      "→ 需复核的条目在下方 moves 列表中已用 needsReview: true 标注。"
    );
  }

  return {
    projectId: project.id,
    projectName: project.name,
    projectStatus: project.status,
    projectStatusLabel: PROJECT_STATUS_LABELS[project.status],
    projectStatusColor: PROJECT_STATUS_COLORS[project.status],
    boardSize: project.boardSize,
    exportedAt: new Date().toISOString(),
    summary: {
      totalMoves: validMoves.length,
      confirmedMoves: confirmedMoves.length,
      pendingMoves: pendingMoves.length,
      errorMoves: errorMoves.length,
      undoneMoves: undoneMoves.length,
      canUseDirectly,
      needsMapEditorReview,
    },
    colorRules: {
      confirmed: { label: STATUS_LABELS.confirmed, color: STATUS_COLORS.confirmed },
      pending: { label: STATUS_LABELS.pending, color: STATUS_COLORS.pending },
      error: { label: STATUS_LABELS.boundary_error, color: STATUS_COLORS.boundary_error },
      info: { label: "正常/进行中", color: STATUS_COLORS.normal },
    },
    layers: project.layers.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      visible: l.visible,
    })),
    moves,
    issues: project.issues.map((i) => ({
      type: i.type,
      severity: i.severity,
      message: i.message,
      actionable: i.actionable,
    })),
    reviewInstructions: instructions,
  };
}

export function exportProjectToJSON(project: Project): ExportResult {
  try {
    if (!project) {
      return {
        status: "error",
        message: "导出失败：未找到当前复盘项目，请确认已从首页打开项目。",
      };
    }
    if (project.moves.length === 0) {
      return {
        status: "warning",
        message: "当前项目没有任何落子记录，导出文件将为空。请先添加落子，或使用示例项目。",
      };
    }

    const payload = buildExportPayload(project);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = project.name.replace(/[\\/:*?"<>|]/g, "_");
    const filename = `replay_${safeName}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const issues: Issue[] = [];
    if (payload.summary.errorMoves > 0) {
      issues.push({
        id: "export-error-warning",
        type: "other",
        severity: "error",
        message: `导出文件包含 ${payload.summary.errorMoves} 手越界错误`,
        actionable:
          "训练员请勿直接使用该文件，请联系地图编辑修正越界落子后再重新导出。",
      });
    }
    if (payload.summary.pendingMoves > 0) {
      issues.push({
        id: "export-pending-warning",
        type: "other",
        severity: "warning",
        message: `导出文件包含 ${payload.summary.pendingMoves} 手待确认的落子`,
        actionable:
          "训练员可先查看轨迹，将没问题的条目标记为已确认；存疑的条目请联系地图编辑复核。",
      });
    }

    if (issues.length > 0) {
      return {
        status: "warning",
        message: `已导出「${filename}」，但文件中存在需要注意的问题（详见下方）。`,
        filename,
        issues,
      };
    }

    return {
      status: "success",
      message: `已成功导出「${filename}」，所有落子状态均已确认，可直接用于训练。`,
      filename,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "error",
      message: `导出过程出现异常：${msg}。请检查浏览器是否允许下载文件，或尝试刷新页面后重试。`,
    };
  }
}

export function formatFriendlyError(
  err: unknown,
  context?: string
): { message: string; actionable: string } {
  const msg = err instanceof Error ? err.message : String(err ?? "未知错误");
  const ctx = context ? `（${context}）` : "";

  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return {
      message: `网络请求失败${ctx}`,
      actionable: "请检查网络连接是否正常，或确认本地素材文件路径是否存在。",
    };
  }
  if (msg.includes("JSON") && msg.includes("parse")) {
    return {
      message: `数据解析失败${ctx}`,
      actionable: "轨迹记录文件格式损坏，请联系地图编辑重新导出一份完整的 JSON 文件。",
    };
  }
  if (msg.includes("not found") || msg.includes("404")) {
    return {
      message: `资源不存在${ctx}`,
      actionable: "请确认所需轨迹记录或素材是否已放到工作目录，必要时联系地图编辑提供缺失文件。",
    };
  }
  return {
    message: `操作失败${ctx}：${msg}`,
    actionable:
      "如问题持续出现，请截图保存此提示，并联系维护人员提供以上错误信息以便排查。",
  };
}
