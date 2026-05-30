import type {
  Channel,
  Material,
  AllocationOutput,
  AllocationResult,
  OptimizationStep,
  MarginalReturnPoint,
  BudgetReplayEntry,
  Anomaly,
} from "./types";

function computeMarginalReturn(
  channel: Channel,
  currentBudget: number,
  delayDiscount: number,
  duplicatePenalty: number
): number {
  const mr =
    channel.conversionRate *
    channel.efficiencyAlpha *
    Math.exp(-channel.efficiencyAlpha * currentBudget);
  return mr * delayDiscount * duplicatePenalty;
}

function findDuplicatePenalty(
  channelId: string,
  materials: Material[]
): { penalty: number; duplicateIds: string[] } {
  const channelMaterials = materials.filter(
    (m) => m.channelId === channelId
  );
  const tagSignatureMap = new Map<string, string[]>();
  for (const m of channelMaterials) {
    const sig = [...m.tags].sort().join("|");
    if (!tagSignatureMap.has(sig)) {
      tagSignatureMap.set(sig, []);
    }
    tagSignatureMap.get(sig)!.push(m.id);
  }
  let maxDuplicates = 1;
  const allDuplicateIds: string[] = [];
  for (const [, ids] of tagSignatureMap) {
    if (ids.length > 1) {
      maxDuplicates = Math.max(maxDuplicates, ids.length);
      allDuplicateIds.push(...ids);
    }
  }
  return {
    penalty: 1 / maxDuplicates,
    duplicateIds: allDuplicateIds,
  };
}

function computeDelayDiscount(delayDays: number): number {
  if (delayDays <= 0) return 1;
  return 1 / (1 + delayDays * 0.1);
}

export function allocateBudget(
  channels: Channel[],
  materials: Material[],
  totalBudget: number
): AllocationOutput {
  const STEP_SIZE = 100;
  const allocated = new Map<string, number>();
  const steps = new Map<string, OptimizationStep[]>();
  const curves = new Map<string, MarginalReturnPoint[]>();
  const replays = new Map<string, BudgetReplayEntry[]>();

  for (const ch of channels) {
    allocated.set(ch.id, 0);
    steps.set(ch.id, []);
    curves.set(ch.id, [{ budget: 0, marginalReturn: 0 }]);
    replays.set(ch.id, []);
  }

  let remaining = totalBudget;
  let round = 0;

  while (remaining >= STEP_SIZE) {
    round++;
    let bestChannelId: string | null = null;
    let bestMR = -1;
    let bestDiscount = 1;
    let bestPenalty = 1;

    for (const ch of channels) {
      const current = allocated.get(ch.id)!;
      if (current >= ch.dailyCap) continue;

      const { penalty } = findDuplicatePenalty(
        ch.id,
        materials
      );
      const discount = computeDelayDiscount(ch.conversionDelayDays);

      const mr = computeMarginalReturn(ch, current, discount, penalty);

      if (mr > bestMR) {
        bestMR = mr;
        bestChannelId = ch.id;
        bestDiscount = discount;
        bestPenalty = penalty;
      }
    }

    if (bestChannelId === null) {
      const allCapped = channels.every(
        (ch) => allocated.get(ch.id)! >= ch.dailyCap
      );
      if (allCapped) {
        for (const ch of channels) {
          steps.get(ch.id)!.push({
            round,
            action: "skip_all_capped",
            constraintType: "all_capped",
            channelId: ch.id,
            deltaBudget: 0,
            marginalReturnBefore: 0,
            marginalReturnAfter: 0,
            explanation: `第${round}轮：所有渠道已达日消耗上限，分配终止`,
          });
        }
      }
      break;
    }

    const ch = channels.find((c) => c.id === bestChannelId)!;
    const currentBudget = allocated.get(ch.id)!;
    const canAllocate = Math.min(
      STEP_SIZE,
      ch.dailyCap - currentBudget,
      remaining
    );

    const mrBefore = computeMarginalReturn(
      ch,
      currentBudget,
      bestDiscount,
      bestPenalty
    );

    allocated.set(ch.id, currentBudget + canAllocate);
    remaining -= canAllocate;

    const mrAfter = computeMarginalReturn(
      ch,
      currentBudget + canAllocate,
      bestDiscount,
      bestPenalty
    );

    const action: OptimizationStep["action"] = "allocate";
    let constraintType: OptimizationStep["constraintType"] = "none";
    let explanation = `第${round}轮：向${ch.name}分配¥${canAllocate.toFixed(0)}，边际收益从${mrBefore.toFixed(6)}降至${mrAfter.toFixed(6)}`;

    if (bestDiscount < 1) {
      constraintType = "delay";
      explanation += `（含${ch.conversionDelayDays}天转化延迟折扣×${bestDiscount.toFixed(4)}）`;
    }
    if (bestPenalty < 1) {
      constraintType = constraintType === "delay" ? "duplicate" : "duplicate";
      explanation += `（含素材重复惩罚×${bestPenalty.toFixed(4)}）`;
    }

    steps.get(ch.id)!.push({
      round,
      action,
      constraintType,
      channelId: ch.id,
      deltaBudget: canAllocate,
      marginalReturnBefore: mrBefore,
      marginalReturnAfter: mrAfter,
      explanation,
    });

    curves.get(ch.id)!.push({
      budget: currentBudget + canAllocate,
      marginalReturn: mrAfter,
    });

    replays.get(ch.id)!.push({
      round,
      channelId: ch.id,
      delta: canAllocate,
      remainingBudget: remaining,
    });

    if (allocated.get(ch.id)! >= ch.dailyCap) {
      const capMR = computeMarginalReturn(
        ch,
        ch.dailyCap,
        bestDiscount,
        bestPenalty
      );
      steps.get(ch.id)!.push({
        round: round + 0.5,
        action: "skip_cap",
        constraintType: "cap",
        channelId: ch.id,
        deltaBudget: 0,
        marginalReturnBefore: capMR,
        marginalReturnAfter: 0,
        explanation: `渠道${ch.name}已触及日消耗上限¥${ch.dailyCap.toFixed(0)}，剩余边际收益¥${capMR.toFixed(6)}被拦住`,
      });
    }
  }

  const results: AllocationResult[] = channels.map((ch) => {
    const budget = allocated.get(ch.id)!;
    const { penalty, duplicateIds } = findDuplicatePenalty(ch.id, materials);
    const discount = computeDelayDiscount(ch.conversionDelayDays);
    const finalMR = computeMarginalReturn(ch, budget, discount, penalty);
    const capReached = budget >= ch.dailyCap;
    const expectedConversions =
      ch.conversionRate * (1 - Math.exp(-ch.efficiencyAlpha * budget));

    const anomalies: Anomaly[] = [];

    if (capReached) {
      const capMR = computeMarginalReturn(ch, ch.dailyCap, discount, penalty);
      anomalies.push({
        type: "budget_exhausted",
        severity: "critical",
        explanation: `渠道${ch.name}已触及日消耗上限¥${ch.dailyCap.toLocaleString()}，剩余边际收益¥${capMR.toFixed(6)}被拦住。如需更多投放，需提高日消耗上限或等待次日额度刷新。`,
      });
    }

    if (ch.conversionDelayDays > 0) {
      anomalies.push({
        type: "conversion_delay",
        severity: "warning",
        explanation: `渠道${ch.name}有${ch.conversionDelayDays}天转化延迟，边际收益已按折扣因子${discount.toFixed(4)}调整。当前显示的转化数据可能滞后，实际转化可能更高。建议等待${ch.conversionDelayDays}天后对账确认。`,
      });
    }

    if (duplicateIds.length > 0) {
      const dupMaterials = materials.filter((m) =>
        duplicateIds.includes(m.id)
      );
      const tagGroups = new Map<string, string[]>();
      for (const m of dupMaterials) {
        const sig = [...m.tags].sort().join("|");
        if (!tagGroups.has(sig)) tagGroups.set(sig, []);
        tagGroups.get(sig)!.push(m.name);
      }
      const descriptions: string[] = [];
      for (const [sig, names] of tagGroups) {
        if (names.length > 1) {
          descriptions.push(`${names.join("与")}标签重复[${sig.replace(/\|/g, ", ")}]`);
        }
      }
      anomalies.push({
        type: "material_duplicate",
        severity: "warning",
        explanation: `渠道${ch.name}下${descriptions.join("；")}，边际收益已按重复惩罚×${penalty.toFixed(4)}调整。建议合并或替换重复素材以恢复完整投放效率。`,
        relatedMaterialIds: duplicateIds,
      });
    }

    return {
      channelId: ch.id,
      channelName: ch.name,
      allocatedBudget: budget,
      dailyCap: ch.dailyCap,
      capReached,
      marginalReturn: finalMR,
      expectedConversions,
      delayDiscount: discount,
      duplicatePenalty: penalty,
      anomalies,
      optimizationSteps: steps.get(ch.id)!,
      marginalReturnCurve: curves.get(ch.id)!,
      budgetReplay: replays.get(ch.id)!,
    };
  });

  const totalExpectedConversions = results.reduce(
    (sum, r) => sum + r.expectedConversions,
    0
  );

  const exhaustedChannels = results.filter((r) => r.capReached);
  const delayedChannels = results.filter((r) =>
    r.anomalies.some((a) => a.type === "conversion_delay")
  );
  const duplicateChannels = results.filter((r) =>
    r.anomalies.some((a) => a.type === "material_duplicate")
  );

  const summaryParts: string[] = [
    `总预算¥${totalBudget.toLocaleString()}，分配¥${(totalBudget - remaining).toLocaleString()}，剩余¥${remaining.toLocaleString()}，预期转化${totalExpectedConversions.toFixed(2)}次。`,
  ];

  if (exhaustedChannels.length > 0) {
    summaryParts.push(
      `预算耗尽：${exhaustedChannels.map((r) => `${r.channelName}(上限¥${r.dailyCap.toLocaleString()})`).join("、")}。`
    );
  }
  if (delayedChannels.length > 0) {
    summaryParts.push(
      `转化延迟：${delayedChannels.map((r) => `${r.channelName}(${r.anomalies.find((a) => a.type === "conversion_delay")?.explanation.match(/(\d+)天/)?.[0] ?? ""})`).join("、")}。`
    );
  }
  if (duplicateChannels.length > 0) {
    summaryParts.push(
      `素材重复：${duplicateChannels.map((r) => r.channelName).join("、")}。`
    );
  }

  return {
    totalBudget,
    remainingBudget: remaining,
    results,
    globalSummary: summaryParts.join(" "),
    totalExpectedConversions,
    totalRounds: round,
  };
}
