import { create } from 'zustand';
import type {
  GameState,
  Level,
  Connection,
  PlacedCard,
  CardType,
  ConditionCard,
  LemmaCard,
} from '../types/game';

interface GameActions {
  initLevel: (level: Level) => void;
  placeCard: (slotId: string, cardId: string, cardType: CardType) => void;
  removeCard: (slotId: string) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  toggleCardUsed: (cardId: string, isUsed: boolean) => void;
  submitForScoring: () => void;
  resetGame: () => void;
}

const initialState: GameState = {
  currentLevelId: '',
  conditionCards: [],
  lemmaCards: [],
  conclusionSlots: [],
  connections: [],
  placedCards: [],
  counterexamples: [],
  isSubmitted: false,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  initLevel: (level: Level) => {
    set({
      currentLevelId: level.id,
      conditionCards: level.conditionCards.map((card) => ({ ...card, isUsed: false })),
      lemmaCards: level.lemmaCards,
      conclusionSlots: level.conclusionSlots,
      connections: [],
      placedCards: [],
      counterexamples: level.counterexamples,
      isSubmitted: false,
    });
  },

  placeCard: (slotId: string, cardId: string, cardType: CardType) => {
    const { placedCards } = get();
    const existingIndex = placedCards.findIndex((pc) => pc.slotId === slotId);
    const newPlacedCard: PlacedCard = { slotId, cardId, cardType };

    if (existingIndex >= 0) {
      const updated = [...placedCards];
      updated[existingIndex] = newPlacedCard;
      set({ placedCards: updated });
    } else {
      set({ placedCards: [...placedCards, newPlacedCard] });
    }

    if (cardType === 'condition') {
      set((state) => ({
        conditionCards: state.conditionCards.map((card) =>
          card.id === cardId ? { ...card, isUsed: true } : card
        ),
      }));
    }
  },

  removeCard: (slotId: string) => {
    const { placedCards, conditionCards } = get();
    const placedCard = placedCards.find((pc) => pc.slotId === slotId);

    if (placedCard && placedCard.cardType === 'condition') {
      set({
        conditionCards: conditionCards.map((card) =>
          card.id === placedCard.cardId ? { ...card, isUsed: false } : card
        ),
      });
    }

    set({
      placedCards: placedCards.filter((pc) => pc.slotId !== slotId),
    });
  },

  addConnection: (connection: Connection) => {
    set((state) => ({
      connections: [...state.connections, connection],
    }));
  },

  removeConnection: (connectionId: string) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
    }));
  },

  toggleCardUsed: (cardId: string, isUsed: boolean) => {
    set((state) => ({
      conditionCards: state.conditionCards.map((card) =>
        card.id === cardId ? { ...card, isUsed } : card
      ),
    }));
  },

  submitForScoring: () => {
    set({ isSubmitted: true });
  },

  resetGame: () => {
    set(initialState);
  },
}));
