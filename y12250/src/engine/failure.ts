import type {
  FailureType,
  FailureEvent,
  ImpactLink,
  GameState,
} from './types';

export function simulatePriceJump(
  basePrice: number,
  volatility: number,
  triggerProbability: number = 0.3
): {
  newPrice: number;
  jumpOccurred: boolean;
  jumpDirection: 'up' | 'down' | 'none';
  jumpPercent: number;
} {
  const random = Math.random();

  if (random > triggerProbability) {
    const normalChange = (Math.random() - 0.5) * volatility * 0.2 * basePrice;
    return {
      newPrice: Math.max(0.01, basePrice + normalChange),
      jumpOccurred: false,
      jumpDirection: 'none',
      jumpPercent: (normalChange / basePrice) * 100,
    };
  }

  const jumpDirection = Math.random() < 0.65 ? 'down' : 'up';
  const jumpMagnitude = basePrice * volatility * (0.8 + Math.random() * 0.7);
  const jumpPercent = (jumpMagnitude / basePrice) * 100;
  const newPrice =
    jumpDirection === 'down'
      ? Math.max(0.01, basePrice - jumpMagnitude)
      : basePrice + jumpMagnitude;

  return {
    newPrice,
    jumpOccurred: true,
    jumpDirection,
    jumpPercent: jumpDirection === 'down' ? -jumpPercent : jumpPercent,
  };
}

export function buildPriceJumpImpactChain(
  oldPrice: number,
  newPrice: number,
  oldRatio: number,
  newRatio: number,
  liquidationRatio: number
): ImpactLink[] {
  const priceDropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
  const ratioDrop = oldRatio - newRatio;

  return [
    {
      id: 'link-1',
      description: `预言机价格发生剧烈跳变`,
      affectedMetric: '预言机价格',
      change: `$${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${priceDropPercent.toFixed(2)}%)`,
      ruleReference: 'rule:price-oracle',
    },
    {
      id: 'link-2',
      description: `抵押物估值随价格下跌`,
      affectedMetric: '抵押物价值',
      change: `下跌 ${priceDropPercent.toFixed(2)}%`,
      ruleReference: 'rule:collateral-ratio',
    },
    {
      id: 'link-3',
      description: `抵押率随抵押物价值下降`,
      affectedMetric: '抵押率',
      change: `${oldRatio.toFixed(2)}% → ${newRatio.toFixed(2)}% (-${ratioDrop.toFixed(2)}%)`,
      ruleReference: 'rule:collateral-ratio',
    },
    {
      id: 'link-4',
      description: `抵押率击穿清算线，触发清算条件`,
      affectedMetric: '清算状态',
      change: `安全 → 可清算 (低于 ${liquidationRatio}%)`,
      ruleReference: 'rule:liquidation-threshold',
    },
  ];
}

export function buildGasInsufficientImpactChain(
  requiredGas: number,
  remainingGas: number
): ImpactLink[] {
  const deficit = requiredGas - remainingGas;

  return [
    {
      id: 'link-1',
      description: `网络拥堵导致Gas价格上涨`,
      affectedMetric: 'Gas价格',
      change: `上涨 50%`,
      ruleReference: 'rule:gas-competition',
    },
    {
      id: 'link-2',
      description: `清算交易所需Gas超过剩余额度`,
      affectedMetric: 'Gas需求',
      change: `需要 ${requiredGas}，剩余 ${remainingGas}`,
      ruleReference: 'rule:gas-competition',
    },
    {
      id: 'link-3',
      description: `Gas不足 ${deficit}，交易无法被打包`,
      affectedMetric: '交易状态',
      change: `清算失败`,
      ruleReference: 'rule:gas-competition',
    },
    {
      id: 'link-4',
      description: `错过清算窗口，债务进一步恶化`,
      affectedMetric: '债务状态',
      change: `应计利息增加，抵押率持续下降`,
      ruleReference: 'rule:liquidation-threshold',
    },
  ];
}

export function buildRepeatedLiquidationImpactChain(
  count: number,
  collateralRemaining: number,
  initialCollateral: number
): ImpactLink[] {
  const consumedPercent = ((initialCollateral - collateralRemaining) / initialCollateral) * 100;

  return [
    {
      id: 'link-1',
      description: `第 ${count} 次清算被触发`,
      affectedMetric: '清算次数',
      change: `累计 ${count} 次`,
      ruleReference: 'rule:repeated-liquidation',
    },
    {
      id: 'link-2',
      description: `每次清算扣除抵押物 + 清算奖励`,
      affectedMetric: '抵押物消耗',
      change: `已消耗 ${consumedPercent.toFixed(1)}%`,
      ruleReference: 'rule:repeated-liquidation',
    },
    {
      id: 'link-3',
      description: `抵押物不足导致抵押率无法恢复`,
      affectedMetric: '抵押率',
      change: `持续低于安全线`,
      ruleReference: 'rule:collateral-ratio',
    },
    {
      id: 'link-4',
      description: `仓位进入死亡螺旋，最终资不抵债`,
      affectedMetric: '仓位状态',
      change: `坏账风险极高`,
      ruleReference: 'rule:liquidation-threshold',
    },
  ];
}

export function checkFailureConditions(
  gameState: GameState,
  liquidationRatio: number,
  safetyRatio: number
): FailureEvent | null {
  if (gameState.collateralRatio < liquidationRatio) {
    const lastPriceEvent = gameState.priceHistory.slice(-2);
    const isPriceJump =
      lastPriceEvent.length === 2 &&
      Math.abs(lastPriceEvent[1].price - lastPriceEvent[0].price) / lastPriceEvent[0].price > 0.1;

    if (isPriceJump) {
      const oldPrice = lastPriceEvent[0].price;
      const newPrice = lastPriceEvent[1].price;
      return {
        type: 'price_jump',
        triggerNode: gameState.currentNodeId,
        triggerStep: gameState.nodeHistory.length,
        impactChain: buildPriceJumpImpactChain(
          oldPrice,
          newPrice,
          gameState.collateralRatio + 10,
          gameState.collateralRatio,
          liquidationRatio
        ),
        explanation:
          '抵押物价格突发跳变导致抵押率瞬间击穿清算线。在高波动率市场中，建议维持更高的安全边际，或设置自动化清算保护。',
        affectedResults: [
          '抵押物估值下降',
          '抵押率击穿清算线',
          '触发强制清算',
          '抵押物被拍卖偿还债务',
        ],
      };
    }
  }

  if (gameState.gasRemaining <= 0) {
    return {
      type: 'gas_insufficient',
      triggerNode: gameState.currentNodeId,
      triggerStep: gameState.nodeHistory.length,
      impactChain: buildGasInsufficientImpactChain(
        100,
        gameState.gasRemaining
      ),
      explanation:
        '清算交易消耗的Gas超过了剩余额度。在网络拥堵时，应预留充足的Gas，或选择Gas价格较低的时段进行操作。',
      affectedResults: [
        '清算交易无法上链',
        '错过最佳清算时机',
        '债务应计利息持续增加',
        '抵押率进一步恶化',
      ],
    };
  }

  if (gameState.repeatedLiquidationCount >= 3) {
    const totalCollateral = gameState.position.collaterals.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    return {
      type: 'repeated_liquidation',
      triggerNode: gameState.currentNodeId,
      triggerStep: gameState.nodeHistory.length,
      impactChain: buildRepeatedLiquidationImpactChain(
        gameState.repeatedLiquidationCount,
        gameState.collateralValue / gameState.currentPrice,
        totalCollateral
      ),
      explanation:
        '同一仓位被连续清算3次以上，每次清算都会消耗抵押物并支付清算奖励，导致抵押物净值加速下降，形成死亡螺旋。',
      affectedResults: [
        '抵押物持续消耗',
        '清算奖励累积支出',
        '抵押率无法恢复至安全线',
        '仓位最终资不抵债',
      ],
    };
  }

  return null;
}
