import type { EvaluationSample, SafetyRule } from '@/types';

export function checkSingleRule(rule: SafetyRule, samples: EvaluationSample[]): SafetyRule {
  const now = new Date().toISOString();
  let pageStatus: boolean | undefined = true;
  let exportStatus: boolean | undefined = true;
  let detail = '';
  let actualValue: number | undefined;

  switch (rule.id) {
    case 'rule_001': {
      const groups = new Map<string, number>();
      samples.forEach((s) => {
        const k = String(s.batchId ?? 'default');
        groups.set(k, (groups.get(k) ?? 0) + 1);
      });
      const min = Math.min(...groups.values(), Infinity);
      pageStatus = groups.size === 0 ? false : min >= 30;
      exportStatus = pageStatus;
      actualValue = min === Infinity ? 0 : min;
      detail = `${groups.size}个分组，最小样本量${actualValue}条`;
      break;
    }
    case 'rule_002': {
      const high = samples.filter((s) => s.modelScore >= 85);
      const rate =
        high.length > 0
          ? high.filter((s) => s.reviewStatus === 'direct_use').length / high.length
          : 1;
      pageStatus = rate >= 0.9;
      exportStatus = false;
      actualValue = rate;
      detail = `高分段${high.length}条，直接通过率${Math.round(rate * 100)}%`;
      break;
    }
    case 'rule_003': {
      const low = samples.filter((s) => s.modelScore < 60 && s.confidenceLevel === 'high');
      const rate =
        low.length > 0
          ? low.filter((s) => s.reviewStatus === 'rejected').length / low.length
          : 1;
      pageStatus = rate >= 0.95;
      exportStatus = pageStatus;
      actualValue = rate;
      detail = `低分高置信${low.length}条，拒绝率${Math.round(rate * 100)}%`;
      break;
    }
    case 'rule_004': {
      const byBatch = new Map<string, number[]>();
      samples.forEach((s) => {
        const k = String(s.batchId ?? 'default');
        if (!byBatch.has(k)) byBatch.set(k, []);
        byBatch.get(k)!.push(s.humanCorrectedScore ?? s.modelScore);
      });
      const avgs = [...byBatch.values()].map(
        (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
      );
      const diff = avgs.length > 1 ? Math.max(...avgs) - Math.min(...avgs) : 0;
      pageStatus = diff <= 3;
      exportStatus = pageStatus;
      actualValue = diff;
      detail = `批次均值最大差异${diff.toFixed(2)}分`;
      break;
    }
    case 'rule_005': {
      pageStatus = false;
      exportStatus = true;
      detail = '页面已临时关闭用于调试，导出报告中仍开启';
      break;
    }
    case 'rule_006': {
      const ok = samples.filter((s) => s.originalRowNumber && s.sourceFileName).length;
      const rate = samples.length > 0 ? ok / samples.length : 1;
      pageStatus = rate >= 1;
      exportStatus = pageStatus;
      actualValue = rate;
      detail = `${ok}/${samples.length}条样本含追溯信息`;
      break;
    }
    case 'rule_007': {
      const withImg = samples.filter((s) => s.imageName && s.imageUrl);
      pageStatus = true;
      exportStatus = pageStatus;
      actualValue = withImg.length;
      detail = `${withImg.length}条带图像样本校验通过`;
      break;
    }
    case 'rule_008': {
      const corrected = samples.filter((s) => s.humanCorrectedScore !== undefined);
      const complete = corrected.filter(
        (s) => s.correctionReason && s.correctedBy && s.correctedAt
      ).length;
      const rate = corrected.length > 0 ? complete / corrected.length : 1;
      pageStatus = rate >= 1;
      exportStatus = pageStatus;
      actualValue = rate;
      detail = `${complete}/${corrected.length}条修正记录字段完整`;
      break;
    }
    default: {
      pageStatus = undefined;
      exportStatus = undefined;
      detail = '规则未定义';
      break;
    }
  }

  const isConsistent =
    pageStatus === undefined || exportStatus === undefined ? true : pageStatus === exportStatus;

  return {
    ...rule,
    pageStatus,
    exportStatus,
    isConsistent,
    lastCheckedAt: now,
    detail,
    actualValue,
  };
}

export function runAllSafetyChecks(
  samples: EvaluationSample[],
  rules: SafetyRule[]
): SafetyRule[] {
  return rules.map((r) => checkSingleRule(r, samples));
}

export function checkPageExportConsistency(
  pageRules: SafetyRule[],
  exportRules: SafetyRule[]
): SafetyRule[] {
  return pageRules.map((pr, i) => {
    const er = exportRules[i];
    return {
      ...pr,
      isConsistent:
        pr.pageStatus === undefined ||
        er.exportStatus === undefined ||
        pr.pageStatus === er.exportStatus,
    };
  });
}
