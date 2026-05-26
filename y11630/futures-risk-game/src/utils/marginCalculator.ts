import type { Position, Account, Contract } from '../types';
import { CONTRACTS } from '../constants/gameConfig';

export const getContract = (code: string): Contract | undefined => {
  return CONTRACTS.find(c => c.code === code);
};

export const calculateMarginRequired = (
  volume: number,
  price: number,
  contractCode: string
): number => {
  const contract = getContract(contractCode);
  if (!contract) return 0;
  return volume * price * contract.multiplier * contract.marginRate;
};

export const calculatePositionPnL = (position: Position): number => {
  const contract = getContract(position.contractCode);
  if (!contract) return 0;
  
  const priceDiff = position.direction === 'long'
    ? position.currentPrice - position.openPrice
    : position.openPrice - position.currentPrice;
  
  return priceDiff * position.volume * contract.multiplier;
};

export const calculateTotalUnrealizedPnL = (positions: Position[]): number => {
  return positions.reduce((total, pos) => total + calculatePositionPnL(pos), 0);
};

export const calculateTotalMarginRequired = (positions: Position[]): number => {
  return positions.reduce((total, pos) => total + pos.marginRequired, 0);
};

export const calculateEquity = (account: Account): number => {
  return account.totalCapital + account.unrealizedPnL;
};

export const calculateRiskLevel = (account: Account): number => {
  const equity = calculateEquity(account);
  if (equity <= 0) return 999;
  const totalMargin = calculateTotalMarginRequired(account.positions);
  return (totalMargin / equity) * 100;
};

export const calculateNewPrice = (oldPrice: number, changePercent: number): number => {
  return Math.round(oldPrice * (1 + changePercent / 100));
};

export const updatePositionPrices = (
  positions: Position[],
  contractCode: string,
  newPrice: number
): Position[] => {
  return positions.map(pos => {
    if (pos.contractCode !== contractCode) return pos;
    const updated = {
      ...pos,
      currentPrice: newPrice,
    };
    return {
      ...updated,
      marginRequired: calculateMarginRequired(pos.volume, newPrice, contractCode),
      unrealizedPnL: calculatePositionPnL(updated),
    };
  });
};

export const calculateMarginToAdd = (account: Account, targetRisk: number): number => {
  const currentMargin = calculateTotalMarginRequired(account.positions);
  const requiredEquity = currentMargin / (targetRisk / 100);
  const currentEquity = calculateEquity(account);
  return Math.max(0, requiredEquity - currentEquity);
};

export const canAddMargin = (account: Account, amount: number): boolean => {
  return account.availableCapital >= amount;
};
