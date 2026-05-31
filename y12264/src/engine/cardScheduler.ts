import type { Card } from '../types/card';
import { createDeck, drawCards, shuffleDeck } from '../data/cards';
import { INITIAL_HAND_SIZE, CARDS_PER_ROUND, MAX_HAND_SIZE } from '../types/game';
import type { Scenario } from '../data/scenarios';

export function initializeGame(
  scenario: Scenario,
): {
  hand: Card[];
  deck: Card[];
  discardPile: Card[];
  initialRainfall: number;
} {
  let deck = createDeck();

  if (scenario.initialHandBias && scenario.initialHandBias.length > 0) {
    deck = biasDeck(deck, scenario.initialHandBias);
  }

  const { drawn, remaining } = drawCards(deck, INITIAL_HAND_SIZE);

  return {
    hand: drawn,
    deck: remaining,
    discardPile: [],
    initialRainfall: scenario.rainfallPattern[0],
  };
}

function biasDeck(deck: Card[], preferredTypes: string[]): Card[] {
  const preferred: Card[] = [];
  const others: Card[] = [];

  deck.forEach(card => {
    if (preferredTypes.includes(card.type)) {
      preferred.push(card);
    } else {
      others.push(card);
    }
  });

  return [...shuffleDeck(preferred), ...shuffleDeck(others)];
}

export function playCard(
  hand: Card[],
  deck: Card[],
  discardPile: Card[],
  cardId: string,
): {
  playedCard: Card | null;
  newHand: Card[];
  newDeck: Card[];
  newDiscardPile: Card[];
} {
  const cardIndex = hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    return { playedCard: null, newHand: hand, newDeck: deck, newDiscardPile: discardPile };
  }

  const playedCard = hand[cardIndex];
  const newHand = hand.filter(c => c.id !== cardId);
  const newDiscardPile = [...discardPile, playedCard];

  return {
    playedCard,
    newHand,
    newDeck: deck,
    newDiscardPile,
  };
}

export function drawNewCards(
  hand: Card[],
  deck: Card[],
  discardPile: Card[],
): {
  newHand: Card[];
  newDeck: Card[];
  newDiscardPile: Card[];
} {
  if (hand.length >= MAX_HAND_SIZE) {
    return { newHand: hand, newDeck: deck, newDiscardPile: discardPile };
  }

  let currentDeck = deck;
  let currentDiscard = discardPile;

  if (currentDeck.length < CARDS_PER_ROUND) {
    currentDeck = shuffleDeck([...currentDeck, ...currentDiscard]);
    currentDiscard = [];
  }

  const { drawn, remaining } = drawCards(currentDeck, CARDS_PER_ROUND);

  return {
    newHand: [...hand, ...drawn],
    newDeck: remaining,
    newDiscardPile: currentDiscard,
  };
}

export function canPlayCard(card: Card, _cityStatus: unknown): boolean {
  return card.type !== 'rainfall';
}

export function getPlayableCards(hand: Card[], cityStatus: unknown): Card[] {
  return hand.filter(card => canPlayCard(card, cityStatus));
}

export function getCardEffectDescription(card: Card): string {
  const effectMap: Record<string, string> = {
    pipeline: `提升管网输送能力 ${card.value} m³/h`,
    disposal: `增加应急处置能力 ${card.value} m³`,
    garden: `补充海绵设施吸纳容量 ${card.value} m³`,
    rainfall: `触发降雨 ${card.value} mm/h`,
  };
  return effectMap[card.type] || '';
}

export function discardCard(
  hand: Card[],
  discardPile: Card[],
  cardId: string,
): {
  newHand: Card[];
  newDiscardPile: Card[];
} {
  const cardIndex = hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    return { newHand: hand, newDiscardPile: discardPile };
  }

  const discardedCard = hand[cardIndex];
  const newHand = hand.filter(c => c.id !== cardId);
  const newDiscardPile = [...discardPile, discardedCard];

  return { newHand, newDiscardPile };
}
