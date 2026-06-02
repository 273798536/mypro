import type { TariffTable, TariffTier, TariffTableType, PeriodType } from '../../shared/types.js';
import { FileStorage } from './FileStorage.js';

function generateId(): string {
  return `tariff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export class TariffService {
  private storage: FileStorage<TariffTable>;

  constructor() {
    this.storage = new FileStorage<TariffTable>('tariffs.json');
  }

  getAll(): TariffTable[] {
    return this.storage.readAll().map(t => ({
      ...t,
      isExpired: this.checkIsExpired(t),
    }));
  }

  getById(id: string): TariffTable | undefined {
    const tariff = this.storage.findById(id);
    if (!tariff) return undefined;
    return {
      ...tariff,
      isExpired: this.checkIsExpired(tariff),
    };
  }

  create(data: Omit<TariffTable, 'id' | 'createdAt' | 'isExpired'>): TariffTable {
    const now = new Date().toISOString();
    const newTariff: TariffTable = {
      ...data,
      id: generateId(),
      createdAt: now,
      isExpired: false,
    };
    newTariff.isExpired = this.checkIsExpired(newTariff);
    return this.storage.create(newTariff);
  }

  update(id: string, data: Partial<Omit<TariffTable, 'id' | 'createdAt'>>): TariffTable | undefined {
    const existing = this.storage.findById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data };
    updated.isExpired = this.checkIsExpired(updated);

    return this.storage.update(id, updated);
  }

  delete(id: string): boolean {
    return this.storage.delete(id);
  }

  getActiveTariffs(referenceDate?: string): TariffTable[] {
    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    return this.getAll().filter(t => {
      const from = new Date(t.effectiveFrom);
      const to = new Date(t.effectiveTo);
      return refDate >= from && refDate <= to;
    });
  }

  getExpiredTariffs(): TariffTable[] {
    return this.getAll().filter(t => t.isExpired);
  }

  private checkIsExpired(tariff: TariffTable): boolean {
    const now = new Date();
    const effectiveTo = new Date(tariff.effectiveTo);
    return now > effectiveTo;
  }

  validateTiers(tiers: TariffTier[], tariffType: TariffTableType): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (tiers.length === 0) {
      errors.push('至少需要一个电价档位');
      return { valid: false, errors };
    }

    for (const tier of tiers) {
      if (tier.pricePerKwh <= 0) {
        errors.push(`${tier.tierName}: 电价必须大于 0`);
      }
      if (!tier.periodType) {
        errors.push(`${tier.tierName}: 必须设置时段类型 (periodType)`);
      }
    }

    if (tariffType === 'step') {
      const sortedTiers = [...tiers].sort((a, b) => a.minKwh - b.minKwh);

      if (sortedTiers[0].minKwh !== 0) {
        errors.push('阶梯电价第一档的起始电量必须为 0');
      }

      for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];

        if (tier.maxKwh !== null && tier.maxKwh <= tier.minKwh) {
          errors.push(`${tier.tierName}: 上限电量必须大于下限电量`);
        }

        if (nextTier && tier.maxKwh !== null && Math.abs(nextTier.minKwh - tier.maxKwh) > 0.001) {
          errors.push(`${tier.tierName} 与 ${nextTier.tierName} 之间存在间隙或重叠`);
        }
      }

      const lastTier = sortedTiers[sortedTiers.length - 1];
      if (lastTier.maxKwh !== null) {
        errors.push('阶梯电价最后一档必须无上界（maxKwh 为 null）');
      }

      const periodTypes = tiers.map(t => t.periodType);
      if (!periodTypes.every(p => p === 'none')) {
        errors.push('阶梯电价的档位时段类型必须全部为 "none"');
      }
    } else if (tariffType === 'tou') {
      const periodTypes = tiers.map(t => t.periodType);
      const uniquePeriods = [...new Set(periodTypes)];

      if (uniquePeriods.length !== periodTypes.length) {
        errors.push('峰谷电价的时段类型不能重复');
      }

      if (periodTypes.includes('none')) {
        errors.push('峰谷电价的档位必须设置具体的时段类型（peak/valley/flat）');
      }

      for (const tier of tiers) {
        if (tier.minKwh !== 0) {
          errors.push(`${tier.tierName}: 峰谷电价的档位起始电量必须为 0`);
        }
        if (tier.maxKwh !== null) {
          errors.push(`${tier.tierName}: 峰谷电价的档位必须无上界（maxKwh 为 null）`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
