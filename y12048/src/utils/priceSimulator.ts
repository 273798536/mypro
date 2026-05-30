import { PricePoint, PriceEvent } from '../types/game';
import { oracleSources } from './mockData';

export const isPriceJump = (currentPrice: number, previousPrice: number, threshold: number = 0.15): boolean => {
  const changeRate = Math.abs((currentPrice - previousPrice) / previousPrice);
  return changeRate > threshold;
};

export const calculatePrice = (basePrice: number, event: PriceEvent): number => {
  return basePrice * (1 + event.priceChange);
};

export const generatePricePoint = (
  price: number,
  event: PriceEvent,
  previousPrice: number,
  isConfirmed: boolean = true
): PricePoint => {
  const isJump = event.type === 'jump' || isPriceJump(price, previousPrice);
  
  const pricePoint: PricePoint = {
    timestamp: Date.now(),
    price,
    source: oracleSources[Math.floor(Math.random() * oracleSources.length)],
    isConfirmed,
    isJump,
  };
  
  if (isJump && event.verifier) {
    const alternativeChange = event.isMalicious ? event.priceChange * 0.3 : event.priceChange;
    pricePoint.jumpBranch = {
      alternativePrice: previousPrice * (1 + alternativeChange),
      verifier: event.verifier,
      status: 'pending',
    };
  }
  
  return pricePoint;
};

export const confirmPriceJump = (pricePoint: PricePoint, accept: boolean): PricePoint => {
  if (!pricePoint.jumpBranch) return pricePoint;
  
  return {
    ...pricePoint,
    isConfirmed: true,
    price: accept ? pricePoint.price : pricePoint.jumpBranch.alternativePrice,
    isJump: accept,
    jumpBranch: {
      ...pricePoint.jumpBranch,
      status: accept ? 'confirmed' : 'rejected',
    },
  };
};

export const calculateLiquidationPrice = (
  borrowAmount: number,
  collateralAmount: number,
  liquidationThreshold: number
): number => {
  return (borrowAmount * (liquidationThreshold / 100)) / collateralAmount;
};

export const calculateCollateralRatio = (
  collateralAmount: number,
  collateralPrice: number,
  borrowAmount: number
): number => {
  return ((collateralAmount * collateralPrice) / borrowAmount) * 100;
};

export const getPositionStatus = (
  currentRatio: number,
  liquidationThreshold: number
): 'safe' | 'warning' | 'danger' | 'liquidated' => {
  if (currentRatio <= liquidationThreshold) return 'liquidated';
  if (currentRatio <= liquidationThreshold * 1.1) return 'danger';
  if (currentRatio <= liquidationThreshold * 1.3) return 'warning';
  return 'safe';
};
