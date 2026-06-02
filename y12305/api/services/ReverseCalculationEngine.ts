import type {
  TariffTable,
  UsageRecord,
  TierCalculation,
  CalculationWarning,
  TraceNode,
  WarningType,
  PeriodType,
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

function getPeriodLabel(periodType: PeriodType): string {
  const labels: Record<PeriodType, string> = {
    peak: '峰时段',
    valley: '谷时段',
    flat: '平时段',
    none: '',
  };
  return labels[periodType];
}

function getPeriodUsage(record: UsageRecord, periodType: PeriodType): number | undefined {
  const mapping: Record<PeriodType, keyof UsageRecord> = {
    peak: 'peakUsage',
    valley: 'valleyUsage',
    flat: 'flatUsage',
    none: 'totalUsage',
  };
  return record[mapping[periodType]] as number | undefined;
}

function getPeriodFieldName(periodType: PeriodType): string {
  const mapping: Record<PeriodType, string> = {
    peak: 'peakUsage',
    valley: 'valleyUsage',
    flat: 'flatUsage',
    none: 'totalUsage',
  };
  return mapping[periodType];
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

  checkMissingPeriodUsage(record: UsageRecord, tiers: { periodType: PeriodType }[]): void {
    const requiredPeriods = tiers
      .map(t => t.periodType)
      .filter(p => p !== 'none');

    for (const periodType of requiredPeriods) {
      const usage = getPeriodUsage(record, periodType);
      if (usage === undefined || usage === null) {
        const fieldName = getPeriodFieldName(periodType);
        const periodLabel = getPeriodLabel(periodType);
        this.addWarning(
          'missing_period_usage',
          'error',
          `${periodLabel}用量 (${fieldName}) 缺失，无法进行峰谷电价核算`,
          fieldName,
          usage
        );
      }
    }
  }

  checkPeriodSumMismatch(record: UsageRecord): void {
    const peak = record.peakUsage ?? 0;
    const valley = record.valleyUsage ?? 0;
    const flat = record.flatUsage ?? 0;
    const periodSum = peak + valley + flat;

    if (record.totalUsage !== undefined) {
      const discrepancy = Math.abs(periodSum - record.totalUsage);
      if (discrepancy > 0.01) {
        this.addWarning(
          'period_sum_mismatch',
          'warning',
          `峰谷平用量之和 (${periodSum.toFixed(2)}kWh) 与总用量 (${record.totalUsage}kWh) 相差 ${discrepancy.toFixed(2)}kWh`,
          'totalUsage',
          record.totalUsage
        );
      }
    }
  }

  checkBillMismatch(calculatedBill: number, providedBill: number): void {
    const discrepancy = Math.abs(calculatedBill - providedBill);
    if (discrepancy > 0.01) {
      this.addWarning(
        'bill_mismatch',
        'warning',
        `计算总电费 (¥${calculatedBill.toFixed(2)}) 与账单总电费 (¥${providedBill.toFixed(2)}) 相差 ¥${discrepancy.toFixed(2)}，请核实数据`,
        'totalBill',
        providedBill
      );
    }
  }

  checkUnknownPeriodType(tiers: { periodType: PeriodType; tierName: string }[]): void {
    for (const tier of tiers) {
      if (tier.periodType === 'none') {
        this.addWarning(
          'unknown_period_type',
          'warning',
          `峰谷电价表中的档位 "${tier.tierName}" 未设置时段类型`,
          'tier.periodType',
          tier.periodType
        );
      }
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

    if (tariff.type === 'tou') {
      return this.calculateTOU(tariff, usageRecord);
    } else {
      return this.calculateStep(tariff, usageRecord);
    }
  }

  private calculateStep(
    tariff: TariffTable,
    usageRecord: UsageRecord
  ): {
    tierResults: TierCalculation[];
    calculatedTotal: number;
    discrepancy: number;
    totalCalculatedKwh: number;
    warnings: CalculationWarning[];
  } {
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

        const formula = `该档电费 = 剩余电费 ${remainingBill.toFixed(2)}元 ÷ 电价 ${tier.pricePerKwh}元/kWh = ${billedKwh.toFixed(4)}kWh × ${tier.pricePerKwh}元/kWh = ${billedAmount.toFixed(2)}元`;

        tierResults.push({
          tierId: tier.tierId,
          tierName: tier.tierName,
          periodType: tier.periodType,
          pricePerKwh: tier.pricePerKwh,
          billedKwh: Number(billedKwh.toFixed(4)),
          billedAmount: Number(billedAmount.toFixed(2)),
          formula,
          tierRange: formatTierRange(tier.minKwh, tier.maxKwh),
          calculationMode: 'reverse',
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
          periodType: tier.periodType,
          pricePerKwh: tier.pricePerKwh,
          billedKwh: Number(billedKwh.toFixed(4)),
          billedAmount: Number(billedAmount.toFixed(2)),
          formula,
          tierRange: formatTierRange(tier.minKwh, tier.maxKwh),
          calculationMode: 'reverse',
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

  private calculateTOU(
    tariff: TariffTable,
    usageRecord: UsageRecord
  ): {
    tierResults: TierCalculation[];
    calculatedTotal: number;
    discrepancy: number;
    totalCalculatedKwh: number;
    warnings: CalculationWarning[];
  } {
    this.warningDetector.checkMissingPeriodUsage(usageRecord, tariff.tiers);
    this.warningDetector.checkUnknownPeriodType(tariff.tiers);
    this.warningDetector.checkPeriodSumMismatch(usageRecord);

    const tierResults: TierCalculation[] = [];
    let totalCalculatedKwh = 0;
    let calculatedTotal = 0;

    const hasErrors = this.warningDetector.getWarnings().some(w => w.severity === 'error');

    if (hasErrors) {
      const discrepancy = Number((usageRecord.totalBill - calculatedTotal).toFixed(2));
      return {
        tierResults: [],
        calculatedTotal: 0,
        discrepancy,
        totalCalculatedKwh: 0,
        warnings: this.warningDetector.getWarnings(),
      };
    }

    for (const tier of tariff.tiers) {
      const periodUsage = getPeriodUsage(usageRecord, tier.periodType);

      if (periodUsage === undefined || periodUsage === null) {
        continue;
      }

      const billedKwh = periodUsage;
      const billedAmount = billedKwh * tier.pricePerKwh;

      const periodLabel = getPeriodLabel(tier.periodType);
      const fieldName = getPeriodFieldName(tier.periodType);
      const formula = `${periodLabel}电费 = ${fieldName} ${billedKwh.toFixed(2)}kWh × 电价 ${tier.pricePerKwh}元/kWh = ${billedAmount.toFixed(2)}元`;

      tierResults.push({
        tierId: tier.tierId,
        tierName: tier.tierName,
        periodType: tier.periodType,
        pricePerKwh: tier.pricePerKwh,
        billedKwh: Number(billedKwh.toFixed(4)),
        billedAmount: Number(billedAmount.toFixed(2)),
        formula,
        tierRange: formatTierRange(tier.minKwh, tier.maxKwh),
        calculationMode: 'forward',
      });

      totalCalculatedKwh += billedKwh;
      calculatedTotal += billedAmount;
    }

    this.warningDetector.checkBillMismatch(calculatedTotal, usageRecord.totalBill);

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
        type: tariff.type,
        effectiveFrom: tariff.effectiveFrom,
        effectiveTo: tariff.effectiveTo,
        isExpired: tariff.isExpired,
      },
      sourceRef: `tariffs.json:${tariff.id}`,
      children: tariff.tiers.map(tier => ({
        id: generateId(),
        type: 'tariff' as const,
        label: `${tier.tierName} (${formatTierRange(tier.minKwh, tier.maxKwh)})`,
        value: {
          pricePerKwh: tier.pricePerKwh,
          periodType: tier.periodType,
        },
        sourceRef: `tariffs.json:${tariff.id}:${tier.tierId}`,
        children: [],
      })),
    };

    const modeLabel = tariff.type === 'tou' ? '正向核算（峰谷电价）' : '逆向核算（阶梯电价）';
    const tierCalcNodes: TraceNode = {
      id: generateId(),
      type: 'tier_calc',
      label: `档位计算过程 (${modeLabel})`,
      value: {
        tierCount: tierResults.length,
        calculationMode: tariff.type === 'tou' ? 'forward' : 'reverse',
      },
      sourceRef: '',
      children: tierResults.map(result => ({
        id: generateId(),
        type: 'tier_calc' as const,
        label: `${result.tierName} 计算`,
        value: {
          billedKwh: result.billedKwh,
          billedAmount: result.billedAmount,
          pricePerKwh: result.pricePerKwh,
          periodType: result.periodType,
          calculationMode: result.calculationMode,
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
      label: '核算结果',
      value: {
        tariffType: tariff.type,
        calculationMode: tariff.type === 'tou' ? 'forward' : 'reverse',
        totalBill: usageRecord.totalBill,
        calculatedTotal: tierResults.reduce((sum, t) => sum + t.billedAmount, 0),
        totalCalculatedKwh: tierResults.reduce((sum, t) => sum + t.billedKwh, 0),
      },
      sourceRef: rootId,
      children,
    };
  }
}
