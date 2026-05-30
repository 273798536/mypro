import type { CardPool, Card, PullRecord, Rarity } from '@/types';

const SSR_CARDS: Omit<Card, 'poolId'>[] = [
  { id: 'ssr-1', name: '星辰守护者', rarity: 'SSR' },
  { id: 'ssr-2', name: '月影法师', rarity: 'SSR' },
  { id: 'ssr-3', name: '日冕战士', rarity: 'SSR' },
];

const SR_CARDS: Omit<Card, 'poolId'>[] = [
  { id: 'sr-1', name: '流星射手', rarity: 'SR' },
  { id: 'sr-2', name: '彗星吟游者', rarity: 'SR' },
  { id: 'sr-3', name: '极光炼金师', rarity: 'SR' },
  { id: 'sr-4', name: '陨石工匠', rarity: 'SR' },
  { id: 'sr-5', name: '霓虹骑士', rarity: 'SR' },
];

const R_CARDS: Omit<Card, 'poolId'>[] = [
  { id: 'r-1', name: '星光学徒', rarity: 'R' },
  { id: 'r-2', name: '晨露采集者', rarity: 'R' },
  { id: 'r-3', name: '夜风行者', rarity: 'R' },
  { id: 'r-4', name: '尘土旅人', rarity: 'R' },
  { id: 'r-5', name: '烟火艺人', rarity: 'R' },
  { id: 'r-6', name: '雾霭守望', rarity: 'R' },
  { id: 'r-7', name: '霜花信使', rarity: 'R' },
];

export const DEFAULT_POOL: CardPool = {
  id: 'default',
  name: '星辰学院·限定池',
  ssrRate: 0.006,
  srRate: 0.051,
  rRate: 0.943,
  hardPity: 90,
  softPityStart: 74,
  softPityIncrement: 0.06,
  srHardPity: 10,
  duplicatePolicy: 'shards',
};

export function getDefaultCards(poolId: string): Card[] {
  return [
    ...SSR_CARDS.map((c) => ({ ...c, poolId })),
    ...SR_CARDS.map((c) => ({ ...c, poolId })),
    ...R_CARDS.map((c) => ({ ...c, poolId })),
  ];
}

export function getCardsByRarity(cards: Card[], rarity: Rarity): Card[] {
  return cards.filter((c) => c.rarity === rarity);
}

export function calculateEffectiveSSRRate(pool: CardPool, ssrPityCounter: number): number {
  let rate = pool.ssrRate;
  if (ssrPityCounter >= pool.softPityStart) {
    const increments = ssrPityCounter - pool.softPityStart + 1;
    rate += pool.softPityIncrement * increments;
  }
  return Math.min(rate, 1);
}

export function executePull(
  pool: CardPool,
  cards: Card[],
  ssrPityCounter: number,
  srPityCounter: number,
  obtainedCardIds: string[],
  pullNumber: number,
): PullRecord {
  const isHardPitySSR = ssrPityCounter >= pool.hardPity - 1;
  const isHardPitySR = srPityCounter >= pool.srHardPity - 1;

  const effectiveSSRRate = isHardPitySSR ? 1 : calculateEffectiveSSRRate(pool, ssrPityCounter);
  const effectiveSRRate = isHardPitySR ? 1 : pool.srRate;

  const rand = Math.random();
  let cardRarity: Rarity;
  let isPity = false;
  let isSoftPity = false;
  let effectiveRate: number;
  let triggerReason: string;

  if (isHardPitySSR) {
    cardRarity = 'SSR';
    isPity = true;
    effectiveRate = 1;
    triggerReason = `硬保底触发：连续 ${pool.hardPity} 抽未出 SSR，系统强制保底`;
  } else if (rand < effectiveSSRRate) {
    cardRarity = 'SSR';
    isSoftPity = ssrPityCounter >= pool.softPityStart;
    effectiveRate = effectiveSSRRate;
    if (isSoftPity) {
      triggerReason = `软保底提升：第 ${ssrPityCounter + 1} 抽，SSR 概率从 ${(pool.ssrRate * 100).toFixed(1)}% 提升至 ${(effectiveRate * 100).toFixed(2)}%`;
    } else {
      triggerReason = `基础概率出卡：SSR 基础概率 ${(pool.ssrRate * 100).toFixed(1)}%`;
    }
  } else if (isHardPitySR) {
    cardRarity = 'SR';
    isPity = true;
    effectiveRate = 1;
    triggerReason = `SR 保底触发：连续 ${pool.srHardPity} 抽未出 SR，系统保底`;
  } else if (rand < effectiveSSRRate + effectiveSRRate) {
    cardRarity = 'SR';
    effectiveRate = effectiveSRRate;
    triggerReason = `基础概率出卡：SR 基础概率 ${(pool.srRate * 100).toFixed(1)}%`;
  } else {
    cardRarity = 'R';
    effectiveRate = pool.rRate;
    triggerReason = `基础概率出卡：R 基础概率 ${(pool.rRate * 100).toFixed(1)}%`;
  }

  const poolCards = getCardsByRarity(cards, cardRarity);
  const selectedCard = poolCards[Math.floor(Math.random() * poolCards.length)];

  const isDuplicate = obtainedCardIds.includes(selectedCard.id);
  let duplicateConversion = '';
  let explanation = triggerReason;

  if (isDuplicate) {
    switch (pool.duplicatePolicy) {
      case 'shards': {
        const shardMap: Record<Rarity, number> = { SSR: 50, SR: 5, R: 1 };
        const shards = shardMap[cardRarity];
        duplicateConversion = `碎片 ×${shards}`;
        explanation += ` → 重复卡「${selectedCard.name}」折算为 ${shards} 碎片`;
        break;
      }
      case 'currency': {
        const currMap: Record<Rarity, number> = { SSR: 1600, SR: 100, R: 5 };
        const curr = currMap[cardRarity];
        duplicateConversion = `星辉币 ×${curr}`;
        explanation += ` → 重复卡「${selectedCard.name}」折算为 ${curr} 星辉币`;
        break;
      }
      case 'nothing':
        duplicateConversion = '无折算';
        explanation += ` → 重复卡「${selectedCard.name}」，当前折算策略为"无折算"，未获得补偿`;
        break;
    }
  }

  return {
    id: `pull-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    cardRarity,
    pullNumber,
    isPity,
    isSoftPity,
    isDuplicate,
    duplicateConversion,
    triggerReason,
    explanation,
    effectiveRate,
    pityCounterBefore: ssrPityCounter,
    timestamp: Date.now(),
  };
}

export const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string; glow: string; label: string }> = {
  SSR: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/50',
    glow: 'shadow-amber-500/30',
    label: 'SSR',
  },
  SR: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/50',
    glow: 'shadow-purple-500/30',
    label: 'SR',
  },
  R: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/30',
    label: 'R',
  },
};

export const DUPLICATE_SHARD_MAP: Record<Rarity, number> = { SSR: 50, SR: 5, R: 1 };
export const DUPLICATE_CURRENCY_MAP: Record<Rarity, number> = { SSR: 1600, SR: 100, R: 5 };
