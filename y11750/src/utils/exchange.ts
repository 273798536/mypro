import { GAME_CONFIG } from '@/constants/config';

export function generateExchangeRate(prevRate: number): number {
  const { VOLATILITY, BASE_EXCHANGE_RATE } = GAME_CONFIG;
  const change = (Math.random() - 0.5) * 2 * VOLATILITY;
  let newRate = prevRate * (1 + change);
  const minRate = BASE_EXCHANGE_RATE * 0.7;
  const maxRate = BASE_EXCHANGE_RATE * 1.3;
  newRate = Math.max(minRate, Math.min(maxRate, newRate));
  return Math.round(newRate * 10000) / 10000;
}

export function calculateForwardRate(spotRate: number, deliveryRounds: number): number {
  const { FORWARD_RATE_SPREAD } = GAME_CONFIG;
  const forwardPremium = FORWARD_RATE_SPREAD * deliveryRounds * 0.1;
  return Math.round((spotRate * (1 + forwardPremium)) * 10000) / 10000;
}

export function calculateOrderValueRMB(
  amount: number,
  unitPrice: number,
  exchangeRate: number
): number {
  return amount * unitPrice * exchangeRate;
}

export function calculateContractFee(amount: number, lockedRate: number, feeRate: number): number {
  return Math.round(amount * lockedRate * feeRate * 100) / 100;
}

export function calculateOverHedgingPenalty(
  excessAmount: number,
  lockedRate: number,
  penaltyRate: number
): number {
  return Math.round(excessAmount * lockedRate * penaltyRate * 100) / 100;
}
