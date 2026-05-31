import { create } from 'zustand';
import type { GameState, ModeTower, TimingRecord, JudgmentResult, GameEvent, ReplayFrame, ScoreReport, SavedGame, Position, ErrorType } from '../types';
import { LEVELS, TOWER_TEMPLATES } from '../data/levels';
import { generateScaleCard } from '../game/cards/scaleCardGenerator';
import { generateChordMonster } from '../game/monsters/chordMonsterGenerator';
import { createTower, upgradeTower, canPlaceTower, isMonsterInRange, getSellValue } from '../game/towers/modeTowerGenerator';
import { performJudgment } from '../game/engine/judgmentEngine';
import { ERROR_TYPE_NAMES, SCALE_NAMES } from '../data/musicTheory';

interface GameStore {
  currentPage: 'home' | 'game' | 'review';
  gameState: GameState | null;
  replayData: ReplayFrame[] | null;
  isReplaying: boolean;
  replaySpeed: number;
  currentReplayFrame: number;
  selectedTowerTemplate: string | null;
  savedGames: SavedGame[];
  
  setCurrentPage: (page: 'home' | 'game' | 'review') => void;
  startGame: (levelId: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (won: boolean) => void;
  selectTowerTemplate: (templateKey: string | null) => void;
  placeTower: (templateKey: string, position: Position) => void;
  upgradeTower: (towerId: string) => void;
  sellTower: (towerId: string) => void;
  selectTower: (towerId: string | null) => void;
  recordTiming: (record: TimingRecord) => void;
  processJudgment: (result: JudgmentResult) => void;
  addEvent: (event: GameEvent) => void;
  captureReplayFrame: () => void;
  startWave: () => void;
  spawnMonster: (key: string) => void;
  updateMonsterPosition: (monsterId: string, position: Position, pathIndex: number) => void;
  setMonsterArrivalTime: (monsterId: string, time: number) => void;
  damageMonster: (monsterId: string, damage: number) => void;
  removeMonster: (monsterId: string) => void;
  towerAttack: (towerId: string, targetMonsterId: string | null, isLate?: boolean) => void;
  setCurrentCard: () => void;
  loseLife: () => void;
  startReview: (gameId: string) => void;
  playReplay: () => void;
  pauseReplay: () => void;
  seekReplay: (frame: number) => void;
  setReplaySpeed: (speed: number) => void;
  exportScore: () => ScoreReport | null;
  saveGame: () => void;
  loadSavedGames: () => void;
  clearGame: () => void;
}

const initialGameState: Omit<GameState, 'level'> = {
  gameId: '',
  levelId: '',
  status: 'playing',
  wave: 0,
  totalWaves: 0,
  lives: 10,
  gold: 100,
  combo: 0,
  maxCombo: 0,
  score: 0,
  currentCard: null,
  monsters: [],
  towers: [],
  timingRecords: [],
  judgments: [],
  events: [],
  replayFrames: [],
  startTime: 0,
  endTime: null,
  selectedTowerId: null,
  lastJudgment: null
};

export const useGameStore = create<GameStore>((set, get) => ({
  currentPage: 'home',
  gameState: null,
  replayData: null,
  isReplaying: false,
  replaySpeed: 1,
  currentReplayFrame: 0,
  selectedTowerTemplate: null,
  savedGames: [],

  setCurrentPage: (page) => set({ currentPage: page }),

  startGame: (levelId) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const towers: ModeTower[] = level.availableTowers.map(templateKey => {
      const template = TOWER_TEMPLATES[templateKey as keyof typeof TOWER_TEMPLATES];
      return {
        id: `tower_${templateKey}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: template.type,
        modeName: template.modeName,
        characteristicNotes: [...template.characteristicNotes] as any,
        damage: template.damage,
        range: template.range,
        attackSpeed: template.attackSpeed,
        level: 1,
        maxLevel: template.maxLevel,
        position: null,
        attackTime: null,
        isLate: false,
        cost: template.cost,
        upgradeCost: template.upgradeCost
      };
    });

    set({
      currentPage: 'game',
      gameState: {
        ...initialGameState,
        gameId,
        levelId,
        level,
        totalWaves: level.totalWaves,
        lives: level.initialLives,
        gold: level.initialGold,
        startTime,
        towers
      },
      selectedTowerTemplate: null
    });

    get().addEvent({
      type: 'game_end',
      timestamp: startTime,
      data: { levelId, levelName: level.name }
    });
  },

  pauseGame: () => set(state => ({
    gameState: state.gameState ? { ...state.gameState, status: 'paused' } : null
  })),

  resumeGame: () => set(state => ({
    gameState: state.gameState ? { ...state.gameState, status: 'playing' } : null
  })),

  endGame: (won) => {
    const state = get();
    if (!state.gameState) return;

    const endTime = Date.now();
    
    set({
      gameState: {
        ...state.gameState,
        status: won ? 'won' : 'lost',
        endTime
      }
    });

    get().addEvent({
      type: 'game_end',
      timestamp: endTime,
      data: { won, finalScore: state.gameState.score }
    });

    get().captureReplayFrame();
    get().saveGame();
  },

  selectTowerTemplate: (templateKey) => set({ selectedTowerTemplate: templateKey }),

  placeTower: (templateKey, position) => {
    const state = get();
    if (!state.gameState?.level) return;

    const template = TOWER_TEMPLATES[templateKey as keyof typeof TOWER_TEMPLATES];
    if (!template) return;
    if (state.gameState.gold < template.cost) return;
    if (!canPlaceTower(position, state.gameState.level.towerSlots, state.gameState.towers)) return;

    const newTower = createTower(templateKey);
    newTower.position = position;

    set({
      gameState: {
        ...state.gameState,
        gold: state.gameState.gold - template.cost,
        towers: state.gameState.towers.map(t => 
          t.id === newTower.id ? newTower : t
        )
      },
      selectedTowerTemplate: null
    });

    get().addEvent({
      type: 'tower_place',
      timestamp: Date.now(),
      data: { towerId: newTower.id, position, templateKey }
    });
  },

  upgradeTower: (towerId) => {
    const state = get();
    if (!state.gameState) return;

    const tower = state.gameState.towers.find(t => t.id === towerId);
    if (!tower || tower.level >= tower.maxLevel) return;
    if (state.gameState.gold < tower.upgradeCost) return;

    const upgradedTower = upgradeTower(tower);

    set({
      gameState: {
        ...state.gameState,
        gold: state.gameState.gold - tower.upgradeCost,
        towers: state.gameState.towers.map(t =>
          t.id === towerId ? upgradedTower : t
        )
      }
    });
  },

  sellTower: (towerId) => {
    const state = get();
    if (!state.gameState) return;

    const tower = state.gameState.towers.find(t => t.id === towerId);
    if (!tower) return;

    const sellValue = getSellValue(tower);
    const resetTower = { ...tower, position: null, level: 1 };

    set({
      gameState: {
        ...state.gameState,
        gold: state.gameState.gold + sellValue,
        towers: state.gameState.towers.map(t =>
          t.id === towerId ? resetTower : t
        ),
        selectedTowerId: null
      }
    });
  },

  selectTower: (towerId) => set(state => ({
    gameState: state.gameState ? { ...state.gameState, selectedTowerId: towerId } : null
  })),

  recordTiming: (record) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      timingRecords: [...state.gameState.timingRecords, record]
    } : null
  })),

  processJudgment: (result) => {
    const state = get();
    if (!state.gameState) return;

    const newCombo = result.isCorrect ? state.gameState.combo + 1 : 0;
    const newMaxCombo = Math.max(state.gameState.maxCombo, newCombo);
    const scoreGain = result.isCorrect ? 100 * (1 + newCombo * 0.1) : 0;

    set({
      gameState: {
        ...state.gameState,
        judgments: [...state.gameState.judgments, result],
        combo: newCombo,
        maxCombo: newMaxCombo,
        score: state.gameState.score + Math.floor(scoreGain),
        lastJudgment: result
      }
    });

    get().addEvent({
      type: 'judgment',
      timestamp: Date.now(),
      data: { result }
    });
  },

  addEvent: (event) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      events: [...state.gameState.events, event]
    } : null
  })),

  captureReplayFrame: () => {
    const state = get();
    if (!state.gameState) return;

    const frame: ReplayFrame = {
      frameNumber: state.gameState.replayFrames.length,
      timestamp: Date.now(),
      gameState: JSON.parse(JSON.stringify(state.gameState)),
      events: state.gameState.events.filter(e => 
        e.timestamp >= (state.gameState.replayFrames[state.gameState.replayFrames.length - 1]?.timestamp || state.gameState.startTime)
      )
    };

    set({
      gameState: {
        ...state.gameState,
        replayFrames: [...state.gameState.replayFrames, frame]
      }
    });
  },

  startWave: () => {
    const state = get();
    if (!state.gameState?.level) return;

    const newWave = state.gameState.wave + 1;
    if (newWave > state.gameState.totalWaves) {
      get().endGame(true);
      return;
    }

    set({
      gameState: {
        ...state.gameState,
        wave: newWave
      }
    });

    get().setCurrentCard();
    get().addEvent({
      type: 'wave_start',
      timestamp: Date.now(),
      data: { wave: newWave }
    });
  },

  spawnMonster: (key) => {
    const state = get();
    if (!state.gameState?.level) return;

    const startPos = state.gameState.level.path[0];
    const cardAccidentals = state.gameState.currentCard?.accidentals || [];
    const monster = generateChordMonster(
      key,
      state.gameState.wave - 1,
      state.gameState.level.difficulty,
      startPos,
      cardAccidentals
    );

    set({
      gameState: {
        ...state.gameState,
        monsters: [...state.gameState.monsters, monster]
      }
    });

    get().recordTiming({
      source: 'monster',
      id: monster.id,
      timestamp: Date.now(),
      data: monster
    });

    get().addEvent({
      type: 'monster_spawn',
      timestamp: Date.now(),
      data: { monsterId: monster.id, key }
    });
  },

  updateMonsterPosition: (monsterId, position, pathIndex) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      monsters: state.gameState.monsters.map(m =>
        m.id === monsterId ? { ...m, position, pathIndex } : m
      )
    } : null
  })),

  setMonsterArrivalTime: (monsterId, time) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      monsters: state.gameState.monsters.map(m =>
        m.id === monsterId ? { ...m, arrivalTime: time } : m
      )
    } : null
  })),

  damageMonster: (monsterId, damage) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      monsters: state.gameState.monsters.map(m =>
        m.id === monsterId ? { ...m, hp: Math.max(0, m.hp - damage) } : m
      ).filter(m => m.hp > 0)
    } : null
  })),

  removeMonster: (monsterId) => set(state => ({
    gameState: state.gameState ? {
      ...state.gameState,
      monsters: state.gameState.monsters.filter(m => m.id !== monsterId),
      gold: state.gameState.gold + 10
    } : null
  })),

  towerAttack: (towerId, targetMonsterId, isLate = false) => {
    const state = get();
    if (!state.gameState) return;

    const attackTime = Date.now();

    set({
      gameState: {
        ...state.gameState,
        towers: state.gameState.towers.map(t =>
          t.id === towerId ? { ...t, attackTime, isLate } : t
        )
      }
    });

    const tower = state.gameState.towers.find(t => t.id === towerId);
    if (tower) {
      get().recordTiming({
        source: 'tower',
        id: towerId,
        timestamp: attackTime,
        data: { ...tower, attackTime, isLate }
      });
    }

    get().addEvent({
      type: 'tower_attack',
      timestamp: attackTime,
      data: { towerId, targetMonsterId, isLate }
    });

    if (targetMonsterId && state.gameState.currentCard) {
      const monster = state.gameState.monsters.find(m => m.id === targetMonsterId);
      const attackingTower = state.gameState.towers.find(t => t.id === towerId);
      
      if (monster && attackingTower) {
        const judgment = performJudgment(
          state.gameState.currentCard,
          monster,
          attackingTower,
          state.gameState.timingRecords
        );
        
        get().processJudgment(judgment);
        
        if (judgment.isCorrect) {
          get().damageMonster(targetMonsterId, attackingTower.damage);
          if (monster.hp - attackingTower.damage <= 0) {
            get().removeMonster(targetMonsterId);
          }
        } else {
          get().loseLife();
        }
      }
    }
  },

  setCurrentCard: () => {
    const state = get();
    if (!state.gameState?.level) return;

    const waveConfig = state.gameState.level.waves[state.gameState.wave - 1];
    if (!waveConfig) return;

    const randomKey = waveConfig.keys[Math.floor(Math.random() * waveConfig.keys.length)];
    const card = generateScaleCard(
      randomKey,
      state.gameState.wave - 1,
      state.gameState.level.difficulty
    );

    set({
      gameState: {
        ...state.gameState,
        currentCard: card
      }
    });

    get().recordTiming({
      source: 'card',
      id: card.id,
      timestamp: Date.now(),
      data: card
    });

    get().addEvent({
      type: 'card_show',
      timestamp: Date.now(),
      data: { cardId: card.id, key: randomKey }
    });
  },

  loseLife: () => {
    const state = get();
    if (!state.gameState) return;

    const newLives = state.gameState.lives - 1;
    
    set({
      gameState: {
        ...state.gameState,
        lives: newLives
      }
    });

    get().addEvent({
      type: 'life_lost',
      timestamp: Date.now(),
      data: { remainingLives: newLives }
    });

    if (newLives <= 0) {
      get().endGame(false);
    }
  },

  startReview: (gameId) => {
    const state = get();
    const savedGame = state.savedGames.find(g => g.gameId === gameId);
    if (!savedGame) return;

    set({
      currentPage: 'review',
      replayData: savedGame.replayData,
      currentReplayFrame: 0,
      isReplaying: false
    });
  },

  playReplay: () => set({ isReplaying: true }),
  pauseReplay: () => set({ isReplaying: false }),
  seekReplay: (frame) => set({ currentReplayFrame: frame }),
  setReplaySpeed: (speed) => set({ replaySpeed: speed }),

  exportScore: () => {
    const state = get();
    if (!state.gameState?.endTime) return null;

    const errorBreakdown: Record<ErrorType, number> = {
      accidental_miss: 0,
      enharmonic_confusion: 0,
      chord_misattribution: 0,
      tower_late: 0
    };

    state.gameState.judgments.forEach(j => {
      j.errorTypes.forEach(e => {
        errorBreakdown[e]++;
      });
    });

    const correctCount = state.gameState.judgments.filter(j => j.isCorrect).length;
    const totalJudgments = state.gameState.judgments.length;

    const report: ScoreReport = {
      gameId: state.gameState.gameId,
      levelId: state.gameState.levelId,
      levelName: state.gameState.level?.name || '',
      startTime: state.gameState.startTime,
      endTime: state.gameState.endTime,
      duration: state.gameState.endTime - state.gameState.startTime,
      totalScore: state.gameState.score,
      maxCombo: state.gameState.maxCombo,
      accuracy: totalJudgments > 0 ? correctCount / totalJudgments : 0,
      totalJudgments,
      correctCount,
      errorBreakdown,
      judgments: state.gameState.judgments
    };

    return report;
  },

  saveGame: () => {
    const state = get();
    if (!state.gameState?.endTime) return;

    const correctCount = state.gameState.judgments.filter(j => j.isCorrect).length;
    const totalJudgments = state.gameState.judgments.length;

    const savedGame: SavedGame = {
      gameId: state.gameState.gameId,
      levelId: state.gameState.levelId,
      levelName: state.gameState.level?.name || '',
      startTime: state.gameState.startTime,
      endTime: state.gameState.endTime,
      score: state.gameState.score,
      won: state.gameState.status === 'won',
      accuracy: totalJudgments > 0 ? correctCount / totalJudgments : 0,
      maxCombo: state.gameState.maxCombo,
      replayData: state.gameState.replayFrames,
      judgments: state.gameState.judgments
    };

    const existing = JSON.parse(localStorage.getItem('scaleTower_savedGames') || '[]');
    const updated = [...existing, savedGame].slice(-10);
    localStorage.setItem('scaleTower_savedGames', JSON.stringify(updated));
    
    set({ savedGames: updated });
  },

  loadSavedGames: () => {
    const saved = JSON.parse(localStorage.getItem('scaleTower_savedGames') || '[]');
    set({ savedGames: saved });
  },

  clearGame: () => set({
    gameState: null,
    replayData: null,
    isReplaying: false,
    currentReplayFrame: 0
  })
}));
