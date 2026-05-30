import type {
  FuturesPosition,
  SpotOrder,
  FuturesPnLDetail,
  SpotPnLDetail,
  BasisAnalysisDetail,
  SettlementResult,
  GameState,
  RiskAlert,
} from "@/types";

export function calcFuturesPnL(
  position: FuturesPosition,
  closePrice: number
): FuturesPnLDetail {
  const rawPnl =
    (closePrice - position.openPrice) *
    position.lots *
    position.contractMultiplier;
  const pnl = position.direction === "\u7A7A\u5934" ? -rawPnl : rawPnl;
  const directionWord =
    position.direction === "\u7A7A\u5934" ? "\u5356\u51FA" : "\u4E70\u5165";
  const conclusion =
    `${position.commodity}\u671F\u8D27${directionWord}\uFF0C\u5F00\u4ED3${position.openPrice}\u5143/\u5428\uFF0C` +
    `\u5E73\u4ED3${closePrice}\u5143/\u5428\uFF0C${position.lots}\u624B\u00D7${position.contractMultiplier}\u5428/\u624B\uFF0C` +
    `\u76C8\u4E8F${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}\u5143`;

  return {
    positionId: position.id,
    commodity: position.commodity,
    direction: position.direction,
    openPrice: position.openPrice,
    closePrice,
    lots: position.lots,
    multiplier: position.contractMultiplier,
    pnl,
    conclusion,
  };
}

export function calcSpotPnL(
  order: SpotOrder,
  marketPrice: number
): SpotPnLDetail {
  const pnl = (order.agreedPrice - marketPrice) * order.quantity;
  const defaultLoss = order.isDefaulted
    ? order.agreedPrice * order.quantity * order.defaultRatio
    : 0;
  let conclusion = `${order.commodity}\u73B0\u8D27\u5356\u7ED9${order.buyer}\uFF0C\u534F\u8BAE\u4EF7${order.agreedPrice}\u5143/\u5428\uFF0C`;
  if (order.isDefaulted) {
    conclusion += `\u5BF9\u65B9\u8FDD\u7EA6\uFF08\u8FDD\u7EA6\u6BD4\u4F8B${(order.defaultRatio * 100).toFixed(0)}%\uFF09\uFF0C\u8FDD\u7EA6\u635F\u5931${defaultLoss.toLocaleString()}\u5143`;
  } else {
    conclusion += `\u5E02\u573A\u4EF7${marketPrice}\u5143/\u5428\uFF0C\u76C8\u4E8F${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}\u5143`;
  }

  return {
    orderId: order.id,
    commodity: order.commodity,
    agreedPrice: order.agreedPrice,
    marketPrice,
    quantity: order.quantity,
    pnl,
    isDefaulted: order.isDefaulted,
    defaultLoss,
    conclusion,
  };
}

export function calcBasisAnalysis(
  state: GameState
): BasisAnalysisDetail[] {
  const results: BasisAnalysisDetail[] = [];
  const commodities = [...new Set(state.crops.map((c) => c.name))];

  for (let t = 1; t <= state.turn; t++) {
    for (const commodity of commodities) {
      const spotPrice = state.currentPrices[commodity] ?? 0;
      const futuresPos = state.futuresPositions.find(
        (p) => p.commodity === commodity && !p.isSettled
      );
      const futuresPrice = futuresPos?.currentPrice ?? spotPrice;
      const basis = spotPrice - futuresPrice;
      const prevBasis =
        results.length > 0
          ? results[results.length - 1].basis
          : 0;
      results.push({
        turn: t,
        commodity,
        spotPrice,
        futuresPrice,
        basis,
        basisChange: results.length >= commodities.length ? basis - prevBasis : 0,
      });
    }
  }
  return results;
}

export function calcSettlement(state: GameState): SettlementResult {
  const futuresPnL: FuturesPnLDetail[] = state.futuresPositions.map((pos) =>
    calcFuturesPnL(pos, pos.currentPrice)
  );
  const spotPnL: SpotPnLDetail[] = state.spotOrders.map((order) =>
    calcSpotPnL(order, state.currentPrices[order.commodity] ?? 0)
  );
  const totalFuturesPnL = futuresPnL.reduce((sum, d) => sum + d.pnl, 0);
  const totalSpotPnL = spotPnL.reduce((sum, d) => sum + d.pnl, 0);
  const totalDefaultLoss = spotPnL.reduce((sum, d) => sum + d.defaultLoss, 0);
  const totalTurns = state.turn;
  const storageCost =
    state.warehouse.currentStock *
    state.warehouse.unitStorageCost *
    totalTurns;
  const netHedgingEffect = totalFuturesPnL + totalSpotPnL;
  const finalCash =
    state.initialCash +
    totalFuturesPnL +
    totalSpotPnL -
    storageCost -
    totalDefaultLoss;

  return {
    futuresPnL,
    spotPnL,
    storageCost,
    defaultLoss: totalDefaultLoss,
    initialCash: state.initialCash,
    finalCash,
    netHedgingEffect,
    basisAnalysis: calcBasisAnalysis(state),
  };
}
