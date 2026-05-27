import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  GameStatus,
  Difficulty,
  Industry,
  Position,
  TradeRecord,
  NewsEvent,
  RiskWarning,
  GameHistory,
} from '../types/game.types';
import { INDUSTRY_BASE_DATA } from '../data/industries';
import { getRandomEvent } from '../data/events';
import {
  generateId,
  generatePriceChange,
  calculateFee,
  checkConcentrationRisk,
  checkChasingBehavior,
  checkFeeErosion,
  calculateRiskUsed,
  calculateFinalScore,
  FEE_RATE,
} from '../utils/calculator';

interface GameStore {
  currentGame: GameState | null;
  gameHistories: GameHistory[];
  isTrading: boolean;
  pendingWeights: { [industryId: string]: number } | null;
  pendingFees: number;
  pendingWarnings: RiskWarning[];
  
  initGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  
  startTrading: () => void;
  cancelTrading: () => void;
  updatePendingWeight: (industryId: string, weight: number) => void;
  confirmTrading: () => void;
  
  nextRound: () => void;
  
  loadGame: (gameId: string) => void;
  clearHistory: () => void;
}

const INITIAL_ASSETS = 1000000;
const MAX_ROUNDS = 12;
const RISK_BUDGET = 60;

const createInitialIndustries = (): Industry[] => {
  return INDUSTRY_BASE_DATA.map(base => ({
    ...base,
    currentPrice: 100,
    priceHistory: [100],
    dailyChange: 0,
  }));
};

const createInitialPositions = (industries: Industry[]): Position[] => {
  const weight = 1 / industries.length;
  return industries.map(industry => ({
    industryId: industry.id,
    weight,
    costPrice: industry.currentPrice,
    currentPrice: industry.currentPrice,
    shares: (INITIAL_ASSETS * weight) / industry.currentPrice,
    marketValue: INITIAL_ASSETS * weight,
    profit: 0,
    profitRate: 0,
  }));
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      gameHistories: [],
      isTrading: false,
      pendingWeights: null,
      pendingFees: 0,
      pendingWarnings: [],

      initGame: (difficulty: Difficulty) => {
        const industries = createInitialIndustries();
        const positions = createInitialPositions(industries);
        const now = new Date();
        
        const gameId = generateId();
        const newGame: GameState = {
          gameId,
          status: 'playing',
          difficulty,
          round: 1,
          maxRounds: MAX_ROUNDS,
          totalAssets: INITIAL_ASSETS,
          initialAssets: INITIAL_ASSETS,
          netValue: 1,
          netValueHistory: [1],
          positions,
          industries,
          currentEvent: null,
          eventHistory: [],
          tradeHistory: [],
          riskWarnings: [],
          riskBudget: RISK_BUDGET,
          riskUsed: calculateRiskUsed(positions, industries),
          totalFees: 0,
          score: null,
          createdAt: now,
          updatedAt: now,
        };

        if (Math.random() > 0.3) {
          const eventData = getRandomEvent();
          const event: NewsEvent = {
            ...eventData,
            id: generateId(),
            round: 1,
          };
          newGame.currentEvent = event;
          
          const updatedIndustries = industries.map(ind => {
            const impact = event.impact[ind.id] || 0;
            const randomChange = generatePriceChange(ind, difficulty);
            const totalChange = impact + randomChange;
            const newPrice = ind.currentPrice * (1 + totalChange);
            
            return {
              ...ind,
              currentPrice: newPrice,
              priceHistory: [...ind.priceHistory, newPrice],
              dailyChange: totalChange,
            };
          });
          
          const updatedPositions = positions.map(pos => {
            const industry = updatedIndustries.find(i => i.id === pos.industryId)!;
            const newMarketValue = pos.shares * industry.currentPrice;
            const newProfit = newMarketValue - pos.shares * pos.costPrice;
            
            return {
              ...pos,
              currentPrice: industry.currentPrice,
              marketValue: newMarketValue,
              profit: newProfit,
              profitRate: newProfit / (pos.shares * pos.costPrice),
            };
          });
          
          const totalMarketValue = updatedPositions.reduce((sum, p) => sum + p.marketValue, 0);
          const finalPositions = updatedPositions.map(p => ({
            ...p,
            weight: p.marketValue / totalMarketValue,
          }));
          
          newGame.industries = updatedIndustries;
          newGame.positions = finalPositions;
          newGame.totalAssets = totalMarketValue;
          newGame.netValue = totalMarketValue / INITIAL_ASSETS;
          newGame.netValueHistory = [1, newGame.netValue];
          newGame.riskUsed = calculateRiskUsed(finalPositions, updatedIndustries);
          newGame.eventHistory = [event];
        }

        set({
          currentGame: newGame,
          isTrading: false,
          pendingWeights: null,
          pendingFees: 0,
          pendingWarnings: [],
        });
      },

      pauseGame: () => {
        set(state => ({
          currentGame: state.currentGame ? {
            ...state.currentGame,
            status: 'paused' as GameStatus,
            updatedAt: new Date(),
          } : null,
        }));
      },

      resumeGame: () => {
        set(state => ({
          currentGame: state.currentGame ? {
            ...state.currentGame,
            status: 'playing' as GameStatus,
            updatedAt: new Date(),
          } : null,
        }));
      },

      restartGame: () => {
        const { currentGame } = get();
        if (currentGame) {
          get().initGame(currentGame.difficulty);
        }
      },

      endGame: () => {
        const { currentGame, gameHistories } = get();
        if (!currentGame || currentGame.status === 'ended') return;

        const score = calculateFinalScore(
          currentGame.netValueHistory,
          currentGame.positions,
          currentGame.totalFees,
          currentGame.totalAssets,
          currentGame.eventHistory,
          currentGame.tradeHistory,
          currentGame.industries
        );

        const history: GameHistory = {
          gameId: currentGame.gameId,
          createdAt: currentGame.createdAt,
          totalReturn: score.totalReturn,
          totalScore: score.totalScore,
          grade: score.grade,
        };

        set(state => ({
          currentGame: {
            ...state.currentGame!,
            status: 'ended' as GameStatus,
            score,
            updatedAt: new Date(),
          },
          gameHistories: [history, ...state.gameHistories].slice(0, 20),
          isTrading: false,
          pendingWeights: null,
          pendingFees: 0,
          pendingWarnings: [],
        }));
      },

      startTrading: () => {
        const { currentGame } = get();
        if (!currentGame) return;

        const weights: { [key: string]: number } = {};
        currentGame.positions.forEach(p => {
          weights[p.industryId] = p.weight;
        });

        set({
          isTrading: true,
          pendingWeights: weights,
          pendingFees: 0,
          pendingWarnings: [],
        });
      },

      cancelTrading: () => {
        set({
          isTrading: false,
          pendingWeights: null,
          pendingFees: 0,
          pendingWarnings: [],
        });
      },

      updatePendingWeight: (industryId: string, weight: number) => {
        const { currentGame, pendingWeights } = get();
        if (!currentGame || !pendingWeights) return;

        const newWeights = { ...pendingWeights, [industryId]: weight };
        
        const totalWeight = Object.values(newWeights).reduce((a, b) => a + b, 0);
        const normalizedWeights: { [key: string]: number } = {};
        Object.entries(newWeights).forEach(([id, w]) => {
          normalizedWeights[id] = w / totalWeight;
        });

        let totalFee = 0;
        const tradePreviews: { industryId: string; weightChange: number; action: 'buy' | 'sell' }[] = [];
        
        Object.entries(normalizedWeights).forEach(([id, newWeight]) => {
          const oldWeight = currentGame.positions.find(p => p.industryId === id)?.weight || 0;
          const weightChange = newWeight - oldWeight;
          if (Math.abs(weightChange) > 0.0001) {
            const tradeAmount = currentGame.totalAssets * Math.abs(weightChange);
            totalFee += calculateFee(tradeAmount);
            tradePreviews.push({
              industryId: id,
              weightChange,
              action: weightChange > 0 ? 'buy' : 'sell',
            });
          }
        });

        const previewPositions = currentGame.positions.map(p => ({
          ...p,
          weight: normalizedWeights[p.industryId] || p.weight,
        }));

        const warnings: RiskWarning[] = [];
        
        const concentrationWarning = checkConcentrationRisk(previewPositions);
        if (concentrationWarning) warnings.push(concentrationWarning);

        set({
          pendingWeights: normalizedWeights,
          pendingFees: totalFee,
          pendingWarnings: warnings,
        });
      },

      confirmTrading: () => {
        const { currentGame, pendingWeights, pendingFees, pendingWarnings } = get();
        if (!currentGame || !pendingWeights) return;

        const tradeRecords: TradeRecord[] = [];
        const updatedPositions = currentGame.positions.map(pos => {
          const newWeight = pendingWeights[pos.industryId];
          if (newWeight === undefined || Math.abs(newWeight - pos.weight) < 0.0001) {
            return pos;
          }

          const weightChange = newWeight - pos.weight;
          const action: 'buy' | 'sell' = weightChange > 0 ? 'buy' : 'sell';
          const tradeAmount = currentGame.totalAssets * Math.abs(weightChange);
          const fee = calculateFee(tradeAmount);
          const price = pos.currentPrice;
          
          const newShares = (currentGame.totalAssets * newWeight) / price;
          const newCostBasis = (pos.shares * pos.costPrice + (newShares - pos.shares) * price) / newShares;
          const newMarketValue = newShares * price;

          tradeRecords.push({
            round: currentGame.round,
            timestamp: new Date(),
            industryId: pos.industryId,
            action,
            weightChange: Math.abs(weightChange),
            price,
            fee,
          });

          return {
            ...pos,
            weight: newWeight,
            shares: newShares,
            costPrice: newCostBasis,
            marketValue: newMarketValue,
          };
        });

        const totalProfit = updatedPositions.reduce((sum, p) => sum + p.profit, 0);
        const newWarnings = [...currentGame.riskWarnings];
        
        const chasingWarning = checkChasingBehavior(
          [...currentGame.tradeHistory, ...tradeRecords],
          currentGame.industries
        );
        if (chasingWarning) newWarnings.push(chasingWarning);

        const feeErosionWarning = checkFeeErosion(
          currentGame.totalFees + pendingFees,
          totalProfit
        );
        if (feeErosionWarning) newWarnings.push(feeErosionWarning);

        newWarnings.push(...pendingWarnings);

        set(state => ({
          currentGame: state.currentGame ? {
            ...state.currentGame,
            positions: updatedPositions,
            totalAssets: state.currentGame.totalAssets - pendingFees,
            totalFees: state.currentGame.totalFees + pendingFees,
            tradeHistory: [...state.currentGame.tradeHistory, ...tradeRecords],
            riskWarnings: newWarnings.slice(-10),
            riskUsed: calculateRiskUsed(updatedPositions, state.currentGame.industries),
            updatedAt: new Date(),
          } : null,
          isTrading: false,
          pendingWeights: null,
          pendingFees: 0,
          pendingWarnings: [],
        }));
      },

      nextRound: () => {
        const { currentGame } = get();
        if (!currentGame) return;

        if (currentGame.round >= currentGame.maxRounds) {
          get().endGame();
          return;
        }

        const newRound = currentGame.round + 1;
        let currentEvent: NewsEvent | null = null;

        if (Math.random() > 0.4) {
          const eventData = getRandomEvent();
          currentEvent = {
            ...eventData,
            id: generateId(),
            round: newRound,
          };
        }

        const updatedIndustries = currentGame.industries.map(ind => {
          const eventImpact = currentEvent?.impact[ind.id] || 0;
          const randomChange = generatePriceChange(ind, currentGame.difficulty);
          const totalChange = eventImpact + randomChange;
          const newPrice = ind.currentPrice * (1 + totalChange);

          return {
            ...ind,
            currentPrice: newPrice,
            priceHistory: [...ind.priceHistory, newPrice],
            dailyChange: totalChange,
          };
        });

        const updatedPositions = currentGame.positions.map(pos => {
          const industry = updatedIndustries.find(i => i.id === pos.industryId)!;
          const newMarketValue = pos.shares * industry.currentPrice;
          const newProfit = newMarketValue - pos.shares * pos.costPrice;

          return {
            ...pos,
            currentPrice: industry.currentPrice,
            marketValue: newMarketValue,
            profit: newProfit,
            profitRate: pos.costPrice > 0 ? newProfit / (pos.shares * pos.costPrice) : 0,
          };
        });

        const totalMarketValue = updatedPositions.reduce((sum, p) => sum + p.marketValue, 0);
        const finalPositions = updatedPositions.map(p => ({
          ...p,
          weight: p.marketValue / totalMarketValue,
        }));

        const newNetValue = totalMarketValue / currentGame.initialAssets;

        set(state => ({
          currentGame: state.currentGame ? {
            ...state.currentGame,
            round: newRound,
            industries: updatedIndustries,
            positions: finalPositions,
            totalAssets: totalMarketValue,
            netValue: newNetValue,
            netValueHistory: [...state.currentGame.netValueHistory, newNetValue],
            currentEvent,
            eventHistory: currentEvent
              ? [...state.currentGame.eventHistory, currentEvent]
              : state.currentGame.eventHistory,
            riskUsed: calculateRiskUsed(finalPositions, updatedIndustries),
            updatedAt: new Date(),
          } : null,
        }));
      },

      loadGame: (gameId: string) => {
        const { gameHistories } = get();
        const history = gameHistories.find(h => h.gameId === gameId);
        if (history) {
        }
      },

      clearHistory: () => {
        set({ gameHistories: [] });
      },
    }),
    {
      name: 'fund-manager-game-storage',
      partialize: (state) => ({
        currentGame: state.currentGame,
        gameHistories: state.gameHistories,
      }),
    }
  )
);
