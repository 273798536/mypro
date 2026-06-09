import type { ScreenshotExport, Judgment, MeasurementRecord } from "@/types";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildTraceInfo(
  sceneName: string,
  cutAxis: string,
  cutValue: number,
  record?: MeasurementRecord | null,
): string {
  const parts: string[] = [];
  parts.push(`场景: ${sceneName}`);
  parts.push(`剖切: ${cutAxis.toUpperCase()} = ${cutValue.toFixed(3)}`);
  if (record) {
    parts.push(`来源表: ${record.sourceTableName}`);
    parts.push(`行号: L${record.sourceLineNumber}`);
    parts.push(`图像: ${record.sourceImageName}`);
    if (record.remark) parts.push(`备注: ${record.remark}`);
  }
  parts.push(`导出时间: ${new Date().toLocaleString("zh-CN")}`);
  return parts.join("\n");
}

export function exportCanvasWithWatermark(
  canvas: HTMLCanvasElement,
  traceInfo: string,
): string {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height + 90;
  const ctx = out.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  ctx.fillStyle = "#0A1A2E";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);

  ctx.fillStyle = "rgba(212, 168, 83, 0.95)";
  ctx.fillRect(0, canvas.height, out.width, 90);

  ctx.fillStyle = "#0A1A2E";
  ctx.font = '600 13px "JetBrains Mono", monospace';
  const lines = traceInfo.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 16, canvas.height + 22 + i * 18);
  });

  ctx.font = '700 11px "Noto Serif SC", serif';
  ctx.fillText("油气储层孔隙漫游 · 溯源凭证", out.width - 200, canvas.height + 78);

  return out.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function createScreenshot(
  sessionId: string,
  canvas: HTMLCanvasElement,
  traceInfo: string,
  judgmentId?: string,
): ScreenshotExport {
  const dataUrl = exportCanvasWithWatermark(canvas, traceInfo);
  return {
    id: makeId("shot"),
    sessionId,
    judgmentId: judgmentId || null,
    dataUrl,
    traceInfo,
  };
}
