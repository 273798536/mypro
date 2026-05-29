import {
  Denomination,
  ChangePlan,
  ChangeResult,
  ChangeDetail,
  InventoryValidation,
  InventoryShortage,
  NextAction,
  SupplySuggestion,
  Transaction,
  Inventory,
} from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function validateInventory(
  planDetails: ChangeDetail[],
  inventory: Record<string, number>
): InventoryValidation {
  const shortages: InventoryShortage[] = [];

  for (const detail of planDetails) {
    const available = inventory[detail.denominationId] || 0;
    if (detail.quantity > available) {
      shortages.push({
        denominationId: detail.denominationId,
        needed: detail.quantity,
        available,
      });
    }
  }

  return {
    valid: shortages.length === 0,
    shortages,
  };
}

interface DPState {
  minCoins: number;
  combinations: ChangeDetail[][];
}

export function dpChangeWithInventory(
  amount: number,
  denominations: Denomination[],
  inventory: Record<string, number>,
  transactionId: string = '',
  maxPlans: number = 3
): ChangeResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const nextActions: NextAction[] = [];

  if (amount < 0) {
    return {
      success: false,
      plans: [],
      warnings: [],
      errors: ['找零金额不能为负数'],
      nextActions: [],
    };
  }

  if (amount === 0) {
    return {
      success: true,
      plans: [
        {
          id: generateId(),
          transactionId,
          denominationBreakdown: [],
          totalCoins: 0,
          isOptimal: true,
          rank: 1,
          algorithm: 'direct-zero',
        },
      ],
      warnings: [],
      errors: [],
      nextActions: [],
    };
  }

  const missingDenominations = denominations.filter((d) => !inventory[d.id] && inventory[d.id] !== 0);
  if (missingDenominations.length > 0) {
    warnings.push(
      `以下面额库存数据缺失: ${missingDenominations.map((d) => d.name).join(', ')}，已默认库存为0`
    );
    nextActions.push({
      action: 'update_inventory',
      target: 'inventory-settings',
      description: '补充缺失面额的库存数据',
      priority: 2,
    });
  }

  const sortedDenoms = [...denominations].sort((a, b) => b.value - a.value);
  const amountInCents = Math.round(amount * 100);
  const denomValues = sortedDenoms.map((d) => ({
    ...d,
    valueInCents: Math.round(d.value * 100),
  }));

  const dp: DPState[] = Array(amountInCents + 1).fill(null).map(() => ({
    minCoins: Infinity,
    combinations: [],
  }));
  dp[0] = { minCoins: 0, combinations: [[]] };

  for (let i = 1; i <= amountInCents; i++) {
    for (const denom of denomValues) {
      if (denom.valueInCents <= i) {
        const prevAmount = i - denom.valueInCents;
        if (dp[prevAmount].minCoins !== Infinity) {
          const potentialCoins = dp[prevAmount].minCoins + 1;
          if (potentialCoins < dp[i].minCoins) {
            dp[i].minCoins = potentialCoins;
            dp[i].combinations = [];
            for (const combo of dp[prevAmount].combinations.slice(0, maxPlans)) {
              const newCombo = [...combo];
              const existing = newCombo.find((c) => c.denominationId === denom.id);
              if (existing) {
                existing.quantity++;
                existing.value += denom.value;
              } else {
                newCombo.push({
                  denominationId: denom.id,
                  quantity: 1,
                  value: denom.value,
                });
              }
              dp[i].combinations.push(newCombo);
            }
          } else if (potentialCoins === dp[i].minCoins && dp[i].combinations.length < maxPlans) {
            for (const combo of dp[prevAmount].combinations.slice(0, maxPlans - dp[i].combinations.length)) {
              const newCombo = [...combo];
              const existing = newCombo.find((c) => c.denominationId === denom.id);
              if (existing) {
                existing.quantity++;
                existing.value += denom.value;
              } else {
                newCombo.push({
                  denominationId: denom.id,
                  quantity: 1,
                  value: denom.value,
                });
              }
              const exists = dp[i].combinations.some(
                (c) => JSON.stringify(c) === JSON.stringify(newCombo)
              );
              if (!exists) {
                dp[i].combinations.push(newCombo);
              }
            }
          }
        }
      }
    }
  }

  if (dp[amountInCents].minCoins === Infinity) {
    const greedyPlan = greedyChange(amount, denominations, inventory);
    if (greedyPlan) {
      return {
        success: true,
        plans: [
          {
            ...greedyPlan,
            id: generateId(),
            transactionId,
            rank: 1,
            algorithm: 'greedy-fallback',
          },
        ],
        warnings: ['动态规划未找到精确解，已使用贪心算法生成近似方案'],
        errors: [],
        nextActions: [
          {
            action: 'review_denominations',
            target: 'denomination-settings',
            description: '检查币种面额配置是否完整',
            priority: 1,
          },
        ],
      };
    }

    return {
      success: false,
      plans: [],
      warnings: [],
      errors: ['无法生成找零方案，请检查面额配置'],
      nextActions: [
        {
          action: 'configure_denominations',
          target: 'denomination-settings',
          description: '配置完整的币种面额',
          priority: 1,
        },
      ],
    };
  }

  const rawPlans = dp[amountInCents].combinations.slice(0, maxPlans);
  const plans: ChangePlan[] = [];

  for (let i = 0; i < rawPlans.length; i++) {
    const validation = validateInventory(rawPlans[i], inventory);
    if (validation.valid) {
      const totalCoins = rawPlans[i].reduce((sum, d) => sum + d.quantity, 0);
      plans.push({
        id: generateId(),
        transactionId,
        denominationBreakdown: rawPlans[i],
        totalCoins,
        isOptimal: i === 0,
        rank: i + 1,
        algorithm: 'dynamic-programming',
      });
    } else {
      const shortageNames = validation.shortages
        .map((s) => {
          const denom = denominations.find((d) => d.id === s.denominationId);
          return denom?.name || s.denominationId;
        })
        .join(', ');
      warnings.push(`方案${i + 1}因库存不足被排除: ${shortageNames}`);
    }
  }

  if (plans.length === 0) {
    errors.push('所有最优方案均受库存约束限制');
    nextActions.push({
      action: 'replenish',
      target: 'inventory',
      description: '补充库存零钱',
      priority: 1,
    });

    const relaxedPlans = rawPlans.slice(0, 2).map((plan, idx) => ({
      id: generateId(),
      transactionId,
      denominationBreakdown: plan,
      totalCoins: plan.reduce((sum, d) => sum + d.quantity, 0),
      isOptimal: idx === 0,
      rank: idx + 1,
      algorithm: 'dynamic-programming-relaxed',
    }));

    return {
      success: false,
      plans: relaxedPlans,
      warnings,
      errors,
      nextActions,
    };
  }

  return {
    success: true,
    plans,
    warnings,
    errors,
    nextActions,
  };
}

function greedyChange(
  amount: number,
  denominations: Denomination[],
  inventory: Record<string, number>
): Omit<ChangePlan, 'id' | 'transactionId' | 'rank' | 'algorithm'> | null {
  const sortedDenoms = [...denominations].sort((a, b) => b.value - a.value);
  const breakdown: ChangeDetail[] = [];
  let remaining = amount;
  let totalCoins = 0;

  for (const denom of sortedDenoms) {
    const available = inventory[denom.id] || 0;
    const maxUse = Math.min(Math.floor(remaining / denom.value), available);
    if (maxUse > 0) {
      breakdown.push({
        denominationId: denom.id,
        quantity: maxUse,
        value: denom.value * maxUse,
      });
      remaining -= denom.value * maxUse;
      totalCoins += maxUse;
    }
  }

  if (remaining > 0.01) {
    return null;
  }

  return {
    denominationBreakdown: breakdown,
    totalCoins,
    isOptimal: false,
  };
}

export function calculateDenominationImportance(
  transactions: Transaction[],
  denominations: Denomination[]
): Record<string, { usageCount: number; totalValue: number; importance: number }> {
  const stats: Record<string, { usageCount: number; totalValue: number }> = {};

  denominations.forEach((d) => {
    stats[d.id] = { usageCount: 0, totalValue: 0 };
  });

  for (const tx of transactions) {
    for (const detail of tx.changeDetails) {
      if (stats[detail.denominationId]) {
        stats[detail.denominationId].usageCount += detail.quantity;
        stats[detail.denominationId].totalValue += detail.value;
      }
    }
  }

  const maxUsage = Math.max(...Object.values(stats).map((s) => s.usageCount), 1);
  const maxValue = Math.max(...Object.values(stats).map((s) => s.totalValue), 1);

  const result: Record<string, { usageCount: number; totalValue: number; importance: number }> = {};
  for (const [id, stat] of Object.entries(stats)) {
    const usageScore = stat.usageCount / maxUsage;
    const valueScore = stat.totalValue / maxValue;
    result[id] = {
      ...stat,
      importance: (usageScore * 0.6 + valueScore * 0.4) * 100,
    };
  }

  return result;
}

export function generateSupplySuggestions(
  currentInventory: Inventory[],
  history: Transaction[],
  denominations: Denomination[]
): SupplySuggestion[] {
  const suggestions: SupplySuggestion[] = [];
  const inventoryMap: Record<string, number> = {};
  currentInventory.forEach((inv) => {
    inventoryMap[inv.denominationId] = inv.quantity;
  });

  const recentTransactions = history.slice(-50);
  const importance = calculateDenominationImportance(recentTransactions, denominations);

  for (const denom of denominations) {
    const currentQty = inventoryMap[denom.id] || 0;
    const usageStat = importance[denom.id];

    let suggestedQuantity = 0;
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reason = '';

    const avgUsagePerTx = usageStat?.usageCount / Math.max(recentTransactions.length, 1) || 0;
    const estimatedDailyNeed = Math.ceil(avgUsagePerTx * 100);

    if (currentQty <= denom.criticalThreshold) {
      priority = 'high';
      suggestedQuantity = Math.max(estimatedDailyNeed * 2, denom.warningThreshold * 2);
      reason = `库存已低于临界值(${denom.criticalThreshold})，急需补充`;
    } else if (currentQty <= denom.warningThreshold) {
      priority = 'medium';
      suggestedQuantity = Math.max(estimatedDailyNeed, denom.warningThreshold);
      reason = `库存接近预警线(${denom.warningThreshold})，建议补充`;
    } else if (usageStat?.importance > 70) {
      priority = 'medium';
      suggestedQuantity = Math.ceil(estimatedDailyNeed * 0.5);
      reason = `该面额使用频率高(${usageStat.usageCount}次)，预防性补充`;
    }

    if (suggestedQuantity > 0) {
      suggestions.push({
        id: generateId(),
        denominationId: denom.id,
        suggestedQuantity: Math.ceil(suggestedQuantity / 10) * 10,
        priority,
        reason,
        generatedAt: new Date(),
      });
    }
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function generateNextActions(
  validation: InventoryValidation,
  denominations: Denomination[]
): NextAction[] {
  const actions: NextAction[] = [];

  if (!validation.valid) {
    for (let i = 0; i < validation.shortages.length; i++) {
      const shortage = validation.shortages[i];
      const denom = denominations.find((d) => d.id === shortage.denominationId);
      actions.push({
        action: 'replenish',
        target: shortage.denominationId,
        description: `补充${denom?.name || shortage.denominationId}：需要${shortage.needed}，现有${shortage.available}`,
        priority: i + 1,
      });
    }
  }

  return actions;
}
