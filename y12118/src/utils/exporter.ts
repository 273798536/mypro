import type { AllocationOutput } from "./types";

export function exportToCSV(output: AllocationOutput): string {
  const header = [
    "渠道",
    "分配金额",
    "日消耗上限",
    "是否触及上限",
    "最终边际收益",
    "预期转化",
    "延迟折扣",
    "重复惩罚",
    "异常",
  ].join(",");

  const rows = output.results.map((r) => {
    const anomalyTexts = r.anomalies
      .map((a) => {
        if (a.type === "budget_exhausted") return "预算耗尽";
        if (a.type === "conversion_delay") return "转化延迟";
        if (a.type === "material_duplicate") return "素材重复";
        return a.type;
      })
      .join(";");

    return [
      r.channelName,
      r.allocatedBudget.toFixed(2),
      r.dailyCap.toFixed(2),
      r.capReached ? "是" : "否",
      r.marginalReturn.toFixed(6),
      r.expectedConversions.toFixed(4),
      r.delayDiscount.toFixed(4),
      r.duplicatePenalty.toFixed(4),
      `"${anomalyTexts}"`,
    ].join(",");
  });

  const budgetSummary = `\n\n预算上限结论\n总预算,${output.totalBudget.toFixed(2)}\n已分配,${(output.totalBudget - output.remainingBudget).toFixed(2)}\n剩余,${output.remainingBudget.toFixed(2)}\n触及上限渠道,${output.results.filter((r) => r.capReached).map((r) => r.channelName).join(";") || "无"}`;

  return header + "\n" + rows.join("\n") + budgetSummary;
}

export function exportToJSON(output: AllocationOutput): string {
  const jsonOutput = {
    totalBudget: output.totalBudget,
    allocatedBudget: output.totalBudget - output.remainingBudget,
    remainingBudget: output.remainingBudget,
    totalExpectedConversions: output.totalExpectedConversions,
    totalRounds: output.totalRounds,
    globalSummary: output.globalSummary,
    budgetCapConclusion: {
      totalBudget: output.totalBudget,
      channelsAtCap: output.results
        .filter((r) => r.capReached)
        .map((r) => ({
          channel: r.channelName,
          dailyCap: r.dailyCap,
          allocatedBudget: r.allocatedBudget,
          blockedMarginalReturn: r.marginalReturn,
        })),
      channelsAtCapDisplay: output.results
        .filter((r) => r.capReached)
        .map((r) => r.channelName)
        .join(";") || "无",
      channelsNotAtCap: output.results
        .filter((r) => !r.capReached)
        .map((r) => ({
          channel: r.channelName,
          dailyCap: r.dailyCap,
          allocatedBudget: r.allocatedBudget,
        })),
    },
    results: output.results.map((r) => ({
      channel: r.channelName,
      allocatedBudget: r.allocatedBudget,
      dailyCap: r.dailyCap,
      capReached: r.capReached,
      marginalReturn: r.marginalReturn,
      expectedConversions: r.expectedConversions,
      delayDiscount: r.delayDiscount,
      duplicatePenalty: r.duplicatePenalty,
      anomalies: r.anomalies.map((a) => ({
        type: a.type,
        severity: a.severity,
        explanation: a.explanation,
      })),
      optimizationSteps: r.optimizationSteps.map((s) => ({
        round: s.round,
        action: s.action,
        constraintType: s.constraintType,
        deltaBudget: s.deltaBudget,
        marginalReturnBefore: s.marginalReturnBefore,
        marginalReturnAfter: s.marginalReturnAfter,
        explanation: s.explanation,
      })),
      marginalReturnCurve: r.marginalReturnCurve,
      budgetReplay: r.budgetReplay,
    })),
  };

  return JSON.stringify(jsonOutput, null, 2);
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
