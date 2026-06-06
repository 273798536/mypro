import type { Annotation, TrajectoryRecord, Point } from "@/types";
import { getFlipExplanation } from "./flipExplanations";

function formatDate(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPoint(p: Point, scale: number): string {
  const px = p.x.toFixed(1);
  const py = p.y.toFixed(1);
  if (scale > 0) {
    const rx = (p.x / scale).toFixed(2);
    const ry = (p.y / scale).toFixed(2);
    return `(${px}px, ${py}px) ≈ (${rx}mm, ${ry}mm)`;
  }
  return `(${px}px, ${py}px)`;
}

function getAnnotationTypeLabel(type: Annotation["type"]): string {
  const map: Record<Annotation["type"], string> = {
    rectangle: "矩形标注",
    circle: "圆形标注",
    polygon: "多边形标注",
    freehand: "自由手绘",
  };
  return map[type];
}

function calculateBounds(annotation: Annotation): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  widthPx: number;
  heightPx: number;
  centerX: number;
  centerY: number;
} {
  const coords = annotation.coordinates;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  if (annotation.type === "circle" && coords.length >= 2) {
    const center = coords[0];
    const edge = coords[1];
    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
    );
    minX = center.x - radius;
    maxX = center.x + radius;
    minY = center.y - radius;
    maxY = center.y + radius;
  } else {
    for (const p of coords) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    widthPx: maxX - minX,
    heightPx: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function generateReportJSON(record: TrajectoryRecord): string {
  return JSON.stringify(record, null, 2);
}

export function generateReportText(record: TrajectoryRecord): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("         医学影像病灶描绘 - 标注审核报告");
  lines.push("=".repeat(60));
  lines.push("");

  lines.push(`【报告编号】${record.id}`);
  lines.push(`【轨迹名称】${record.name}`);
  lines.push(`【影像文件】${record.imageName || record.imageUrl}`);
  lines.push(`【创建时间】${formatDate(record.createdAt)}`);
  lines.push(`【更新时间】${formatDate(record.updatedAt)}`);
  lines.push("");

  lines.push("—".repeat(60));
  lines.push("一、比例尺信息");
  lines.push("—".repeat(60));
  lines.push(`  比例值：${record.scale.value} 像素/${record.scale.unit}`);
  if (record.scale.value > 0) {
    lines.push(`  换算关系：1 ${record.scale.unit} ≈ ${(1 / record.scale.value).toFixed(3)} 像素`);
  }
  lines.push("");

  if (record.isFlipped && record.flipType) {
    const explanation = getFlipExplanation(record.flipType);
    lines.push("—".repeat(60));
    lines.push("二、坐标变换说明（重要）");
    lines.push("—".repeat(60));
    lines.push(`  变换类型：${explanation?.title || record.flipType}`);
    lines.push(`  说明：${explanation?.detail || ""}`);
    lines.push("");
    lines.push("  详细解释：");
    lines.push(`  ${explanation?.copyText || ""}`);
    lines.push("");
    if (record.flipReason) {
      lines.push(`  操作原因：${record.flipReason}`);
    }
    lines.push("");
  }

  lines.push("—".repeat(60));
  lines.push(`三、病灶标注统计（共 ${record.annotations.length} 处）`);
  lines.push("—".repeat(60));
  lines.push("");

  if (record.annotations.length === 0) {
    lines.push("  （暂无标注）");
  } else {
    record.annotations.forEach((ann, idx) => {
      const bounds = calculateBounds(ann);
      lines.push(`  【标注 ${idx + 1}】`);
      lines.push(`    类型：${getAnnotationTypeLabel(ann.type)}`);
      lines.push(`    标签：${ann.label || "未分类"}`);
      lines.push(`    颜色：${ann.color}`);
      lines.push(`    吸附网格：${ann.isSnapped ? "是" : "否"}`);
      lines.push(`    创建时间：${formatDate(ann.createdAt)}`);
      lines.push(
        `    边界框：X: ${bounds.minX.toFixed(1)} ~ ${bounds.maxX.toFixed(1)} px, ` +
          `Y: ${bounds.minY.toFixed(1)} ~ ${bounds.maxY.toFixed(1)} px`
      );
      lines.push(
        `    尺寸：宽 ${bounds.widthPx.toFixed(1)} px × 高 ${bounds.heightPx.toFixed(1)} px`
      );
      if (record.scale.value > 0) {
        const wMm = (bounds.widthPx / record.scale.value).toFixed(2);
        const hMm = (bounds.heightPx / record.scale.value).toFixed(2);
        lines.push(`    实际尺寸：宽 ${wMm} mm × 高 ${hMm} mm`);
      }
      lines.push(`    中心点：${formatPoint({ x: bounds.centerX, y: bounds.centerY }, record.scale.value)}`);
      lines.push(`    坐标点数：${ann.coordinates.length}`);
      lines.push(`    原始坐标（底图）：`);
      ann.originalCoords.forEach((p, i) => {
        lines.push(`      点${i + 1}: ${formatPoint(p, record.scale.value)}`);
      });
      lines.push("");
    });
  }

  lines.push("—".repeat(60));
  lines.push(`四、操作历史记录（共 ${record.operations.length} 条）`);
  lines.push("—".repeat(60));
  lines.push("");

  if (record.operations.length === 0) {
    lines.push("  （暂无操作记录）");
  } else {
    record.operations.forEach((op, idx) => {
      lines.push(`  ${idx + 1}. [${formatDate(op.timestamp)}] ${op.description}`);
    });
  }

  lines.push("");
  lines.push("=".repeat(60));
  lines.push("                   报告结束");
  lines.push("=".repeat(60));

  return lines.join("\n");
}

export function generateReportHTML(record: TrajectoryRecord): string {
  const explanation = record.isFlipped && record.flipType ? getFlipExplanation(record.flipType) : null;

  const annotationsHTML = record.annotations
    .map((ann, idx) => {
      const bounds = calculateBounds(ann);
      const coordsList = ann.originalCoords
        .map(
          (p, i) =>
            `<li>点${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) px${
              record.scale.value > 0
                ? ` ≈ (${(p.x / record.scale.value).toFixed(2)}, ${(p.y / record.scale.value).toFixed(2)}) mm`
                : ""
            }</li>`
        )
        .join("");

      return `
        <div class="annotation-card">
          <h3>标注 ${idx + 1} - ${ann.label || "未分类"}</h3>
          <div class="annotation-meta">
            <span class="badge" style="background:${ann.color}22;color:${ann.color}">● ${getAnnotationTypeLabel(ann.type)}</span>
            ${ann.isSnapped ? '<span class="badge badge-info">已吸附网格</span>' : ""}
            <span class="badge badge-time">${formatDate(ann.createdAt)}</span>
          </div>
          <table class="data-table">
            <tr><td>边界框</td><td>X: ${bounds.minX.toFixed(1)} ~ ${bounds.maxX.toFixed(1)} px | Y: ${bounds.minY.toFixed(1)} ~ ${bounds.maxY.toFixed(1)} px</td></tr>
            <tr><td>像素尺寸</td><td>宽 ${bounds.widthPx.toFixed(1)} px × 高 ${bounds.heightPx.toFixed(1)} px</td></tr>
            ${
              record.scale.value > 0
                ? `<tr><td>实际尺寸</td><td>宽 ${(bounds.widthPx / record.scale.value).toFixed(2)} mm × 高 ${(bounds.heightPx / record.scale.value).toFixed(2)} mm</td></tr>`
                : ""
            }
            <tr><td>中心点</td><td>(${bounds.centerX.toFixed(1)}, ${bounds.centerY.toFixed(1)}) px</td></tr>
          </table>
          <div class="coords-list">
            <strong>底图原始坐标（共 ${ann.coordinates.length} 个点）：</strong>
            <ol>${coordsList}</ol>
          </div>
        </div>
      `;
    })
    .join("");

  const operationsHTML = record.operations
    .map(
      (op, idx) =>
        `<li><span class="op-idx">${idx + 1}.</span><span class="op-time">[${formatDate(op.timestamp)}]</span><span class="op-desc">${op.description}</span></li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>医学影像病灶描绘 - 标注审核报告</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Source Han Sans CN", "PingFang SC", "Microsoft YaHei", sans-serif;
    max-width: 960px;
    margin: 40px auto;
    padding: 0 24px;
    color: #1f2937;
    background: #f9fafb;
    line-height: 1.7;
  }
  .header {
    background: linear-gradient(135deg, #165DFF, #3B82F6);
    color: white;
    padding: 32px;
    border-radius: 16px;
    margin-bottom: 28px;
  }
  .header h1 { margin: 0 0 8px; font-size: 26px; }
  .header p { margin: 0; opacity: 0.9; }
  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .section h2 {
    margin: 0 0 16px;
    font-size: 18px;
    color: #165DFF;
    border-bottom: 2px solid #EFF6FF;
    padding-bottom: 8px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
  }
  .info-grid div { font-size: 14px; }
  .info-grid strong { color: #4b5563; }
  .flip-alert {
    background: #FFF7ED;
    border-left: 4px solid #FF7D00;
    padding: 16px 20px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 16px;
  }
  .flip-alert h3 { margin: 0 0 8px; color: #C2410C; font-size: 16px; }
  .flip-alert p { margin: 0; color: #7C2D12; font-size: 14px; }
  .copy-box {
    background: #fff;
    border: 1px solid #FED7AA;
    border-radius: 8px;
    padding: 14px 16px;
    margin-top: 10px;
    font-size: 14px;
    color: #431407;
  }
  .annotation-card {
    background: #f9fafb;
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 14px;
    border: 1px solid #e5e7eb;
  }
  .annotation-card h3 { margin: 0 0 10px; font-size: 16px; color: #1f2937; }
  .annotation-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    background: #EFF6FF;
    color: #165DFF;
  }
  .badge-info { background: #ECFDF5; color: #00B42A; }
  .badge-time { background: #f3f4f6; color: #6b7280; }
  .data-table { width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 10px; }
  .data-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  .data-table td:first-child {
    color: #6b7280;
    width: 120px;
  }
  .coords-list ol {
    margin: 8px 0 0;
    padding-left: 20px;
    font-size: 13px;
    color: #4b5563;
  }
  .op-list { list-style: none; padding: 0; margin: 0; }
  .op-list li {
    display: flex;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
    font-size: 14px;
  }
  .op-idx { color: #9ca3af; width: 28px; }
  .op-time { color: #6b7280; white-space: nowrap; }
  .op-desc { color: #1f2937; flex: 1; }
  .footer {
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
    padding: 20px 0;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>医学影像病灶描绘 - 标注审核报告</h1>
    <p>报告编号：${record.id}</p>
  </div>

  <div class="section">
    <h2>一、基本信息</h2>
    <div class="info-grid">
      <div><strong>轨迹名称：</strong>${record.name}</div>
      <div><strong>影像文件：</strong>${record.imageName || record.imageUrl}</div>
      <div><strong>创建时间：</strong>${formatDate(record.createdAt)}</div>
      <div><strong>更新时间：</strong>${formatDate(record.updatedAt)}</div>
      <div><strong>比例尺：</strong>${record.scale.value} 像素/${record.scale.unit}</div>
      <div><strong>标注总数：</strong>${record.annotations.length} 处</div>
    </div>
  </div>

  ${
    record.isFlipped && explanation
      ? `<div class="section">
        <h2>二、坐标变换说明（重要）</h2>
        <div class="flip-alert">
          <h3>⚠️ ${explanation.title}</h3>
          <p>${explanation.detail}</p>
          <div class="copy-box">${explanation.copyText}</div>
        </div>
        ${record.flipReason ? `<p><strong>操作原因：</strong>${record.flipReason}</p>` : ""}
      </div>`
      : ""
  }

  <div class="section">
    <h2>${record.isFlipped ? "三" : "二"}、病灶标注详情</h2>
    ${record.annotations.length === 0 ? "<p style='color:#6b7280'>（暂无标注）</p>" : annotationsHTML}
  </div>

  <div class="section">
    <h2>${record.isFlipped ? "四" : "三"}、操作历史记录</h2>
    <ol class="op-list">
      ${record.operations.length === 0 ? '<li style="color:#6b7280">（暂无操作记录）</li>' : operationsHTML}
    </ol>
  </div>

  <div class="footer">
    报告由 医学影像病灶描绘系统 自动生成 · ${formatDate(new Date().toISOString())}
  </div>
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
