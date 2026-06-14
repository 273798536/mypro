const EPSILON = 1e-9;

function validateParams(prior, likelihood, evidence) {
  const errors = [];

  if (typeof prior !== "number" || Number.isNaN(prior)) {
    errors.push("先验概率 prior 必须是数字");
  } else if (prior < -EPSILON || prior > 1 + EPSILON) {
    errors.push(`先验概率 prior 必须在 [0, 1] 之间，当前值 = ${prior}`);
  }

  if (typeof likelihood !== "number" || Number.isNaN(likelihood)) {
    errors.push("似然 likelihood 必须是数字");
  } else if (likelihood < -EPSILON || likelihood > 1 + EPSILON) {
    errors.push(`似然 likelihood 必须在 [0, 1] 之间，当前值 = ${likelihood}`);
  }

  if (typeof evidence !== "number" || Number.isNaN(evidence)) {
    errors.push("证据 evidence 必须是数字");
  } else if (evidence < EPSILON) {
    errors.push(`证据 evidence 必须大于 0，当前值 = ${evidence}`);
  }

  if (errors.length === 0) {
    const clampedPrior = clamp(prior, 0, 1);
    const clampedLikelihood = clamp(likelihood, 0, 1);
    const numerator = clampedPrior * clampedLikelihood;
    if (numerator - evidence > EPSILON) {
      errors.push(
        `贝叶斯一致性失败: prior(${clampedPrior}) * likelihood(${clampedLikelihood}) = ${numerator.toFixed(
          6
        )} > evidence(${evidence})，会产生 > 1 的后验概率。请将 evidence 调至 ≥ ${numerator.toFixed(4)}`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function computePosterior(prior, likelihood, evidence) {
  const clampedPrior = clamp(prior, 0, 1);
  const clampedLikelihood = clamp(likelihood, 0, 1);
  const safeEvidence = Math.max(evidence, EPSILON);
  if (safeEvidence < EPSILON) return clampedPrior;
  const raw = (clampedLikelihood * clampedPrior) / safeEvidence;
  return clamp(raw, 0, 1);
}

function validateAndComputePosterior(prior, likelihood, evidence) {
  const validation = validateParams(prior, likelihood, evidence);
  const posterior = computePosterior(prior, likelihood, evidence);
  return {
    validation,
    posterior,
    clamped: {
      prior: clamp(prior, 0, 1),
      likelihood: clamp(likelihood, 0, 1),
      evidence: Math.max(evidence, EPSILON),
    },
  };
}

function checkUnitStatus(unitInfo, batchUnitInfo) {
  if (!batchUnitInfo || Object.keys(batchUnitInfo).length === 0) {
    return { status: "missing", detail: "材料未提供单位信息" };
  }
  if (unitInfo && Object.keys(unitInfo).length > 0) {
    for (const key of Object.keys(unitInfo)) {
      if (batchUnitInfo[key] && batchUnitInfo[key] !== unitInfo[key]) {
        return {
          status: "suspect",
          detail: `单位不一致: 已有[${key}]=${unitInfo[key]}, 新材料[${key}]=${batchUnitInfo[key]}`,
        };
      }
    }
  }
  return { status: "ok", detail: "" };
}

function detectJump(oldPosterior, newPosterior, threshold) {
  if (oldPosterior === 0) return null;
  const delta = Math.abs(newPosterior - oldPosterior);
  const deltaPct = (delta / Math.abs(oldPosterior)) * 100;
  const jumpThreshold = threshold * 100;
  return { delta, deltaPct, isJump: deltaPct > jumpThreshold };
}

function classifyTrigger(deltaPct, unitStatus, isSupplement, changeType) {
  if (changeType === "suspend") return "unit";
  if (unitStatus === "suspect") return "unit";
  if (unitStatus === "missing") return "unit";
  if (isSupplement && deltaPct > 30) return "threshold";
  return "normal_record";
}

function generateJumpExplanation(triggerType, deltaPct, unitDetail) {
  switch (triggerType) {
    case "unit":
      return `单位问题导致跳变(偏差${deltaPct.toFixed(1)}%): ${unitDetail || "单位缺失或冲突"}`;
    case "threshold":
      return `阈值跳变(偏差${deltaPct.toFixed(1)}%): 补充材料使后验概率变化超过阈值`;
    case "normal_record":
      return `正常记录更新(偏差${deltaPct.toFixed(1)}%): 补充材料引起的常规更新`;
    default:
      return `未知原因跳变(偏差${deltaPct.toFixed(1)}%)`;
  }
}

module.exports = {
  computePosterior,
  validateParams,
  validateAndComputePosterior,
  checkUnitStatus,
  detectJump,
  classifyTrigger,
  generateJumpExplanation,
  EPSILON,
};
