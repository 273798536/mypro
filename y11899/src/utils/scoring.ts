import { SupplierQuote, WeightConfig, DimensionScore, ScoredSupplier } from '@/types';

function normalizeMin(values: number[]): number[] {
  const validValues = values.filter(v => v > 0);
  if (validValues.length === 0) return values.map(() => 0);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  if (max === min) return values.map(() => 100);
  return values.map(v => v <= 0 ? 0 : ((max - v) / (max - min)) * 100);
}

function normalizeMax(values: number[]): number[] {
  const validValues = values.filter(v => v > 0);
  if (validValues.length === 0) return values.map(() => 0);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  if (max === min) return values.map(() => 100);
  return values.map(v => v <= 0 ? 0 : ((v - min) / (max - min)) * 100);
}

export function calculateDimensionScores(quotes: SupplierQuote[]): DimensionScore[] {
  const prices = quotes.map(q => q.price);
  const energies = quotes.map(q => q.energyConsumption);
  const afterSalesArr = quotes.map(q => q.afterSales);
  const deliveries = quotes.map(q => q.deliveryPeriod);

  const priceScores = normalizeMin(prices);
  const energyScores = normalizeMin(energies);
  const afterSalesScores = normalizeMax(afterSalesArr);
  const deliveryScores = normalizeMin(deliveries);

  return quotes.map((_, i) => ({
    price: Math.round(priceScores[i] * 100) / 100,
    energyConsumption: Math.round(energyScores[i] * 100) / 100,
    afterSales: Math.round(afterSalesScores[i] * 100) / 100,
    deliveryPeriod: Math.round(deliveryScores[i] * 100) / 100,
  }));
}

export function calculateWeightedScores(
  dimensionScores: DimensionScore[],
  weights: WeightConfig
): number[] {
  const totalWeight = weights.price + weights.energyConsumption + weights.afterSales + weights.deliveryPeriod;
  if (totalWeight === 0) return dimensionScores.map(() => 0);

  return dimensionScores.map(ds => {
    const raw =
      (ds.price * weights.price) / totalWeight +
      (ds.energyConsumption * weights.energyConsumption) / totalWeight +
      (ds.afterSales * weights.afterSales) / totalWeight +
      (ds.deliveryPeriod * weights.deliveryPeriod) / totalWeight;
    return Math.round(raw * 100) / 100;
  });
}

export function isWeightValid(weights: WeightConfig): boolean {
  const total = weights.price + weights.energyConsumption + weights.afterSales + weights.deliveryPeriod;
  return total === 100;
}

export function weightTotal(weights: WeightConfig): number {
  return weights.price + weights.energyConsumption + weights.afterSales + weights.deliveryPeriod;
}

export function scoreSuppliers(
  quotes: SupplierQuote[],
  weights: WeightConfig
): ScoredSupplier[] {
  const dimScores = calculateDimensionScores(quotes);
  const weightedScores = calculateWeightedScores(dimScores, weights);

  const indexed = quotes.map((q, i) => ({
    quote: q,
    dimensionScores: dimScores[i],
    weightedScore: weightedScores[i],
    hasAnomaly: q.price <= 0 || q.energyConsumption < 0 || q.afterSales <= 0 || q.deliveryPeriod <= 0,
  }));

  const valid = indexed.filter(item => !item.hasAnomaly);
  const invalid = indexed.filter(item => item.hasAnomaly);

  valid.sort((a, b) => b.weightedScore - a.weightedScore);

  let currentRank = 1;
  const ranked: ScoredSupplier[] = [];

  for (let i = 0; i < valid.length; i++) {
    if (i > 0 && valid[i].weightedScore === valid[i - 1].weightedScore) {
      ranked.push({
        ...valid[i],
        rank: ranked[i - 1].rank,
        eliminated: false,
      });
    } else {
      currentRank = i + 1;
      ranked.push({
        ...valid[i],
        rank: currentRank,
        eliminated: false,
      });
    }
  }

  for (const item of invalid) {
    const reasons: string[] = [];
    if (item.quote.price <= 0) reasons.push('价格异常');
    if (item.quote.energyConsumption < 0) reasons.push('能耗异常');
    if (item.quote.afterSales <= 0) reasons.push('售后异常');
    if (item.quote.deliveryPeriod <= 0) reasons.push('交付期异常');

    ranked.push({
      ...item,
      rank: 0,
      eliminated: true,
      eliminationReason: reasons.join('、'),
    });
  }

  return ranked;
}
