import { create } from 'zustand';
import type { GachaState, CardPool, PullSession, PullRecord } from '@/types';
import {
  DEFAULT_POOL,
  getDefaultCards,
  executePull,
  DUPLICATE_SHARD_MAP,
  DUPLICATE_CURRENCY_MAP,
} from '@/utils/gachaEngine';

function createSession(poolId: string): PullSession {
  return {
    id: `session-${Date.now()}`,
    poolId,
    totalPulls: 0,
    ssrPityCounter: 0,
    srPityCounter: 0,
    isActive: true,
    records: [],
    obtainedCardIds: [],
    shardCount: 0,
    currencyCount: 0,
  };
}

export const useGachaStore = create<GachaState>((set, get) => ({
  cardPool: { ...DEFAULT_POOL },
  cards: getDefaultCards(DEFAULT_POOL.id),
  session: null,
  lastPullResults: [],
  showResult: false,

  setCardPool: (partial: Partial<CardPool>) => {
    const current = get().cardPool;
    const updated = { ...current, ...partial };
    const rRate = Math.max(0, 1 - updated.ssrRate - updated.srRate);
    updated.rRate = Math.round(rRate * 1000) / 1000;
    set({
      cardPool: updated,
      cards: getDefaultCards(updated.id),
    });
  },

  startSession: () => {
    const { cardPool } = get();
    set({ session: createSession(cardPool.id) });
  },

  pull: (count: number) => {
    const { cardPool, cards, session } = get();
    if (!session || !session.isActive) return;

    let ssrCounter = session.ssrPityCounter;
    let srCounter = session.srPityCounter;
    let totalPulls = session.totalPulls;
    const obtainedCardIds = [...session.obtainedCardIds];
    const newRecords: PullRecord[] = [];
    let shardGain = 0;
    let currencyGain = 0;

    for (let i = 0; i < count; i++) {
      totalPulls++;
      const record = executePull(cardPool, cards, ssrCounter, srCounter, obtainedCardIds, totalPulls);
      newRecords.push(record);

      if (record.cardRarity === 'SSR') {
        ssrCounter = 0;
      } else {
        ssrCounter++;
      }

      if (record.cardRarity === 'SR') {
        srCounter = 0;
      } else {
        srCounter++;
      }

      if (!record.isDuplicate && !obtainedCardIds.includes(record.cardId)) {
        obtainedCardIds.push(record.cardId);
      }

      if (record.isDuplicate) {
        if (cardPool.duplicatePolicy === 'shards') {
          shardGain += DUPLICATE_SHARD_MAP[record.cardRarity];
        } else if (cardPool.duplicatePolicy === 'currency') {
          currencyGain += DUPLICATE_CURRENCY_MAP[record.cardRarity];
        }
      }
    }

    const updatedSession: PullSession = {
      ...session,
      totalPulls,
      ssrPityCounter: ssrCounter,
      srPityCounter: srCounter,
      records: [...session.records, ...newRecords],
      obtainedCardIds,
      shardCount: session.shardCount + shardGain,
      currencyCount: session.currencyCount + currencyGain,
    };

    set({
      session: updatedSession,
      lastPullResults: newRecords,
      showResult: true,
    });
  },

  closeResult: () => set({ showResult: false }),

  resetSession: () => {
    set({ session: null, lastPullResults: [], showResult: false });
  },

  importPool: (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.ssrRate !== undefined && parsed.srRate !== undefined) {
        const pool: CardPool = {
          ...DEFAULT_POOL,
          ...parsed,
          id: parsed.id || 'imported',
        };
        set({ cardPool: pool, cards: getDefaultCards(pool.id) });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  exportPool: (): string => {
    const { cardPool } = get();
    return JSON.stringify(cardPool, null, 2);
  },
}));
