import { CashFlowRecord, Currency } from '../types';
import { amountToHeight } from './colorMapper';

export interface BarPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  height: number;
  color: string;
  isNegative: boolean;
  hasAnomaly: boolean;
  anomalyType: string | null;
}

export function buildBarGeometry(
  records: CashFlowRecord[],
  currencies: string[],
  maxAbsAmount: number
): BarPosition[] {
  const positions: BarPosition[] = [];
  const currencySpacing = 3;
  const dateSpacing = 0.8;
  const currencyCount = currencies.length;

  const sortedDates = [...new Set(records.map(r => r.flowDate))].sort();
  const dateIndexMap = new Map(sortedDates.map((d, i) => [d, i]));

  for (const record of records) {
    const currencyIdx = currencies.indexOf(record.currency);
    const dateIdx = dateIndexMap.get(record.flowDate) || 0;

    const x = (currencyIdx - currencyCount / 2 + 0.5) * currencySpacing;
    const z = (dateIdx - sortedDates.length / 2 + 0.5) * dateSpacing;
    const height = amountToHeight(record.amount, maxAbsAmount);
    const y = record.amount >= 0 ? height / 2 : -height / 2;

    positions.push({
      id: record.id,
      x,
      y,
      z,
      height: Math.max(height, 0.1),
      color: '',
      isNegative: record.amount < 0,
      hasAnomaly: record.riskLevel >= 4 || Math.abs(record.exchangeRate - record.plannedRate) / Math.max(record.plannedRate, 0.0001) > 0.03,
      anomalyType: null,
    });
  }

  return positions;
}

export function getTerrainBounds(records: CashFlowRecord[], currencies: string[]): {
  minX: number; maxX: number; minZ: number; maxZ: number;
} {
  const currencyCount = currencies.length;
  const sortedDates = [...new Set(records.map(r => r.flowDate))].sort();
  const currencySpacing = 3;
  const dateSpacing = 0.8;

  return {
    minX: -currencyCount / 2 * currencySpacing,
    maxX: currencyCount / 2 * currencySpacing,
    minZ: -sortedDates.length / 2 * dateSpacing,
    maxZ: sortedDates.length / 2 * dateSpacing,
  };
}

export function getMaxAbsAmount(records: CashFlowRecord[]): number {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => Math.abs(r.amount)));
}

export { Currency };