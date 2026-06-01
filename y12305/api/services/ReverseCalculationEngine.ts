import type {
  TariffTable,
  UsageRecord,
  TierCalculation,
  CalculationWarning,
  TraceNode,
  WarningType,
} from '../../shared/types.js';

function generateId(): string {
  return `calc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTierRange(minKwh: number, maxKwh: number | null): string {
  if (maxKwh === null) {
    return `${minKwh}kWh 以上`;
  }
  return `${minKwh}kWh - ${maxKwh}kWh`;
}

export class WarningDetector {
  private warnings: CalculationWarning[] = [];

  addWarning(
    type: WarningType,
    severity: 'error' | 'warning' | 'info',
    message: string,
    sourceField: string,
    sourceValue: unknown
  ): void {
    this.warnings.push({
      type,
      severity,
      message,
      sourceField,
      sourceValue,
      traceId: generateId(),
    });
  }

  checkTariffExpiry(tariff: TariffTable, usageDate: string): void {
    const recordDate = new Date(usageDate);
    const effectiveFrom = new Date(tariff.effectiveFrom);
    const effectiveTo = new Date(tariff.effectiveTo);

    if (recordDate < effectiveFrom || recordDate > effectiveTo) {
      this.addWarning(
        'expired_tariff',
        'warning',
        `用电日期 ${usageDate} 超出电价表有效期 (${tariff.effectiveFrom} 至 ${tariff.effectiveTo})，计算结果仅供参考`,
        'tariff.effectiveTo',
        tariff.effectiveTo
      );
    }
  }

  checkNegativeUsage(record: UsageRecord): void {
    const usageFields: Array<keyof UsageRecord> = ['peakUsage', 'valleyUsage', 'flatUsage', 'totalUsage'];

    for (const field of usageFields) {
      const value = record[field];
      if (typeof value === 'number' && value < 0) {
        this.addWarning(
          'negative_usage',
          'error',
          `${field} 出现负值 (${value}kWh)，请检查原始数据`,
          field as string,
          value
        );
      }
    }
  }

  checkBoundaryTier(
    totalKwh: number,
    tierMin: number,
    tierMax: number | null,
    tierName: string
  ): void {
    const epsilon = 0.0001;

    if (Math.abs(totalKwh - tierMin) < epsilon) {
      this.addWarning(
        'boundary_tier',
        'info',
        `总用电量 ${totalKwh.toFixed(2)}kWh 恰好等于 ${tierName} 下限 ${tierMin}kWh`,
        'totalCalculatedKwh',
        totalKwh
      );
    }

    if (tierMax !== null && Math.abs(totalKwh - tierMax) < epsilon) {
      this.addWarning(
        'boundary_tier',
        'info',
        `总用电量 ${totalKwh.toFixed(2)}kWh 恰好等于 ${tierName} 上限 ${tierMax}kWh`,
        'totalCalculatedKwh',
        totalKwh
      );
    }
  }

  checkTotalMismatch(calculatedTotal: number, providedTotal: number | undefined): void {
    if (providedTotal === undefined) return;

    const discrepancy = Math.abs(calculatedTotal - providedTotal);
    if (discrepancy > 0.01) {
      this.addWarning(
        'mismatch_total',
        'warning',
        `计算总用电量 ${calculatedTotal.toFixed(2)}kWh 与提供的总用量 ${providedTotal}kWh 相差 ${discrepancy.toFixed(2)}kWh`,
        'totalUsage',
        providedTotal
      );
    }
  }

  checkTariffBoundary(
    remainingBill: number,
    tierIndex: number,
    totalTiers: number,
    accumulatedBill: number
  ): void {
    if (tierIndex === totalTiers - 1 && remainingBill > 0 && accumulatedBill > 0) {
      this.addWarning(
        'tariff_boundary',
        'info',
        `用电量已达最高档位，请注意核对最高档电量是否合理`,
        'tierIndex',
        tierIndex
      );
    }
  }

  getWarnings(): CalculationWarning[] {
    return [...this.warnings];
  }
}

export class ReverseCalculationEngine {
  private warningDetector: WarningDetector;

  constructor() {
    this.warningDetector = new WarningDetector();
  }

  calculate(
    tariff: TariffTable,
    usageRecord: UsageRecord,
    options: { skipNegativeCheck?: boolean } = {}
  ): {
    tierResults: TierCalculation[];
    calculatedTotal: number;
    discrepancy: number;
    totalCalculatedKwh: number;
    warnings: CalculationWarning[];
  } {
    this.warningDetector = new WarningDetector();

    this.warningDetector.checkTariffExpiry(tariff, usageRecord.recordDate);

    if (!options.skipNegativeCheck) {
      this.warningDetector.checkNegativeUsage(usageRecord);
    }

    const sortedTiers = [...tariff.tiers].sort((a, b) => a.minKwh - b.minKwh);

    const tierResults: TierCalculation[] = [];
    let remainingBill = usageRecord.totalBill;
    let totalCalculatedKwh = 0;
    let calculatedTotal = 0;

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const tierRange = tier.maxKwh !== null ? tier.maxKwh - tier.minKwh : Infinity;
      const maxTierCost = tierRange === Infinity ? Infinity : tierRange * tier.pricePerKwh;

      this.warningDetector.checkTariffBoundary(remainingBill, i, sortedTiers.length, calculatedTotal);

      if (remainingBill <= maxTierCost) {
        const billedKwh = remainingBill / tier.pricePerKwh;
        const billedAmount = billedKwh * tier.pricePerKwh;

        const maxKwhDisplay = tier.maxKwh === null ? '∞' : tier.maxKwh;
        const formula = `该档电费 = 剩余电费 ${remainingBill.toFixed(2)}元 ÷ 电价 ${tier.pricePerKwh}元/kWh = ${billedKwh.toFixed(4)}kWh × ${tier.pricePerKwh}元/kWh = ${billedAmount.toFixed(2)}元`;

        tierResults.push({
          tierId: tier.tierId,
          tierName: tier.tierName,
          pricePerKwh: tier.pricePerKwh,
          billedKwh: Number(billedKwh.toFixed(4)),
          billedAmount: Number(billedAmount.toFixed(2)),
          formula,
          tierRange: formatTierRange(tier.minKwh, tier.maxKwh),
        });

        totalCalculatedKwh += billedKwh;
        calculatedTotal += billedAmount;
        remainingBill = 0;

        this.warningDetector.checkBoundaryTier(totalCalculatedKwh, tier.minKwh, tier.maxKwh, tier.tierName);
        break;
      } else {
        const billedKwh = tierRange === Infinity ? remainingBill / tier.pricePerKwh : tierRange;
        const billedAmount = billedKwh * tier.pricePerKwh;

        const formula = `该档电费 = 档位电量 ${billedKwh.toFixed(0)}kWh × 电价 ${tier.pricePerKwh}元/kWh = ${billedAmount.toFixed(2)}元`;

        tierResults.push({
          tierId: tier.tierId,
          tierName: tier.tierName,
          pricePerKwh: tier.pricePerKwh,
          billedKwh: Number(billedKwh.toFixed(4)),
          billedAmount: Number(billedAmount.toFixed(2)),
          formula,
          tierRange: formatTierRange(tier.minKwh, tier.maxKwh),
        });

        totalCalculatedKwh += billedKwh;
        calculatedTotal += billedAmount;
        remainingBill -= billedAmount;
      }
    }

    if (remainingBill > 0.01) {
      const lastTier = sortedTiers[sortedTiers.length - 1];
      const extraKwh = remainingBill / lastTier.pricePerKwh;
      const extraAmount = extraKwh * lastTier.pricePerKwh;

      const lastResult = tierResults[tierResults.length - 1];
      lastResult.billedKwh = Number((lastResult.billedKwh + extraKwh).toFixed(4));
      lastResult.billedAmount = Number((lastResult.billedAmount + extraAmount).toFixed(2));
      lastResult.formula = `${lastResult.formula} (含超出部分 ${extraKwh.toFixed(4)}kWh)`;

      totalCalculatedKwh += extraKwh;
      calculatedTotal += extraAmount;
    }

    this.warningDetector.checkTotalMismatch(totalCalculatedKwh, usageRecord.totalUsage);

    const discrepancy = Number((usageRecord.totalBill - calculatedTotal).toFixed(2));

    return {
      tierResults,
      calculatedTotal: Number(calculatedTotal.toFixed(2)),
      discrepancy,
      totalCalculatedKwh: Number(totalCalculatedKwh.toFixed(4)),
      warnings: this.warningDetector.getWarnings(),
    };
  }

  generateTraceTree(
    tariff: TariffTable,
    usageRecord: UsageRecord,
    tierResults: TierCalculation[],
    warnings: CalculationWarning[]
  ): TraceNode {
    const rootId = generateId();

    const children: TraceNode[] = [];

    const inputNode: TraceNode = {
      id: generateId(),
      type: 'input',
      label: '原始输入数据',
      value: {
        recordDate: usageRecord.recordDate,
        totalBill: usageRecord.totalBill,
        peakUsage: usageRecord.peakUsage,
        valleyUsage: usageRecord.valleyUsage,
        flatUsage: usageRecord.flatUsage,
        totalUsage: usageRecord.totalUsage,
      },
      sourceRef: `usage-records.json:${usageRecord.id}`,
      description: `来源文件: ${usageRecord.sourceFile}`,
      children: [],
    };

    const tariffNode: TraceNode = {
      id: generateId(),
      type: 'tariff',
      label: '电价表配置',
      value: {
        name: tariff.name,
        effectiveFrom: tariff.effectiveFrom,
        effectiveTo: tariff.effectiveTo,
        isExpired: tariff.isExpired,
      },
      sourceRef: `tariffs.json:${tariff.id}`,
      children: tariff.tiers.map(tier => ({
        id: generateId(),
        type: 'tariff' as const,
        label: `${tier.tierName} (${formatTierRange(tier.minKwh, tier.maxKwh)})`,
        value: { pricePerKwh: tier.pricePerKwh },
        sourceRef: `tariffs.json:${tariff.id}:${tier.tierId}`,
        children: [],
      })),
    };

    const tierCalcNodes: TraceNode = {
      id: generateId(),
      type: 'tier_calc',
      label: '档位计算过程',
      value: { tierCount: tierResults.length },
      sourceRef: '',
      children: tierResults.map(result => ({
        id: generateId(),
        type: 'tier_calc' as const,
        label: `${result.tierName} 计算`,
        value: {
          billedKwh: result.billedKwh,
          billedAmount: result.billedAmount,
          pricePerKwh: result.pricePerKwh,
        },
        formula: result.formula,
        sourceRef: result.tierId,
        children: [],
      })),
    };

    if (warnings.length > 0) {
      const warningNode: TraceNode = {
        id: generateId(),
        type: 'warning',
        label: `异常检测 (${warnings.length} 条)`,
        value: { warningCount: warnings.length },
        sourceRef: '',
        children: warnings.map(w => ({
          id: generateId(),
          type: 'warning' as const,
          label: w.message,
          value: { type: w.type, severity: w.severity, sourceField: w.sourceField },
          sourceRef: w.traceId,
          description: `来源字段: ${w.sourceField}`,
          children: [],
        })),
      };
      children.push(warningNode);
    }

    children.unshift(inputNode, tariffNode, tierCalcNodes);

    return {
      id: rootId,
      type: 'result',
      label: '逆向核算结果',
      value: {
        totalBill: usageRecord.totalBill,
        calculatedTotal: tierResults.reduce((sum, t) => sum + t.billedAmount, 0),
        totalCalculatedKwh: tierResults.reduce((sum, t) => sum + t.billedKwh, 0),
      },
      sourceRef: rootId,
      children,
    };
  }
}
