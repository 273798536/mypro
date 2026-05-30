export type Rarity = 'SSR' | 'SR' | 'R';

export type DuplicatePolicy = 'shards' | 'currency' | 'nothing';

export interface CardPool {
  id: string;
  name: string;
  ssrRate: number;
  srRate: number;
  rRate: number;
  hardPity: number;
  softPityStart: number;
  softPityIncrement: number;
  srHardPity: number;
  duplicatePolicy: DuplicatePolicy;
}

export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  poolId: string;
}

export interface PullRecord {
  id: string;
  cardId: string;
  cardName: string;
  cardRarity: Rarity;
  pullNumber: number;
  isPity: boolean;
  isSoftPity: boolean;
  isDuplicate: boolean;
  duplicateConversion: string;
  triggerReason: string;
  explanation: string;
  effectiveRate: number;
  pityCounterBefore: number;
  timestamp: number;
}

export interface PullSession {
  id: string;
  poolId: string;
  totalPulls: number;
  ssrPityCounter: number;
  srPityCounter: number;
  isActive: boolean;
  records: PullRecord[];
  obtainedCardIds: string[];
  shardCount: number;
  currencyCount: number;
}

export interface GachaState {
  cardPool: CardPool;
  cards: Card[];
  session: PullSession | null;
  lastPullResults: PullRecord[];
  showResult: boolean;

  setCardPool: (pool: Partial<CardPool>) => void;
  startSession: () => void;
  pull: (count: number) => void;
  closeResult: () => void;
  resetSession: () => void;
  importPool: (json: string) => boolean;
  exportPool: () => string;
}
