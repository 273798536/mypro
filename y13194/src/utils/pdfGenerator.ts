import jsPDF from "jspdf";
import type { BatteryCell, JumpDetection, Remark, ReportConfig, SensorLogEntry } from "@/types";

const COLORS = {
  primary: [0, 212, 170] as [number, number, number],
  alert: [255, 71, 87] as [number, number, number],
  amber: [255, 165, 2] as [number, number, number],
  aurora: [123, 44, 191] as [number, number, number],
  dark: [10, 22, 40] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  subtle: [100, 116, 139] as [number, number, number],
  border: [30, 58, 92] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  zebraBg: [241, 245, 249] as [number, number, number],
};

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtFullDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("zh-CN") + " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

interface GenerateReportOptions {
  report: ReportConfig;
  cells: BatteryCell[];
  logs: SensorLogEntry[];
  remarks: Remark[];
  jumps: JumpDetection[];
}

export async function generateReportPDF(opts: GenerateReportOptions): Promise<Blob> {
  const { report, cells, logs, remarks, jumps } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = 14;
  const colW = pageW - marginL - marginR;
  let y = 16;
  let pageNo = 1;

  const checkPage = (need: number) => {
    if (y + need > pageH - 20) {
      doc.addPage();
      pageNo += 1;
      y = 16;
      drawHeader(doc, pageW, pageNo, report.name);
      drawFooter(doc, pageW, pageH, pageNo);
      y = 24;
    }
  };

  const drawHeader = (d: jsPDF, pw: number, pno: number, title: string) => {
    d.setFillColor(...COLORS.primary);
    d.rect(0, 0, pw, 6, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.setTextColor(...COLORS.dark);
    d.text(title, marginL, 12);
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(...COLORS.subtle);
    d.text("BR·Analyzer 电池内阻报告导出系统", pw - marginR, 12, { align: "right" });
  };

  const drawFooter = (d: jsPDF, pw: number, ph: number, pno: number) => {
    d.setDrawColor(...COLORS.border);
    d.setLineWidth(0.1);
    d.line(marginL, ph - 12, pw - marginR, ph - 12);
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(...COLORS.subtle);
    d.text(`生成时间：${fmtFullDate(Date.now())}`, marginL, ph - 7);
    d.text(`第 ${pno} 页`, pw - marginR, ph - 7, { align: "right" });
  };

  drawHeader(doc, pageW, pageNo, report.name);
  drawFooter(doc, pageW, pageH, pageNo);

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.dark);
  doc.text("电池内阻检测报告", marginL, y + 4);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.subtle);
  doc.text(`报告编号：${report.id.toUpperCase()}`, marginL, y + 2);
  y += 5;

  // Info table
  const infoRows = [
    ["报告名称", report.name],
    ["模板类型", report.template === "standard" ? "标准报告" : report.template === "simplified" ? "精简报告" : "含历史版报告"],
    ["创建人", report.createdBy],
    ["创建时间", fmtFullDate(report.createdAt)],
    ["时间范围", `${fmtFullDate(report.timeRange.start)} ~ ${fmtFullDate(report.timeRange.end)}`],
    ["包含异常", report.includeAnomalies ? "是" : "否（已过滤）"],
    ["包含历史", report.includeHistory ? "是" : "否"],
    ["电池单体数", `${report.batteryIds.length} 个`],
  ];
  const labelW = 26;
  infoRows.forEach((row, idx) => {
    checkPage(6);
    const odd = idx % 2 === 0;
    if (odd) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(marginL, y, colW, 6.2, "F");
    }
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.08);
    doc.rect(marginL, y, colW, 6.2);
    doc.rect(marginL, y, labelW, 6.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(row[0], marginL + 2, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(row[1], marginL + labelW + 2, y + 4);
    y += 6.2;
  });

  y += 3;
  checkPage(10);

  // Summary stats
  const allLogs = logs.filter(
    (l) => report.batteryIds.includes(l.batteryId) &&
      l.timestamp >= report.timeRange.start &&
      l.timestamp <= report.timeRange.end,
  );
  const normalLogs = allLogs.filter((l) => !l.isAnomaly);
  const anomalyLogs = allLogs.filter((l) => l.isAnomaly);
  const avgResistance = normalLogs.length
    ? normalLogs.reduce((sum, l) => {
        const v = l.unit === "μΩ" ? l.resistance / 1000 : l.unit === "Ω" ? l.resistance * 1000 : l.resistance;
        return sum + v;
      }, 0) / normalLogs.length
    : 0;
  const avgVoltage = normalLogs.length ? normalLogs.reduce((s, l) => s + l.voltage, 0) / normalLogs.length : 0;
  const avgTemp = normalLogs.length ? normalLogs.reduce((s, l) => s + l.temperature, 0) / normalLogs.length : 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("统计摘要", marginL, y);
  y += 5;

  const statCards = [
    { label: "正常记录", value: normalLogs.length.toString(), unit: "条", color: COLORS.primary },
    { label: "异常记录", value: anomalyLogs.length.toString(), unit: "条", color: COLORS.alert },
    { label: "平均内阻", value: avgResistance ? avgResistance.toFixed(3) : "-", unit: "mΩ", color: COLORS.primary },
    { label: "平均电压", value: avgVoltage ? avgVoltage.toFixed(3) : "-", unit: "V", color: COLORS.dark },
    { label: "平均温度", value: avgTemp ? avgTemp.toFixed(1) : "-", unit: "°C", color: COLORS.amber },
    { label: "检测单体", value: report.batteryIds.length.toString(), unit: "个", color: COLORS.aurora },
  ];
  const cardW = colW / 3;
  const cardH = 16;
  statCards.forEach((card, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const cx = marginL + col * cardW;
    const cy = y + row * (cardH + 2);
    checkPage(cardH + 2);
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.25);
    doc.setFillColor(...COLORS.white);
    doc.rect(cx + 0.8, cy, cardW - 1.6, cardH, "DF");
    doc.setFillColor(...card.color);
    doc.rect(cx + 0.8, cy, 1.2, cardH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.subtle);
    doc.text(card.label, cx + 4, cy + 5);
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.dark);
    doc.text(card.value, cx + 4, cy + 12);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.subtle);
    doc.text(card.unit, cx + cardW - 14, cy + 12);
  });
  y += Math.ceil(statCards.length / 3) * (cardH + 2) + 4;

  // Batteries list
  checkPage(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("参与检测的电池单体", marginL, y);
  y += 5;
  const batCols = ["编号", "位置", "型号", "标称内阻 (mΩ)", "状态"];
  const batColW = [28, 22, 42, 30, 30];
  const cellObjs = cells.filter((c) => report.batteryIds.includes(c.id));
  doc.setFillColor(...COLORS.primary);
  doc.rect(marginL, y, colW, 6.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  let bx = marginL + 1;
  batCols.forEach((c, i) => {
    doc.text(c, bx, y + 4.2);
    bx += batColW[i];
  });
  y += 6.2;
  cellObjs.forEach((c, idx) => {
    checkPage(6);
    if (idx % 2 === 1) {
      doc.setFillColor(...COLORS.zebraBg);
      doc.rect(marginL, y, colW, 6, "F");
    }
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.08);
    doc.rect(marginL, y, colW, 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    bx = marginL + 1;
    doc.text(c.code, bx, y + 4); bx += batColW[0];
    doc.text(`L${c.position.layer + 1}R${c.position.row + 1}C${c.position.col + 1}`, bx, y + 4); bx += batColW[1];
    doc.text(c.model, bx, y + 4); bx += batColW[2];
    doc.text(c.nominalResistance.toFixed(2), bx, y + 4); bx += batColW[3];
    const statusText = c.status === "normal" ? "正常" : c.status === "warning" ? "注意" : c.status === "anomaly" ? "异常" : "待审";
    doc.setTextColor(
      ...(c.status === "normal" ? COLORS.primary : c.status === "warning" ? COLORS.amber : c.status === "anomaly" ? COLORS.alert : COLORS.aurora)
    );
    doc.text(statusText, bx, y + 4);
    y += 6;
  });
  y += 4;

  // Sensor logs table
  checkPage(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("传感器日志数据（前 60 条）", marginL, y);
  y += 5;

  const logCols = ["电池", "时间", "内阻", "电压(V)", "温度(°C)", "方向", "状态"];
  const logColW = [18, 28, 24, 18, 20, 16, 22];
  doc.setFillColor(...COLORS.dark);
  doc.rect(marginL, y, colW, 6.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  bx = marginL + 1;
  logCols.forEach((c, i) => { doc.text(c, bx, y + 4.2); bx += logColW[i]; });
  y += 6.2;

  allLogs.slice(0, 60).forEach((l, idx) => {
    checkPage(6);
    if (l.isAnomaly) {
      doc.setFillColor(255, 235, 238);
      doc.rect(marginL, y, colW, 6, "F");
    } else if (idx % 2 === 1) {
      doc.setFillColor(...COLORS.zebraBg);
      doc.rect(marginL, y, colW, 6, "F");
    }
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.08);
    doc.rect(marginL, y, colW, 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    bx = marginL + 1;

    doc.setTextColor(...COLORS.text);
    doc.text(l.batteryCode, bx, y + 4); bx += logColW[0];
    doc.setTextColor(...COLORS.subtle);
    doc.text(fmtTime(l.timestamp), bx, y + 4); bx += logColW[1];
    doc.setTextColor(l.isAnomaly ? COLORS.alert[0] : COLORS.text[0], l.isAnomaly ? COLORS.alert[1] : COLORS.text[1], l.isAnomaly ? COLORS.alert[2] : COLORS.text[2]);
    doc.text(`${l.resistance}${l.unit}`, bx, y + 4); bx += logColW[2];
    doc.setTextColor(...COLORS.text);
    doc.text(l.voltage.toFixed(3), bx, y + 4); bx += logColW[3];
    const tColor = l.temperature > 28 ? COLORS.amber : COLORS.text;
    doc.setTextColor(...tColor);
    doc.text(l.temperature.toFixed(1), bx, y + 4); bx += logColW[4];
    const dirColor = l.directionSign === "reversed" ? COLORS.alert : COLORS.primary;
    doc.setTextColor(...dirColor);
    doc.text(l.directionSign === "reversed" ? "反置⚠" : l.directionSign === "negative" ? "-" : "+", bx, y + 4); bx += logColW[5];
    doc.setTextColor(
      ...(l.isAnomaly ? COLORS.alert : l.isAudited ? COLORS.primary : COLORS.amber)
    );
    doc.text(
      l.isAnomaly ? "异常" : l.isAudited ? "已审" : "未审",
      bx, y + 4
    );
    y += 6;
  });
  y += 2;

  // Anomaly section
  if (report.includeAnomalies && anomalyLogs.length > 0) {
    checkPage(10);
    doc.setFillColor(...COLORS.alert);
    doc.rect(marginL, y, colW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text(`⚠ 异常记录（已隔离，不参与统计）共 ${anomalyLogs.length} 条`, marginL + 2, y + 4.6);
    y += 9;

    anomalyLogs.slice(0, 20).forEach((l) => {
      checkPage(12);
      const cardColor = l.anomalyType === "direction-reversed" ? COLORS.alert
        : l.anomalyType?.includes("jump") ? COLORS.amber : COLORS.subtle;
      doc.setDrawColor(...cardColor);
      doc.setLineWidth(0.15);
      doc.setFillColor(...COLORS.white);
      doc.rect(marginL, y, colW, 11, "DF");
      doc.setFillColor(...cardColor);
      doc.rect(marginL, y, 2, 11, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.dark);
      doc.text(`${l.batteryCode} · ${fmtTime(l.timestamp)}`, marginL + 4, y + 4);
      const typeName = l.anomalyType === "direction-reversed" ? "方向符号反置"
        : l.anomalyType === "jump-threshold" ? "跳变·阈值调整"
        : l.anomalyType === "jump-unit" ? "跳变·单位切换"
        : l.anomalyType === "jump-late-data" ? "跳变·晚到附件"
        : l.anomalyType === "unknown" ? "未知异常" : "异常";
      doc.setFillColor(...cardColor);
      doc.rect(pageW - marginR - 26, y + 1, 24, 4, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(7);
      doc.text(typeName, pageW - marginR - 24, y + 3.8);
      const lr = remarks.filter((r) => r.logId === l.id && r.isLatest)[0];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.text);
      let note = `内阻 ${l.resistance}${l.unit} · 电压 ${l.voltage.toFixed(3)}V · 温度 ${l.temperature.toFixed(1)}°C`;
      doc.text(note, marginL + 4, y + 8);
      if (lr) {
        const split = doc.splitTextToSize(`备注：${lr.content}（${lr.operator}）`, colW - 10);
        doc.text(split, marginL + 4, y + 8 + 3.5);
        y += 8 + split.length * 3;
      } else {
        y += 11;
      }
      y += 2;
    });
    y += 3;
  }

  // History remarks
  if (report.includeHistory && report.template === "full-history") {
    checkPage(10);
    doc.setFillColor(...COLORS.aurora);
    doc.rect(marginL, y, colW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text("历史版本追溯（备注变更）", marginL + 2, y + 4.6);
    y += 9;
    const relevantRemarks = remarks.filter((r) => report.batteryIds.includes(logs.find(l => l.id === r.logId)?.batteryId ?? ""));
    relevantRemarks.slice(0, 40).forEach((r, idx) => {
      checkPage(9);
      const log = logs.find(l => l.id === r.logId);
      if (idx % 2 === 0) {
        doc.setFillColor(250, 245, 255);
        doc.rect(marginL, y, colW, 8, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.aurora);
      doc.text(`v${r.version}`, marginL + 2, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.subtle);
      doc.text(`${log?.batteryCode ?? "—"} · ${fmtTime(r.createdAt)} · ${r.operator}${r.isLatest ? " · 最新" : ""}`, marginL + 10, y + 3);
      const split = doc.splitTextToSize(r.content, colW - 6);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.text);
      doc.text(split, marginL + 2, y + 7);
      y += split.length * 3 + 3;
    });
  }

  // Disclaimer
  y += 2;
  checkPage(16);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.08);
  doc.rect(marginL, y, colW, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.subtle);
  doc.text("说明", marginL + 2, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.subtle);
  const disclaim = [
    "1. 本报告由 BR·Analyzer 系统自动生成，数据来源于传感器日志与人工备注的完整历史链。",
    "2. 标记为「方向符号反置」或「数值跳变」的记录已自动隔离，不参与平均值和统计结果。",
    "3. 跳变原因按优先级自动判定：单位切换 → 阈值版本变更 → 晚到附件 → 未知（需人工确认）。",
    "4. 如需完整历史版本，请选择「含历史版报告」模板重新导出。",
  ];
  disclaim.forEach((t, i) => { doc.text(t, marginL + 2, y + 5.5 + i * 2.5); });

  const pdfBlob = doc.output("blob");
  return pdfBlob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
