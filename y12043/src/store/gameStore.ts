import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, GameConfig, Fund, Decision, DrawdownRecord, FeeRecord } from '@/types';
import { defaultConfig } from '@/data/config';
import { defaultMaze } from '@/data/maze';
import { determineRouteBranch, getNextNode, calculateNodeReturn, getAvailableFunds } from '@/engine/route';
import { calculateIndustryConcentration, checkIndustryGate, checkConsecutiveIndustry, calculateHighRiskRatio, createDrawdownRecord } from '@/engine/risk';
import { createFeeRecords, processDelayedFees } from '@/engine/fee';
import { industries } from '@/data/industries';

interface GameStore {
  games: GameState[];
  configs: GameConfig[];
  activeConfigId: string;
  currentGame: GameState | null;
  isPlaying: boolean;
  
  startGame: (startCapital?: number) => void;
  selectFund: (fundId: string, amount: number) => void;
  completeGame: () => void;
  resetGame: () => void;
  
  addConfig: (config: Omit<GameConfig, 'id' | 'createdAt'>) => void;
  updateConfig: (configId: string, updates: Partial<GameConfig>) => void;
  setActiveConfig: (configId: string) => void;
  deleteConfig: (configId: string) => void;
  
  getActiveConfig: () => GameConfig;
  getGameById: (gameId: string) => GameState | undefined;
  getAvailableFundsForCurrentNode: () => Fund[];
  simulateGameWithConfig: (gameId: string, configId: string) => GameState;
}

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createInitialGameState(config: GameConfig, startCapital: number): GameState {
  return {
    id: generateGameId(),
    configVersion: config.version,
    configId: config.id,
    startCapital,
    currentCapital: startCapital,
    currentStep: 0,
    currentNode: defaultMaze.startNode,
    decisions: [],
    portfolio: {},
    drawdowns: [],
    fees: [],
    capitalHistory: [{ step: 0, capital: startCapital }],
    isCompleted: false,
    startTime: Date.now(),
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      games: [],
      configs: [defaultConfig],
      activeConfigId: defaultConfig.id,
      currentGame: null,
      isPlaying: false,
      
      startGame: (startCapital: number = 100000) => {
        const config = get().getActiveConfig();
        const newGame = createInitialGameState(config, startCapital);
        set({ currentGame: newGame, isPlaying: true });
      },
      
      selectFund: (fundId: string, amount: number) => {
        const state = get();
        if (!state.currentGame || state.currentGame.isCompleted) return;
        
        const game = state.currentGame;
        const config = state.getActiveConfig();
        const fund = config.funds.find(f => f.id === fundId);
        if (!fund) return;
        
        const currentNode = defaultMaze.nodes[game.currentNode];
        if (!currentNode) return;
        
        const { branch, reason } = determineRouteBranch(
          fund,
          game.portfolio,
          config.funds,
          config.industryGates
        );
        
        const nextNodeId = getNextNode(currentNode, branch);
        if (!nextNodeId) return;
        
        const decision: Decision = {
          step: game.currentStep + 1,
          nodeId: game.currentNode,
          fundId,
          amount,
          routeBranch: branch,
          triggerReason: reason,
          timestamp: Date.now(),
        };
        
        let newCapital = game.currentCapital - amount;
        let newPortfolio = { ...game.portfolio };
        newPortfolio[fundId] = (newPortfolio[fundId] || 0) + amount;
        
        const { immediate: immediateFee, delayed: delayedFee } = createFeeRecords(
          game.currentStep + 1,
          amount,
          fund,
          game.decisions,
          game.currentStep
        );
        newCapital -= immediateFee.amount;
        let newFees = [...game.fees, immediateFee, delayedFee];
        
        const { updatedFees, totalDeducted } = processDelayedFees(newFees, game.currentStep + 1);
        newFees = updatedFees;
        newCapital -= totalDeducted;
        
        const concentration = calculateIndustryConcentration(newPortfolio, config.funds);
        let newDrawdowns = [...game.drawdowns];
        
        const fundIndustryId = fund.industryId;
        if (fundIndustryId) {
          const gate = config.industryGates.find(g => g.industryId === fundIndustryId);
          if (gate) {
            const conc = concentration[fundIndustryId] || 0;
            const { triggered } = checkIndustryGate(conc, gate);
            if (triggered) {
              const drawdown = createDrawdownRecord(
                game.currentStep + 1,
                `industry_gate_${gate.id}`,
                gate.penaltyValue,
                'industry_concentration',
                gate.industryName
              );
              newDrawdowns.push(drawdown);
              newCapital *= (1 - gate.penaltyValue);
            }
          }
        }
        
        const { triggered: consecutiveTriggered, industryId: consecutiveIndustry } = checkConsecutiveIndustry(
          [...game.decisions, decision],
          config.funds
        );
        if (consecutiveTriggered) {
          const industryName = industries.find(i => i.id === consecutiveIndustry)?.name;
          const drawdown = createDrawdownRecord(
            game.currentStep + 1,
            'consecutive_buy',
            0.08,
            'consecutive_buy',
            industryName
          );
          newDrawdowns.push(drawdown);
          newCapital *= 0.92;
        }
        
        const highRiskRatio = calculateHighRiskRatio(newPortfolio, config.funds);
        if (highRiskRatio > 0.6) {
          const drawdown = createDrawdownRecord(
            game.currentStep + 1,
            'high_risk_ratio',
            0.10,
            'high_risk',
            undefined
          );
          newDrawdowns.push(drawdown);
          newCapital *= 0.90;
        }
        
        const nextNode = defaultMaze.nodes[nextNodeId];
        const nodeReturn = calculateNodeReturn(nextNode, branch, fund);
        const returnAmount = amount * nodeReturn;
        newCapital += returnAmount;
        
        const isCompleted = nextNode.type === 'end';
        
        const newCapitalHistory = [
          ...game.capitalHistory,
          { step: game.currentStep + 1, capital: newCapital }
        ];
        
        const updatedGame: GameState = {
          ...game,
          currentCapital: Math.max(0, newCapital),
          currentStep: game.currentStep + 1,
          currentNode: nextNodeId,
          decisions: [...game.decisions, decision],
          portfolio: newPortfolio,
          drawdowns: newDrawdowns,
          fees: newFees,
          capitalHistory: newCapitalHistory,
          isCompleted,
          endTime: isCompleted ? Date.now() : undefined,
        };
        
        if (isCompleted) {
          set(state => ({
            currentGame: updatedGame,
            isPlaying: false,
            games: [...state.games, updatedGame],
          }));
        } else {
          set({ currentGame: updatedGame });
        }
      },
      
      completeGame: () => {
        const state = get();
        if (!state.currentGame) return;
        
        const completedGame: GameState = {
          ...state.currentGame,
          isCompleted: true,
          endTime: Date.now(),
        };
        
        set(state => ({
          currentGame: completedGame,
          isPlaying: false,
          games: [...state.games, completedGame],
        }));
      },
      
      resetGame: () => {
        set({ currentGame: null, isPlaying: false });
      },
      
      addConfig: (config) => {
        const newConfig: GameConfig = {
          ...config,
          id: `config-${Date.now()}`,
          createdAt: Date.now(),
        };
        set(state => ({ configs: [...state.configs, newConfig] }));
      },
      
      updateConfig: (configId, updates) => {
        set(state => ({
          configs: state.configs.map(c =>
            c.id === configId ? { ...c, ...updates } : c
          ),
        }));
      },
      
      setActiveConfig: (configId) => {
        set({ activeConfigId: configId });
      },
      
      deleteConfig: (configId) => {
        set(state => ({
          configs: state.configs.filter(c => c.id !== configId),
          activeConfigId: state.activeConfigId === configId
            ? state.configs[0]?.id || defaultConfig.id
            : state.activeConfigId,
        }));
      },
      
      getActiveConfig: () => {
        const state = get();
        return state.configs.find(c => c.id === state.activeConfigId) || state.configs[0] || defaultConfig;
      },
      
      getGameById: (gameId) => {
        return get().games.find(g => g.id === gameId);
      },
      
      getAvailableFundsForCurrentNode: () => {
        const state = get();
        if (!state.currentGame) return [];
        
        const node = defaultMaze.nodes[state.currentGame.currentNode];
        if (!node) return [];
        
        const config = state.getActiveConfig();
        return getAvailableFunds(node, config.funds, state.currentGame.currentStep);
      },
      
      simulateGameWithConfig: (gameId, configId) => {
        const state = get();
        const originalGame = state.getGameById(gameId);
        const newConfig = state.configs.find(c => c.id === configId);
        
        if (!originalGame || !newConfig) {
          return originalGame as GameState;
        }
        
        let simulatedGame: GameState = {
          ...originalGame,
          configId: newConfig.id,
          configVersion: newConfig.version,
          currentCapital: originalGame.startCapital,
          currentStep: 0,
          currentNode: defaultMaze.startNode,
          decisions: [],
          portfolio: {},
          drawdowns: [],
          fees: [],
          capitalHistory: [{ step: 0, capital: originalGame.startCapital }],
          isCompleted: false,
        };
        
        originalGame.decisions.forEach(decision => {
          if (!decision.fundId) return;
          
          const fund = newConfig.funds.find(f => f.id === decision.fundId);
          if (!fund) return;
          
          const currentNode = defaultMaze.nodes[simulatedGame.currentNode];
          const { branch } = determineRouteBranch(
            fund,
            simulatedGame.portfolio,
            newConfig.funds,
            newConfig.industryGates
          );
          
          const nextNodeId = getNextNode(currentNode, branch);
          if (!nextNodeId) return;
          
          const newDecision: Decision = {
            ...decision,
            routeBranch: branch,
          };
          
          let newCapital = simulatedGame.currentCapital - decision.amount;
          let newPortfolio = { ...simulatedGame.portfolio };
          newPortfolio[decision.fundId] = (newPortfolio[decision.fundId] || 0) + decision.amount;
          
          const { immediate: immediateFee, delayed: delayedFee } = createFeeRecords(
            simulatedGame.currentStep + 1,
            decision.amount,
            fund,
            simulatedGame.decisions,
            simulatedGame.currentStep
          );
          newCapital -= immediateFee.amount;
          let newFees = [...simulatedGame.fees, immediateFee, delayedFee];
          
          const { updatedFees, totalDeducted } = processDelayedFees(newFees, simulatedGame.currentStep + 1);
          newFees = updatedFees;
          newCapital -= totalDeducted;
          
          const concentration = calculateIndustryConcentration(newPortfolio, newConfig.funds);
          let newDrawdowns = [...simulatedGame.drawdowns];
          
          const fundIndustryId = fund.industryId;
          if (fundIndustryId) {
            const gate = newConfig.industryGates.find(g => g.industryId === fundIndustryId);
            if (gate) {
              const conc = concentration[fundIndustryId] || 0;
              const { triggered } = checkIndustryGate(conc, gate);
              if (triggered) {
                const drawdown = createDrawdownRecord(
                  simulatedGame.currentStep + 1,
                  `industry_gate_${gate.id}`,
                  gate.penaltyValue,
                  'industry_concentration',
                  gate.industryName
                );
                newDrawdowns.push(drawdown);
                newCapital *= (1 - gate.penaltyValue);
              }
            }
          }
          
          const nextNode = defaultMaze.nodes[nextNodeId];
          const nodeReturn = calculateNodeReturn(nextNode, branch, fund);
          const returnAmount = decision.amount * nodeReturn;
          newCapital += returnAmount;
          
          const isCompleted = nextNode.type === 'end';
          
          simulatedGame = {
            ...simulatedGame,
            currentCapital: Math.max(0, newCapital),
            currentStep: simulatedGame.currentStep + 1,
            currentNode: nextNodeId,
            decisions: [...simulatedGame.decisions, newDecision],
            portfolio: newPortfolio,
            drawdowns: newDrawdowns,
            fees: newFees,
            capitalHistory: [
              ...simulatedGame.capitalHistory,
              { step: simulatedGame.currentStep + 1, capital: newCapital }
            ],
            isCompleted,
          };
        });
        
        return simulatedGame;
      },
    }),
    {
      name: 'fund-maze-store',
    }
  )
);
