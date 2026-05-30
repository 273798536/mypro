import { create } from 'zustand';
import { GameState, RateEvent, DurationSettlement, CashflowMiss, RatePaddle, CashflowItem, BondBall } from '@/types';
import { createRateEvent, createDurationSettlement, createCashflowMiss } from '@/utils/finance';
import { levels, sampleBonds } from '@/data/levels';
import { generateId } from '@/utils/finance';

interface GameStore extends GameState {
  bondBall: BondBall | null;
  paddles: RatePaddle[];
  cashflowItems: CashflowItem[];
  currentBondIndex: number;
  paddleMoveDirection: 'left' | 'right' | null;
  showReview: boolean;
  showCorrection: boolean;
  correctionMessage: string | null;
  initGame: (levelId: number) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  launchBall: () => void;
  updateBallPosition: (x: number, y: number, vx: number, vy: number) => void;
  handlePaddleCollision: (paddleId: string) => void;
  handleCashflowCollision: (itemId: string) => void;
  collectCashflow: (itemId: string) => void;
  setPaddleMoveDirection: (direction: 'left' | 'right' | null) => void;
  updatePaddlePosition: (paddleId: string, x: number) => void;
  toggleReview: () => void;
  closeCorrection: () => void;
  updateDisplayDuration: () => void;
  checkCashflowTimeout: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentRate: 3.0,
  totalDuration: 4.5,
  totalCashflow: 0,
  score: 0,
  level: 1,
  isPlaying: false,
  isPaused: false,
  durationBarDelay: false,
  displayDuration: 4.5,
  rateEvents: [],
  settlements: [],
  cashflowMisses: [],
  consecutiveRateDirection: null,
  consecutiveRateCount: 0,
  bondBall: null,
  paddles: [],
  cashflowItems: [],
  currentBondIndex: 0,
  paddleMoveDirection: null,
  showReview: false,
  showCorrection: false,
  correctionMessage: null,

  initGame: (levelId: number) => {
    const level = levels.find((l) => l.id === levelId) || levels[0];
    const bond = sampleBonds[0];
    const hasDelay = Math.random() < level.durationBarDelayChance;

    const paddlesWithIds: RatePaddle[] = level.paddles.map((p) => ({
      ...p,
      id: generateId(),
      rateChange: p.isFieldMissing ? undefined : p.rateChange,
    }));

    const cashflowItemsWithIds: CashflowItem[] = level.cashflowItems.map((c) => ({
      ...c,
      id: generateId(),
      collected: false,
      isMissed: false,
    }));

    set({
      currentRate: level.initialRate,
      totalDuration: bond.duration,
      displayDuration: hasDelay ? 0 : bond.duration,
      totalCashflow: 0,
      score: 0,
      level: levelId,
      isPlaying: false,
      isPaused: false,
      durationBarDelay: hasDelay,
      rateEvents: [],
      settlements: [],
      cashflowMisses: [],
      consecutiveRateDirection: null,
      consecutiveRateCount: 0,
      bondBall: {
        id: bond.id,
        x: 350,
        y: 450,
        vx: 0,
        vy: 0,
        radius: 20,
        faceValue: bond.faceValue,
        couponRate: bond.couponRate,
        maturity: bond.maturity,
        duration: bond.duration,
        remark: bond.remark,
      },
      paddles: paddlesWithIds,
      cashflowItems: cashflowItemsWithIds,
      currentBondIndex: 0,
      showReview: false,
      showCorrection: false,
      correctionMessage: null,
    });

    if (hasDelay) {
      setTimeout(() => {
        set((state) => ({
          displayDuration: state.totalDuration,
        }));
      }, 2000);
    }
  },

  startGame: () => {
    set({ isPlaying: true, isPaused: false });
  },

  pauseGame: () => {
    set({ isPaused: true });
  },

  resumeGame: () => {
    set({ isPaused: false });
  },

  endGame: () => {
    set({ isPlaying: false, showReview: true });
  },

  launchBall: () => {
    const { bondBall, isPlaying } = get();
    if (!isPlaying || !bondBall || bondBall.vy !== 0) return;

    set((state) => ({
      bondBall: state.bondBall
        ? {
            ...state.bondBall,
            vx: (Math.random() - 0.5) * 4,
            vy: -6,
          }
        : null,
    }));
  },

  updateBallPosition: (x: number, y: number, vx: number, vy: number) => {
    set((state) => ({
      bondBall: state.bondBall ? { ...state.bondBall, x, y, vx, vy } : null,
    }));
  },

  handlePaddleCollision: (paddleId: string) => {
    const state = get();
    const paddle = state.paddles.find((p) => p.id === paddleId);
    if (!paddle || !state.bondBall) return;

    const actualRateChange = paddle.rateChange ?? 0.25;
    const rateChangeValue = paddle.rateType === 'increase' ? actualRateChange : -actualRateChange;

    let isConsecutiveJump = false;
    let jumpCount = 1;
    let totalRateChange = rateChangeValue;

    if (state.consecutiveRateDirection === paddle.rateType) {
      const newCount = state.consecutiveRateCount + 1;
      if (newCount >= 3) {
        isConsecutiveJump = true;
        jumpCount = newCount;
        totalRateChange = rateChangeValue * newCount;
      }
      set({ consecutiveRateCount: newCount });
    } else {
      set({
        consecutiveRateDirection: paddle.rateType,
        consecutiveRateCount: 1,
      });
    }

    const rateEvent = createRateEvent(
      state.currentRate,
      totalRateChange,
      paddleId,
      isConsecutiveJump,
      jumpCount
    );

    const settlement = createDurationSettlement(
      state.bondBall.id,
      state.totalDuration,
      totalRateChange,
      state.currentRate
    );

    const newDuration = state.totalDuration + settlement.priceChange;

    set((prev) => ({
      currentRate: rateEvent.rateAfter,
      totalDuration: Math.max(0.1, newDuration),
      score: prev.score + (isConsecutiveJump ? 100 : 50),
      rateEvents: [...prev.rateEvents, rateEvent],
      settlements: [...prev.settlements, settlement],
      showCorrection: !settlement.isDirectionCorrect,
      correctionMessage: settlement.correctionSuggestion || null,
    }));

    if (state.durationBarDelay) {
      setTimeout(() => {
        set((prev) => ({
          displayDuration: prev.totalDuration,
        }));
      }, 1500);
    } else {
      set({ displayDuration: Math.max(0.1, newDuration) });
    }
  },

  handleCashflowCollision: (itemId: string) => {
    set((state) => ({
      cashflowItems: state.cashflowItems.map((item) =>
        item.id === itemId && !item.collected ? { ...item, collectTime: Date.now() } : item
      ),
    }));
  },

  collectCashflow: (itemId: string) => {
    const state = get();
    const item = state.cashflowItems.find((i) => i.id === itemId);
    if (!item || item.collected || item.isMissed) return;

    set((prev) => ({
      totalCashflow: prev.totalCashflow + item.amount,
      score: prev.score + item.amount,
      cashflowItems: prev.cashflowItems.map((i) =>
        i.id === itemId ? { ...i, collected: true, isMissed: false } : i
      ),
    }));
  },

  checkCashflowTimeout: () => {
    const state = get();
    const now = Date.now();

    state.cashflowItems.forEach((item) => {
      if (item.collectTime && !item.collected && !item.isMissed && now - item.collectTime > 5000) {
        const missRecord = createCashflowMiss(item.id, item.amount);
        set((prev) => ({
          cashflowItems: prev.cashflowItems.map((i) =>
            i.id === item.id ? { ...i, isMissed: true } : i
          ),
          cashflowMisses: [...prev.cashflowMisses, missRecord],
          showCorrection: true,
          correctionMessage: `现金流漏计！${missRecord.correctionSteps.join(' ')}`,
        }));
      }
    });
  },

  setPaddleMoveDirection: (direction: 'left' | 'right' | null) => {
    set({ paddleMoveDirection: direction });
  },

  updatePaddlePosition: (paddleId: string, x: number) => {
    set((state) => ({
      paddles: state.paddles.map((p) => (p.id === paddleId ? { ...p, x } : p)),
    }));
  },

  toggleReview: () => {
    set((state) => ({ showReview: !state.showReview }));
  },

  closeCorrection: () => {
    set({ showCorrection: false, correctionMessage: null });
  },

  updateDisplayDuration: () => {
    set((state) => ({ displayDuration: state.totalDuration }));
  },
}));
