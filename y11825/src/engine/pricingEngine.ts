import type { OptionCard } from '../types';

const normalCDF = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) {
    return 1 - prob;
  }
  return prob;
};

const normalPDF = (x: number): number => {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
};

export const calculateOptionValue = (
  option: OptionCard,
  spotPrice: number,
  volatility: number,
  riskFreeRate: number = 0.03
): number => {
  const S = spotPrice;
  const K = option.strikePrice;
  const T = option.daysToExpiry / 365;
  const r = riskFreeRate;
  const sigma = volatility;

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let value: number;

  switch (option.type) {
    case 'CALL':
      value = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
      break;
    case 'PUT':
      value = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
      break;
    case 'STRADDLE': {
      const callValue = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
      const putValue = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
      value = callValue + putValue;
      break;
    }
    case 'STRANGLE': {
      const callValue = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
      const putValue = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
      value = callValue + putValue;
      break;
    }
    case 'BUTTERFLY': {
      const callValue = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
      const putValue = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
      value = Math.max(0, callValue + putValue) * 0.5;
      break;
    }
    default:
      value = 0;
  }

  return Math.round(value * 100) / 100;
};

export const calculateVegaImpact = (vega: number, volatilityChange: number): number => {
  return vega * volatilityChange * 100;
};

export const calculateMarginRequirement = (
  option: OptionCard,
  quantity: number,
  volatility: number,
  baseMarginRate: number = 0.15
): number => {
  const volatilityAdjustment = volatility / 0.2;
  const adjustedMargin = option.marginRequirement * volatilityAdjustment * quantity;
  return Math.round(adjustedMargin * 100) / 100;
};

export const calculateTowerValue = (
  option: OptionCard,
  towerLevel: number,
  spotPrice: number,
  volatility: number
): { currentValue: number; marginUsed: number } => {
  const quantity = towerLevel;
  const currentValue = calculateOptionValue(option, spotPrice, volatility) * quantity;
  const marginUsed = calculateMarginRequirement(option, quantity, volatility);

  return {
    currentValue: Math.round(currentValue * 100) / 100,
    marginUsed: Math.round(marginUsed * 100) / 100,
  };
};

export const calculatePortfolioValue = (
  towers: { option: OptionCard; level: number }[],
  spotPrice: number,
  volatility: number
): number => {
  return towers.reduce((total, tower) => {
    const { currentValue } = calculateTowerValue(
      tower.option,
      tower.level,
      spotPrice,
      volatility
    );
    return total + currentValue;
  }, 0);
};

export const calculateTotalMarginUsed = (
  towers: { option: OptionCard; level: number }[],
  volatility: number
): number => {
  return towers.reduce((total, tower) => {
    const { marginUsed } = calculateTowerValue(
      tower.option,
      tower.level,
      100,
      volatility
    );
    return total + marginUsed;
  }, 0);
};
