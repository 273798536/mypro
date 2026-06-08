import type { Project } from "@/types";
import { COLLISION_TYPE_EXPLANATIONS, SEVERITY_LABELS } from "./explanations";

export function generateReport(project: Project): string {
  const pendingCount = project.collisions.filter((c) => c.status === "pending").length;
  const reviewedCount = project.collisions.filter((c) => c.status === "reviewed").length;
  const highCount = project.collisions.filter((c) => c.severity === "high").length;
  const mediumCount = project.collisions.filter((c) => c.severity === "medium").length;
  const lowCount = project.collisions.filter((c) => c.severity === "low").length;

  const date = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let report = `
═══════════════════════════════════════════════════
          城市风廊规划体块沙盘检测报告
═══════════════════════════════════════════════════

报告生成时间：${date}
项目名称：${project.name}

一、总体检测结论
───────────────────────────────────────────────────
本次共检测 ${project.blocks.length} 个建筑体块，${project.corridors.length} 条风廊路径。
累计发现 ${project.collisions.length} 项规划问题，其中：
  · 严重问题：${highCount} 项（需立即调整）
  · 中等问题：${mediumCount} 项（建议优化）
  · 轻微问题：${lowCount} 项（可择机处理）
  · 已复核：${reviewedCount} 项
  · 待处理：${pendingCount} 项

${
  pendingCount === 0
    ? "✅ 当前所有问题均已复核通过，方案整体符合城市风廊规划要求。"
    : "⚠️  仍有 " + pendingCount + " 项问题待复核，建议施工交底前完成调整。"
}

二、问题详细说明
───────────────────────────────────────────────────
`;

  if (project.collisions.length === 0) {
    report += `
  本次检测未发现体块碰撞或风廊违规问题，规划方案整体合规。
`;
  } else {
    project.collisions.forEach((col, idx) => {
      const blockAName = project.blocks.find((b) => b.id === col.blockA)?.name || col.blockA;
      const blockBName =
        project.blocks.find((b) => b.id === col.blockB)?.name ||
        project.corridors.find((c) => c.id === col.blockB)?.name ||
        col.blockB;

      report += `
【问题${idx + 1}】${SEVERITY_LABELS[col.severity]}级别
  类型：${COLLISION_TYPE_EXPLANATIONS[col.collisionType].split("：")[0]}
  涉及对象：${blockAName} ↔ ${blockBName}
  位置坐标：X=${col.coordinates.x.toFixed(1)}m, Y=${col.coordinates.y.toFixed(1)}m, Z=${col.coordinates.z.toFixed(1)}m
  说明：${col.description}
  解释：${COLLISION_TYPE_EXPLANATIONS[col.collisionType].split("：")[1] || COLLISION_TYPE_EXPLANATIONS[col.collisionType]}
  状态：${col.status === "pending" ? "待复核" : "已复核"}
${
  col.review
    ? `  复核人：${col.review.reviewer}（${new Date(col.review.reviewedAt).toLocaleDateString("zh-CN")}）
  复核意见：${col.review.opinion}
  ${col.review.approved ? "✅ 复核通过" : "❌ 需调整"}`
    : ""
}
`;
    });
  }

  report += `
三、风廊参数配置摘要
───────────────────────────────────────────────────
`;

  project.corridors.forEach((c) => {
    report += `
  ${c.name}：
    宽度：${c.width} 米
    高度：${c.height} 米
    偏角：${c.angle}°
`;
  });

  report += `
四、操作追溯与历史
───────────────────────────────────────────────────
`;

  project.history.slice(-10).forEach((log) => {
    const time = new Date(log.timestamp).toLocaleString("zh-CN");
    report += `
  [${time}] ${log.operator} - ${log.description}
${
  log.snapshot.coordinates
    ? `    坐标快照：X=${log.snapshot.coordinates.x.toFixed(1)}, Y=${log.snapshot.coordinates.y.toFixed(1)}, Z=${log.snapshot.coordinates.z.toFixed(1)}`
    : ""
}
`;
  });

  report += `
═══════════════════════════════════════════════════
报告结束
═══════════════════════════════════════════════════
`;

  return report.trim();
}
