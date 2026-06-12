function computePosterior(prior, likelihood, evidence) {
  if (evidence === 0) return prior;
  return (likelihood * prior) / evidence;
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
  if (deltaPct > threshold * 100) {
    return { delta, deltaPct, isJump: true };
  }
  return { delta, deltaPct, isJump: false };
}

function classifyTrigger(deltaPct, unitStatus, isSupplement) {
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
  checkUnitStatus,
  detectJump,
  classifyTrigger,
  generateJumpExplanation,
};
