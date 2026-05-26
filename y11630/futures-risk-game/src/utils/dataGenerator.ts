import { v4 as uuidv4 } from 'uuid';
import type { Account, Position, MarketEvent, EventType } from '../types';
import { CONTRACTS, ACCOUNT_NAMES, MARKET_EVENTS, GAME_CONFIG } from '../constants/gameConfig';
import { calculateMarginRequired, calculatePositionPnL } from './marginCalculator';

const generateId = (): string => uuidv4();

export const generateInitialPositions = (accountId: string): Position[] => {
  const positions: Position[] = [];
  const numPositions = Math.floor(Math.random() * 2) + 1;
  const usedContracts = new Set<string>();
  
  for (let i = 0; i < numPositions; i++) {
    let contractIndex: number;
    do {
      contractIndex = Math.floor(Math.random() * CONTRACTS.length);
    } while (usedContracts.has(CONTRACTS[contractIndex].code));
    
    usedContracts.add(CONTRACTS[contractIndex].code);
    const contract = CONTRACTS[contractIndex];
    
    const direction: 'long' | 'short' = Math.random() > 0.5 ? 'long' : 'short';
    const volume = Math.floor(Math.random() * 10) + 1;
    const priceVariation = (Math.random() - 0.5) * 0.02;
    const openPrice = Math.round(contract.initialPrice * (1 + priceVariation));
    
    const position: Position = {
      id: generateId(),
      accountId,
      contractCode: contract.code,
      volume,
      openPrice,
      currentPrice: openPrice,
      direction,
      marginRequired: 0,
      unrealizedPnL: 0,
    };
    
    position.marginRequired = calculateMarginRequired(volume, openPrice, contract.code);
    position.unrealizedPnL = calculatePositionPnL(position);
    
    positions.push(position);
  }
  
  return positions;
};

export const generateInitialAccounts = (count: number): Account[] => {
  const accounts: Account[] = [];
  const shuffledNames = [...ACCOUNT_NAMES].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count; i++) {
    const accountId = generateId();
    const positions = generateInitialPositions(accountId);
    const totalMargin = positions.reduce((sum, pos) => sum + pos.marginRequired, 0);
    const totalCapital = Math.round(totalMargin * (1.5 + Math.random() * 0.5));
    
    const account: Account = {
      id: accountId,
      name: shuffledNames[i % shuffledNames.length],
      totalCapital,
      availableCapital: Math.round(totalCapital * 0.3),
      marginBalance: totalMargin,
      unrealizedPnL: 0,
      equity: totalCapital,
      riskLevel: (totalMargin / totalCapital) * 100,
      status: 'normal',
      positions,
    };
    
    accounts.push(account);
  }
  
  return accounts;
};

const weightedRandom = <T extends { weight: number }>(items: T[]): T => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  
  return items[0];
};

export const generateMarketEvent = (
  roundNumber: number,
  consecutiveExtremeCount: number,
  lastExtremeDirection: 'up' | 'down' | null
): MarketEvent => {
  const contractIndex = Math.floor(Math.random() * CONTRACTS.length);
  const contract = CONTRACTS[contractIndex];
  
  const isExtreme = Math.random() < 0.2 || consecutiveExtremeCount >= 2;
  const willContinueTrend = consecutiveExtremeCount >= 1 && Math.random() < 0.6;
  
  let eventType: EventType;
  let priceChangePercent: number;
  let description: string;
  
  if (isExtreme) {
    if (willContinueTrend && lastExtremeDirection) {
      if (lastExtremeDirection === 'up') {
        eventType = 'extreme_rise';
        priceChangePercent = GAME_CONFIG.EXTREME_PRICE_CHANGE + Math.random() * 5;
        const event = weightedRandom(MARKET_EVENTS.extreme_up);
        description = `${contract.name} ${event.description}`;
      } else {
        eventType = 'extreme_fall';
        priceChangePercent = -(GAME_CONFIG.EXTREME_PRICE_CHANGE + Math.random() * 5);
        const event = weightedRandom(MARKET_EVENTS.extreme_down);
        description = `${contract.name} ${event.description}`;
      }
    } else {
      const direction = Math.random() > 0.5 ? 'up' : 'down';
      if (direction === 'up') {
        eventType = 'extreme_rise';
        priceChangePercent = GAME_CONFIG.EXTREME_PRICE_CHANGE + Math.random() * 5;
        const event = weightedRandom(MARKET_EVENTS.extreme_up);
        description = `${contract.name} ${event.description}`;
      } else {
        eventType = 'extreme_fall';
        priceChangePercent = -(GAME_CONFIG.EXTREME_PRICE_CHANGE + Math.random() * 5);
        const event = weightedRandom(MARKET_EVENTS.extreme_down);
        description = `${contract.name} ${event.description}`;
      }
    }
  } else {
    const direction = Math.random() > 0.5 ? 'up' : 'down';
    if (direction === 'up') {
      eventType = 'price_rise';
      priceChangePercent = Math.random() * 3;
      const event = weightedRandom(MARKET_EVENTS.normal_up);
      description = `${contract.name} ${event.description}`;
    } else {
      eventType = 'price_fall';
      priceChangePercent = -Math.random() * 3;
      const event = weightedRandom(MARKET_EVENTS.normal_down);
      description = `${contract.name} ${event.description}`;
    }
  }
  
  return {
    id: generateId(),
    roundNumber,
    contractCode: contract.code,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
    eventType,
    description,
    isExtreme,
    timestamp: Date.now(),
  };
};

export const getExtremeDirection = (eventType: EventType): 'up' | 'down' | null => {
  if (eventType === 'extreme_rise') return 'up';
  if (eventType === 'extreme_fall') return 'down';
  return null;
};
