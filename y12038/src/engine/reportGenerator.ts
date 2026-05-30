import type { GameState, ExportReport, SettlementResult, RiskAlert } from "@/types";
import { calcSettlement } from "./calculator";

export function generateReport(state: GameState): ExportReport {
  const settlement = calcSettlement(state);
  const futuresConclusions = settlement.futuresPnL.map((d) => d.conclusion);
  const netEffect = settlement.netHedgingEffect;
  const defaultLoss = settlement.defaultLoss;
  const storageCost = settlement.storageCost;

  let summaryConclusion = `\u5173\u5361${state.levelId}\u590D\u76D8\uFF1A`;
  summaryConclusion += `\u671F\u521D\u8D44\u91D1${settlement.initialCash.toLocaleString()}\u5143\uFF0C`;
  summaryConclusion += `\u671F\u8D27\u51C0\u76C8\u4E8F${netEffect >= 0 ? "+" : ""}${netEffect.toLocaleString()}\u5143\uFF0C`;
  summaryConclusion += `\u4ED3\u50A8\u6210\u672C${storageCost.toLocaleString()}\u5143\uFF0C`;
  summaryConclusion += `\u8FDD\u7EA6\u635F\u5931${defaultLoss.toLocaleString()}\u5143\uFF0C`;
  summaryConclusion += `\u671F\u672B\u8D44\u91D1${settlement.finalCash.toLocaleString()}\u5143`;

  return {
    levelId: state.levelId,
    levelName: state.levelId === "level-1" ? "\u987A\u5229\u5957\u4FDD" : state.levelId === "level-2" ? "\u5408\u7EA6\u5230\u671F" : "\u4ED3\u50A8\u7206\u4ED3 + \u73B0\u8D27\u8FDD\u7EA6",
    completedAt: new Date().toISOString(),
    totalTurns: state.turn,
    settlement,
    riskAlerts: state.riskAlerts,
    futuresConclusions,
    summaryConclusion,
  };
}

function escapeCsvField(field: string | number): string {
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAsCsv(report: ExportReport): string {
  const lines: string[] = [];
  lines.push("\u671F\u8D27\u5957\u4FDD\u519C\u573A - \u590D\u76D8\u62A5\u544A");
  lines.push(`\u5173\u5361,${escapeCsvField(report.levelName)}`);
  lines.push(`\u5B8C\u6210\u65F6\u95F4,${escapeCsvField(report.completedAt)}`);
  lines.push(`\u603B\u56DE\u5408\u6570,${report.totalTurns}`);
  lines.push("");

  lines.push("\u671F\u8D27\u76C8\u4E8F\u660E\u7EC6");
  lines.push("\u54C1\u79CD,\u65B9\u5411,\u5F00\u4ED3\u4EF7,\u5E73\u4ED3\u4EF7,\u624B\u6570,\u4E58\u6570,\u76C8\u4E8F,\u7ED3\u8BBA");
  for (const d of report.settlement.futuresPnL) {
    lines.push(
      [
        escapeCsvField(d.commodity),
        escapeCsvField(d.direction),
        d.openPrice,
        d.closePrice,
        d.lots,
        d.multiplier,
        d.pnl,
        escapeCsvField(d.conclusion),
      ].join(",")
    );
  }
  lines.push("");

  lines.push("\u73B0\u8D27\u76C8\u4E8F\u660E\u7EC6");
  lines.push("\u54C1\u79CD,\u534F\u8BAE\u4EF7,\u5E02\u573A\u4EF7,\u6570\u91CF,\u76C8\u4E8F,\u662F\u5426\u8FDD\u7EA6,\u8FDD\u7EA6\u635F\u5931,\u7ED3\u8BBA");
  for (const d of report.settlement.spotPnL) {
    lines.push(
      [
        escapeCsvField(d.commodity),
        d.agreedPrice,
        d.marketPrice,
        d.quantity,
        d.pnl,
        d.isDefaulted ? "\u662F" : "\u5426",
        d.defaultLoss,
        escapeCsvField(d.conclusion),
      ].join(",")
    );
  }
  lines.push("");

  lines.push("\u7EFC\u5408\u635F\u76CA");
  lines.push(`\u671F\u521D\u8D44\u91D1,${report.settlement.initialCash}`);
  lines.push(`\u671F\u8D27\u603B\u76C8\u4E8F,${report.settlement.futuresPnL.reduce((s, d) => s + d.pnl, 0)}`);
  lines.push(`\u73B0\u8D27\u603B\u76C8\u4E8F,${report.settlement.spotPnL.reduce((s, d) => s + d.pnl, 0)}`);
  lines.push(`\u4ED3\u50A8\u6210\u672C,${report.settlement.storageCost}`);
  lines.push(`\u8FDD\u7EA6\u635F\u5931,${report.settlement.defaultLoss}`);
  lines.push(`\u51C0\u5957\u4FDD\u6548\u679C,${report.settlement.netHedgingEffect}`);
  lines.push(`\u671F\u672B\u8D44\u91D1,${report.settlement.finalCash}`);
  lines.push("");

  lines.push("\u98CE\u9669\u63D0\u793A\u6C47\u603B");
  lines.push("\u56DE\u5408,\u7EA7\u522B,\u7C7B\u522B,\u6D88\u606F");
  for (const a of report.riskAlerts) {
    lines.push(
      [a.turn, escapeCsvField(a.level), escapeCsvField(a.category), escapeCsvField(a.message)].join(",")
    );
  }
  lines.push("");

  lines.push("\u671F\u8D27\u5408\u7EA6\u7ED3\u8BBA");
  for (const c of report.futuresConclusions) {
    lines.push(escapeCsvField(c));
  }
  lines.push("");
  lines.push(escapeCsvField(report.summaryConclusion));

  return lines.join("\n");
}

export function exportAsJson(report: ExportReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
