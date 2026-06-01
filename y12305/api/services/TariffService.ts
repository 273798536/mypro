import type { TariffTable, TariffTier } from '../../shared/types.js';
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

  validateTiers(tiers: TariffTier[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (tiers.length === 0) {
      errors.push('至少需要一个电价档位');
      return { valid: false, errors };
    }

    const sortedTiers = [...tiers].sort((a, b) => a.minKwh - b.minKwh);

    if (sortedTiers[0].minKwh !== 0) {
      errors.push('第一档的起始电量必须为 0');
    }

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];

      if (tier.maxKwh !== null && tier.maxKwh <= tier.minKwh) {
        errors.push(`${tier.tierName}: 上限电量必须大于下限电量`);
      }

      if (tier.pricePerKwh <= 0) {
        errors.push(`${tier.tierName}: 电价必须大于 0`);
      }

      if (nextTier && tier.maxKwh !== null && Math.abs(nextTier.minKwh - tier.maxKwh) > 0.001) {
        errors.push(`${tier.tierName} 与 ${nextTier.tierName} 之间存在间隙或重叠`);
      }
    }

    const lastTier = sortedTiers[sortedTiers.length - 1];
    if (lastTier.maxKwh !== null) {
      errors.push('最后一档必须无上界（maxKwh 为 null）');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
