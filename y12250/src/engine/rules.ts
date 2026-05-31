export function checkLiquidation(
  currentRatio: number,
  liquidationRatio: number,
  safetyRatio: number
): {
  safe: boolean;
  warning: boolean;
  liquidatable: boolean;
  status: 'safe' | 'warning' | 'danger';
} {
  if (currentRatio < liquidationRatio) {
    return {
      safe: false,
      warning: false,
      liquidatable: true,
      status: 'danger',
    };
  }
  if (currentRatio < safetyRatio) {
    return {
      safe: false,
      warning: true,
      liquidatable: false,
      status: 'warning',
    };
  }
  return {
    safe: true,
    warning: false,
    liquidatable: false,
    status: 'safe',
  };
}

export function getRuleHint(choiceType: string): string {
  const hints: Record<string, string> = {
    partial_repay:
      '规则：部分还款可直接降低债务金额，抵押率 = 抵押物价值 / 债务价值 × 100%。还款10%债务，抵押率提升约11%。',
    add_collateral:
      '规则：增加抵押物可提升抵押物总价值。抵押率与抵押物价值成正比，增加10%抵押物，抵押率提升10%。',
    swap_stable:
      '规则：将波动资产置换为稳定币可降低价格波动风险，但需支付交易手续费和Gas。',
    wait:
      '规则：等待期间抵押物价格可能波动。波动率越高，价格跳变概率越大。向下跳变会降低抵押率。',
    full_liquidation:
      '规则：全额清算将出售所有抵押物偿还债务。抵押率低于清算线时会被强制清算。',
    flash_loan:
      '规则：闪电贷可临时补充流动性，但需在同一交易内偿还，且手续费较高。',
    delegate:
      '规则：委托清算人代理清算，可获得更优的Gas价格，但需支付清算奖励（通常为抵押物的3-5%）。',
  };
  return hints[choiceType] || '请谨慎评估该操作对抵押率的影响。';
}

export function getRuleReference(ruleId: string): string {
  const references: Record<string, string> = {
    'rule:collateral-ratio': '抵押率公式：抵押率 = (抵押物数量 × 预言机价格) / 债务价值 × 100%',
    'rule:liquidation-threshold': '清算线：当抵押率低于清算线时，任何人都可触发清算',
    'rule:safety-buffer': '安全缓冲区：建议维持抵押率高于安全线20%以上以应对价格波动',
    'rule:gas-competition': 'Gas竞争：清算交易需要足够的Gas才能被打包，高Gas价格优先',
    'rule:price-oracle': '预言机价格：清算使用预言机最新报价，价格更新可能存在延迟',
    'rule:repeated-liquidation': '重复清算：若一次清算后抵押率仍低于安全线，可能被连续清算',
  };
  return references[ruleId] || ruleId;
}

export function generateRuleFeedback(
  oldRatio: number,
  newRatio: number,
  action: string,
  safetyRatio: number,
  liquidationRatio: number
): string {
  const diff = newRatio - oldRatio;
  const status = checkLiquidation(newRatio, liquidationRatio, safetyRatio);

  let feedback = `操作「${action}」后，抵押率 ${oldRatio.toFixed(2)}% → ${newRatio.toFixed(2)}%`;

  if (diff > 0) {
    feedback += `，上升 ${diff.toFixed(2)}%。`;
  } else if (diff < 0) {
    feedback += `，下降 ${Math.abs(diff).toFixed(2)}%。`;
  } else {
    feedback += `，保持不变。`;
  }

  if (status.liquidatable) {
    feedback += ` ⚠️ 已击穿清算线（${liquidationRatio}%），将被强制清算！`;
  } else if (status.warning) {
    feedback += ` ⚠️ 已进入警告区，距离清算线仅 ${(newRatio - liquidationRatio).toFixed(2)}%，建议补充抵押物或还款。`;
  } else if (status.safe) {
    feedback += ` ✅ 处于安全区，安全边际 ${(newRatio - safetyRatio).toFixed(2)}%。`;
  }

  return feedback;
}
