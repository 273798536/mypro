import { create } from 'zustand';
import type {
  GameState,
  GameNode,
  FailureEvent,
  Position,
  Level,
  PlayerScore,
  GameRecord,
  NodeChoice,
} from '../engine/types';
import {
  calculateCollateralValue,
  calculateCollateralRatio,
  calculateDebtValue,
  calculateScore,
} from '../engine/calculator';
import { simulatePriceJump, checkFailureConditions } from '../engine/failure';
import { generateRuleFeedback } from '../engine/rules';
import { getMazeNode } from '../data/levels';

interface GameStore {
  currentGame: GameState | null;
  gameHistory: GameRecord[];
  playerScores: PlayerScore[];
  customPositions: Position[];
  playerName: string;
  volatilityMultiplier: number;

  setPlayerName: (name: string) => void;
  startGame: (level: Level, position: Position) => GameState;
  makeChoice: (level: Level, choice: NodeChoice) => {
    success: boolean;
    failureEvent?: FailureEvent;
  };
  completeGame: (level: Level) => PlayerScore | null;
  replayGame: (gameId: string) => GameState | null;
  saveCustomPosition: (position: Position) => void;
  getGameById: (gameId: string) => GameState | null;
  clearHistory: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentGame: null,
  gameHistory: loadFromStorage('defi-maze-history', []),
  playerScores: loadFromStorage('defi-maze-scores', []),
  customPositions: loadFromStorage('defi-maze-positions', []),
  playerName: loadFromStorage('defi-maze-player', '玩家'),
  volatilityMultiplier: 1,

  setPlayerName: (name: string) => {
    set({ playerName: name });
    saveToStorage('defi-maze-player', name);
  },

  startGame: (level: Level, position: Position): GameState => {
    const initialCollateralValue = calculateCollateralValue(
      position.collaterals,
      position.oracle
    );
    const initialDebtValue = calculateDebtValue(
      position.debtAmount,
      1 // 稳定币计价债务
    );
    const initialRatio = calculateCollateralRatio(
      initialCollateralValue,
      initialDebtValue
    );

    const game: GameState = {
      id: generateId(),
      levelId: level.id,
      playerName: get().playerName,
      position: JSON.parse(JSON.stringify(position)),
      currentNodeId: level.startNodeId,
      currentPrice: position.oracle.price,
      path: [level.startNodeId],
      collateralValue: initialCollateralValue,
      debtValue: initialDebtValue,
      collateralRatio: initialRatio,
      gasRemaining: level.initialGas,
      priceHistory: [{ step: 0, price: position.oracle.price }],
      status: 'playing',
      nodeHistory: [],
      startTime: Date.now(),
      repeatedLiquidationCount: 0,
    };

    set({ currentGame: game });
    return game;
  },

  makeChoice: (
    level: Level,
    choice: NodeChoice
  ): { success: boolean; failureEvent?: FailureEvent } => {
    const game = get().currentGame;
    if (!game || game.status !== 'playing') {
      return { success: false };
    }

    const currentNode = getMazeNode(level.id, game.currentNodeId);
    if (!currentNode) {
      return { success: false };
    }

    const oldRatio = game.collateralRatio;
    const oldPrice = game.currentPrice;
    const oldCollateralValue = game.collateralValue;
    const oldDebtValue = game.debtValue;

    let newCollateralAmount =
      oldCollateralValue / oldPrice + (choice.impact.collateralChange || 0);
    let newDebtAmount = oldDebtValue + (choice.impact.debtChange || 0);

    const volatilityMult =
      (choice.impact.priceVolatilityMultiplier || 1) *
      get().volatilityMultiplier;
    const priceJumpChance = currentNode.priceJumpChance || 0.2;

    const priceResult = simulatePriceJump(
      oldPrice,
      game.position.oracle.volatility * volatilityMult,
      priceJumpChance
    );

    const newPrice = priceResult.newPrice;
    const newCollateralValue = newCollateralAmount * newPrice;
    const newRatio = calculateCollateralRatio(newCollateralValue, newDebtAmount);

    const baseGasCost = currentNode.gasCost || 20;
    const choiceGasCost = Math.abs(choice.impact.gasChange || 0);
    const totalGasCost = baseGasCost + choiceGasCost;
    const newGasRemaining = Math.max(0, game.gasRemaining - totalGasCost);

    const priceEvent = priceResult.jumpOccurred
      ? `价格${priceResult.jumpDirection === 'down' ? '下跌' : '上涨'} ${Math.abs(priceResult.jumpPercent).toFixed(2)}%`
      : '价格稳定';

    const ruleFeedback = generateRuleFeedback(
      oldRatio,
      newRatio,
      choice.label,
      level.safetyRatio,
      level.liquidationRatio
    );

    let newRepeatedCount = game.repeatedLiquidationCount;
    if (
      choice.label.includes('清算') &&
      newRatio < level.safetyRatio &&
      newRatio >= level.liquidationRatio
    ) {
      newRepeatedCount++;
    }

    const stepIndex = game.nodeHistory.length + 1;

    const gameNode: GameNode = {
      id: generateId(),
      gameId: game.id,
      stepIndex,
      nodeId: currentNode.id,
      choice: choice.id,
      choiceLabel: choice.label,
      collateralValue: newCollateralValue,
      collateralRatio: newRatio,
      gasUsed: totalGasCost,
      gasRemaining: newGasRemaining,
      price: newPrice,
      priceEvent,
      timestamp: Date.now(),
      ruleFeedback,
    };

    const newPriceHistory = [
      ...game.priceHistory,
      { step: stepIndex, price: newPrice },
    ];

    const newPath = [...game.path, choice.nextNodeId];

    const updatedGame: GameState = {
      ...game,
      currentNodeId: choice.nextNodeId,
      currentPrice: newPrice,
      path: newPath,
      collateralValue: newCollateralValue,
      debtValue: newDebtAmount,
      collateralRatio: newRatio,
      gasRemaining: newGasRemaining,
      priceHistory: newPriceHistory,
      nodeHistory: [...game.nodeHistory, gameNode],
      repeatedLiquidationCount: newRepeatedCount,
    };

    const failureEvent = checkFailureConditions(
      updatedGame,
      level.liquidationRatio,
      level.safetyRatio
    );

    if (failureEvent) {
      const finalGame: GameState = {
        ...updatedGame,
        status: 'failed',
        failureEvent,
        endTime: Date.now(),
      };

      const record: GameRecord = {
        gameId: finalGame.id,
        playerName: finalGame.playerName,
        levelId: finalGame.levelId,
        levelName: level.name,
        status: 'failed',
        failureType: failureEvent.type,
        timeUsed: Math.floor(
          (finalGame.endTime! - finalGame.startTime) / 1000
        ),
        score: 0,
        timestamp: Date.now(),
        positionId: finalGame.position.id,
      };

      const newHistory = [record, ...get().gameHistory].slice(0, 100);
      set({
        currentGame: finalGame,
        gameHistory: newHistory,
      });
      saveToStorage('defi-maze-history', newHistory);
      saveToStorage(`defi-maze-game-${finalGame.id}`, finalGame);

      return { success: false, failureEvent };
    }

    const nextNode = getMazeNode(level.id, choice.nextNodeId);
    if (nextNode?.type === 'end') {
      const finalGame: GameState = {
        ...updatedGame,
        status: 'success',
        endTime: Date.now(),
      };

      const timeUsed = Math.floor(
        (finalGame.endTime! - finalGame.startTime) / 1000
      );
      const avgRatio =
        finalGame.nodeHistory.reduce((sum, n) => sum + n.collateralRatio, 0) /
          finalGame.nodeHistory.length || finalGame.collateralRatio;
      const score = calculateScore(
        timeUsed,
        avgRatio,
        level.safetyRatio,
        true
      );

      const playerScore: PlayerScore = {
        id: generateId(),
        gameId: finalGame.id,
        playerName: finalGame.playerName,
        levelId: finalGame.levelId,
        levelName: level.name,
        timeUsed,
        successRate: 100,
        avgCollateralRatio: avgRatio,
        score,
        timestamp: Date.now(),
      };

      const record: GameRecord = {
        gameId: finalGame.id,
        playerName: finalGame.playerName,
        levelId: finalGame.levelId,
        levelName: level.name,
        status: 'success',
        timeUsed,
        score,
        timestamp: Date.now(),
        positionId: finalGame.position.id,
      };

      const newScores = [...get().playerScores, playerScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
      const newHistory = [record, ...get().gameHistory].slice(0, 100);

      set({
        currentGame: finalGame,
        gameHistory: newHistory,
        playerScores: newScores,
      });
      saveToStorage('defi-maze-history', newHistory);
      saveToStorage('defi-maze-scores', newScores);
      saveToStorage(`defi-maze-game-${finalGame.id}`, finalGame);

      return { success: true };
    }

    set({ currentGame: updatedGame });
    return { success: true };
  },

  completeGame: (level: Level): PlayerScore | null => {
    const game = get().currentGame;
    if (!game || game.status === 'playing') return null;

    if (game.status === 'success') {
      const timeUsed = Math.floor(
        (game.endTime! - game.startTime) / 1000
      );
      const avgRatio =
        game.nodeHistory.reduce((sum, n) => sum + n.collateralRatio, 0) /
          game.nodeHistory.length || game.collateralRatio;
      const score = calculateScore(
        timeUsed,
        avgRatio,
        level.safetyRatio,
        true
      );

      const playerScore: PlayerScore = {
        id: generateId(),
        gameId: game.id,
        playerName: game.playerName,
        levelId: game.levelId,
        levelName: level.name,
        timeUsed,
        successRate: 100,
        avgCollateralRatio: avgRatio,
        score,
        timestamp: Date.now(),
      };

      return playerScore;
    }
    return null;
  },

  replayGame: (gameId: string): GameState | null => {
    try {
      const stored = localStorage.getItem(`defi-maze-game-${gameId}`);
      if (stored) {
        const game = JSON.parse(stored) as GameState;
        set({ currentGame: game });
        return game;
      }
    } catch {
      // ignore
    }
    return null;
  },

  saveCustomPosition: (position: Position) => {
    const newPositions = [...get().customPositions, position];
    set({ customPositions: newPositions });
    saveToStorage('defi-maze-positions', newPositions);
  },

  getGameById: (gameId: string): GameState | null => {
    try {
      const stored = localStorage.getItem(`defi-maze-game-${gameId}`);
      return stored ? (JSON.parse(stored) as GameState) : null;
    } catch {
      return null;
    }
  },

  clearHistory: () => {
    set({
      gameHistory: [],
      playerScores: [],
      currentGame: null,
    });
    localStorage.removeItem('defi-maze-history');
    localStorage.removeItem('defi-maze-scores');
  },
}));
