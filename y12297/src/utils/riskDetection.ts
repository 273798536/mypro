import type {
  ProductArchive,
  YieldRange,
  ExplanationReport,
  RiskIssue,
  MaterialConflict,
} from '../../shared/types';
import { RISK_ISSUE_LABELS } from '../../shared/types';

function generateId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function detectRiskMisalignment(
  product: ProductArchive,
  yieldRange: YieldRange
): RiskIssue | null {
  const { riskLevel } = product;
  const { expectedMax, expectedMin, benchmark } = yieldRange;
  const midYield = (expectedMin + expectedMax) / 2;

  const expectedYieldByRisk: Record<number, [number, number]> = {
    1: [0, 4],
    2: [2, 6],
    3: [4, 9],
    4: [6, 15],
    5: [10, 30],
  };

  const [minAllowed, maxAllowed] = expectedYieldByRisk[riskLevel];

  if (midYield < minAllowed * 0.7) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'risk_misalignment',
      severity: 'warning',
      description: `${product.name}风险等级为R${riskLevel}，但预期收益中枢${midYield.toFixed(1)}%显著低于该风险等级合理区间下限${minAllowed}%的70%，存在高风险低收益错配`,
      sourceMaterials: [product.sourceMaterial, yieldRange.sourceMaterial],
      targetObject: `收益区间: ${expectedMin}%-${expectedMax}% vs 风险等级: R${riskLevel}`,
      detectedTime: Date.now(),
    };
  }

  if (midYield > maxAllowed * 1.3) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'risk_misalignment',
      severity: 'critical',
      description: `${product.name}风险等级为R${riskLevel}，但预期收益中枢${midYield.toFixed(1)}%显著高于该风险等级合理区间上限${maxAllowed}%的130%，存在低风险高收益错配，可能误导投资者`,
      sourceMaterials: [product.sourceMaterial, yieldRange.sourceMaterial],
      targetObject: `收益区间: ${expectedMin}%-${expectedMax}% vs 风险等级: R${riskLevel}`,
      detectedTime: Date.now(),
    };
  }

  if (benchmark > expectedMax * 1.1) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'risk_misalignment',
      severity: 'warning',
      description: `${product.name}业绩比较基准${benchmark}%高于预期收益上限${expectedMax}%的110%，基准设定可能偏高`,
      sourceMaterials: [product.sourceMaterial, yieldRange.sourceMaterial],
      targetObject: `业绩基准: ${benchmark}% vs 预期上限: ${expectedMax}%`,
      detectedTime: Date.now(),
    };
  }

  return null;
}

export function detectMaturityMissing(
  product: ProductArchive
): RiskIssue | null {
  const hasMaturityDate = !!product.maturityDate && product.maturityDate.trim() !== '';
  const hasTerm = !!product.term && product.term.trim() !== '';

  if (!hasMaturityDate && !hasTerm) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'maturity_missing',
      severity: 'critical',
      description: `${product.name}产品档案中缺少到期日和存续期限信息，投资者无法判断投资周期`,
      sourceMaterials: [product.sourceMaterial],
      targetObject: `产品档案: ${product.sourceMaterial} - 缺少maturityDate和term字段`,
      detectedTime: Date.now(),
    };
  }

  if (!hasMaturityDate) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'maturity_missing',
      severity: 'warning',
      description: `${product.name}产品档案中缺少具体到期日期，仅有存续期描述: ${product.term}`,
      sourceMaterials: [product.sourceMaterial],
      targetObject: `产品档案: ${product.sourceMaterial} - 缺少maturityDate字段`,
      detectedTime: Date.now(),
    };
  }

  if (!hasTerm) {
    return {
      id: generateId(),
      productId: product.id,
      type: 'maturity_missing',
      severity: 'warning',
      description: `${product.name}产品档案中缺少存续期限描述，仅有到期日期: ${product.maturityDate}`,
      sourceMaterials: [product.sourceMaterial],
      targetObject: `产品档案: ${product.sourceMaterial} - 缺少term字段`,
      detectedTime: Date.now(),
    };
  }

  return null;
}

export function detectYieldExaggeration(
  product: ProductArchive,
  yieldRange: YieldRange,
  report: ExplanationReport
): RiskIssue | null {
  const { expectedMax, historicalMax } = yieldRange;
  const { claimedYield, content, sourceMaterial, reporter } = report;

  if (claimedYield === undefined || claimedYield === null) {
    const yieldMatch = content.match(/(\d+(?:\.\d+)?)\s*%/g);
    if (yieldMatch) {
      const yields = yieldMatch.map((y) => parseFloat(y.replace('%', '')));
      const maxClaimed = Math.max(...yields);
      if (maxClaimed > expectedMax * 1.1) {
        return {
          id: generateId(),
          productId: product.id,
          type: 'yield_exaggeration',
          severity: 'critical',
          description: `${reporter}在《${sourceMaterial}》中提及的收益率${maxClaimed}%，超过产品说明书预期收益上限${expectedMax}%的110%，存在收益夸大嫌疑`,
          sourceMaterials: [sourceMaterial, yieldRange.sourceMaterial],
          targetObject: `讲解报告: ${sourceMaterial} - 声称收益${maxClaimed}% vs 产品说明书上限${expectedMax}%`,
          detectedTime: Date.now(),
        };
      }
    }
    return null;
  }

  if (claimedYield > expectedMax * 1.1) {
    const exaggerationPercent = (((claimedYield - expectedMax) / expectedMax) * 100).toFixed(1);
    return {
      id: generateId(),
      productId: product.id,
      type: 'yield_exaggeration',
      severity: 'critical',
      description: `${reporter}在《${sourceMaterial}》中声称收益率可达${claimedYield}%，较产品说明书预期上限${expectedMax}%夸大了${exaggerationPercent}%`,
      sourceMaterials: [sourceMaterial, yieldRange.sourceMaterial],
      targetObject: `讲解报告: ${sourceMaterial} - ${reporter}声称收益${claimedYield}%`,
      detectedTime: Date.now(),
    };
  }

  if (claimedYield > historicalMax * 1.2) {
    const exaggerationPercent = (((claimedYield - historicalMax) / historicalMax) * 100).toFixed(1);
    return {
      id: generateId(),
      productId: product.id,
      type: 'yield_exaggeration',
      severity: 'warning',
      description: `${reporter}在《${sourceMaterial}》中声称收益率可达${claimedYield}%，较历史最高收益${historicalMax}%高出${exaggerationPercent}%，缺乏历史数据支撑`,
      sourceMaterials: [sourceMaterial, yieldRange.sourceMaterial],
      targetObject: `讲解报告: ${sourceMaterial} - ${reporter}声称收益${claimedYield}%`,
      detectedTime: Date.now(),
    };
  }

  return null;
}

export function detectMaterialConflicts(
  products: ProductArchive[],
  yields: YieldRange[],
  reports: ExplanationReport[]
): MaterialConflict[] {
  const conflicts: MaterialConflict[] = [];

  products.forEach((product) => {
    const productYields = yields.filter((y) => y.productId === product.id);
    const productReports = reports.filter((r) => r.productId === product.id);

    if (productYields.length > 1) {
      const expectedMaxes = productYields.map((y) => y.expectedMax.toString());
      const uniqueMaxes = [...new Set(expectedMaxes)];
      if (uniqueMaxes.length > 1) {
        conflicts.push({
          productId: product.id,
          field: 'expectedMax',
          sources: productYields.map((y) => y.sourceMaterial),
          values: expectedMaxes.map((v) => v + '%'),
        });
      }
    }

    if (productReports.length > 1) {
      const claimedYields = productReports
        .filter((r) => r.claimedYield !== undefined)
        .map((r) => r.claimedYield!.toString());
      const uniqueClaimed = [...new Set(claimedYields)];
      if (uniqueClaimed.length > 1) {
        conflicts.push({
          productId: product.id,
          field: 'claimedYield',
          sources: productReports.map((r) => r.sourceMaterial),
          values: claimedYields.map((v) => v + '%'),
        });
      }
    }

    if (product.riskLevel && productYields.length > 0) {
      const y = productYields[0];
      if (y.benchmark > 0 && y.benchmark < y.expectedMin * 0.8) {
        conflicts.push({
          productId: product.id,
          field: 'benchmark_vs_expected',
          sources: [product.sourceMaterial, y.sourceMaterial],
          values: [`基准: ${y.benchmark}%`, `预期区间: ${y.expectedMin}%-${y.expectedMax}%`],
        });
      }
    }
  });

  return conflicts;
}

export function runAllRiskChecks(
  products: ProductArchive[],
  yields: YieldRange[],
  reports: ExplanationReport[]
): RiskIssue[] {
  const issues: RiskIssue[] = [];

  products.forEach((product) => {
    const productYield = yields.find((y) => y.productId === product.id);
    const productReport = reports.find((r) => r.productId === product.id);

    if (productYield) {
      const misalignment = detectRiskMisalignment(product, productYield);
      if (misalignment) issues.push(misalignment);
    }

    const maturityIssue = detectMaturityMissing(product);
    if (maturityIssue) issues.push(maturityIssue);

    if (productYield && productReport) {
      const exaggeration = detectYieldExaggeration(product, productYield, productReport);
      if (exaggeration) issues.push(exaggeration);
    }
  });

  return issues;
}

export function formatRiskIssue(issue: RiskIssue): string {
  const label = RISK_ISSUE_LABELS[issue.type];
  const severity = issue.severity === 'critical' ? '严重' : '警告';
  return `[${severity}] ${label}: ${issue.description}`;
}
