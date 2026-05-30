import type { GameState, RiskAlert, RiskCategory, RiskLevel } from "@/types";

export function checkRisks(state: GameState): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const turn = state.turn;

  for (const pos of state.futuresPositions) {
    if (pos.isSettled) continue;
    if (pos.expiryTurn - turn <= 1 && pos.expiryTurn > turn) {
      alerts.push({
        turn,
        level: "\u8B66\u544A",
        category: "\u5408\u7EA6\u5230\u671F",
        message: `${pos.commodity}\u671F\u8D27\u5408\u7EA6\u5C06\u4E8E\u4E0B\u4E00\u56DE\u5408\u5230\u671F\uFF0C\u8BF7\u53CA\u65F6\u5904\u7406`,
      });
    }
    if (pos.expiryTurn <= turn && !pos.isExpired) {
      alerts.push({
        turn,
        level: "\u5371\u9669",
        category: "\u5408\u7EA6\u5230\u671F",
        message: `${pos.commodity}\u671F\u8D27\u5408\u7EA6\u5DF2\u5230\u671F\uFF0C\u5FC5\u987B\u7ACB\u5373\u5E73\u4ED3\u6216\u4EA4\u5272`,
      });
    }
  }

  const stockRatio = state.warehouse.currentStock / state.warehouse.maxCapacity;
  if (stockRatio > 0.95) {
    alerts.push({
      turn,
      level: "\u5371\u9669",
      category: "\u4ED3\u50A8\u8D85\u9650",
      message: `\u4ED3\u50A8\u5DF2\u8FBE${(stockRatio * 100).toFixed(0)}%\uFF0C\u7206\u4ED3\u98CE\u9669\uFF01\u8D85\u51FA\u90E8\u5206\u5C06\u4EA7\u751F\u989D\u5916\u8D39\u7528`,
    });
  } else if (stockRatio > 0.8) {
    alerts.push({
      turn,
      level: "\u8B66\u544A",
      category: "\u4ED3\u50A8\u8D85\u9650",
      message: `\u4ED3\u50A8\u8FBE${(stockRatio * 100).toFixed(0)}%\uFF0C\u63A5\u8FD1\u4E0A\u9650\uFF0C\u8BF7\u8003\u8651\u589E\u52A0\u73B0\u8D27\u9500\u552E`,
    });
  }

  for (const order of state.spotOrders) {
    if (order.isDefaulted) {
      alerts.push({
        turn,
        level: "\u5371\u9669",
        category: "\u73B0\u8D27\u8FDD\u7EA6",
        message: `${order.buyer}\u5DF2\u8FDD\u7EA6\uFF0C${order.commodity}${order.quantity}\u5428\u8BA2\u5355\u635F\u5931${(order.agreedPrice * order.quantity * order.defaultRatio).toLocaleString()}\u5143`,
      });
    }
  }

  for (const pos of state.futuresPositions) {
    if (pos.isSettled) continue;
    const basis = state.currentPrices[pos.commodity] - pos.currentPrice;
    const basisPercent = Math.abs(basis) / pos.currentPrice;
    if (basisPercent > 0.05) {
      alerts.push({
        turn,
        level: "\u63D0\u793A",
        category: "\u57FA\u5DEE\u5F02\u5E38",
        message: `${pos.commodity}\u57FA\u5DEE${basis >= 0 ? "+" : ""}${basis.toFixed(0)}\u5143/\u5428\uFF0C\u504F\u79BB${(basisPercent * 100).toFixed(1)}%\uFF0C\u5957\u4FDD\u6548\u679C\u53EF\u80FD\u53D7\u5F71\u54CD`,
      });
    }
  }

  return alerts;
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "\u63D0\u793A":
      return "text-amber-500";
    case "\u8B66\u544A":
      return "text-orange-500";
    case "\u5371\u9669":
      return "text-red-500";
  }
}

export function getRiskCategoryIcon(category: RiskCategory): string {
  switch (category) {
    case "\u5408\u7EA6\u5230\u671F":
      return "\u23F0";
    case "\u4ED3\u50A8\u8D85\u9650":
      return "\u1F4E6";
    case "\u73B0\u8D27\u8FDD\u7EA6":
      return "\u26A0";
    case "\u57FA\u5DEE\u5F02\u5E38":
      return "\u1F4C8";
  }
}
