import { create } from 'zustand';
import {
  GameState,
  Submarine,
  Reef,
  SonarPulse,
  Echo,
  DecisionRecord,
  Misjudgment,
  GamePhase
} from '../types/game';
import { LEVEL_1, REFLECTION_COEFFICIENTS } from '../data/levels';
import {
  generateCleanWaveform,
  generateDistortedWaveform,
  generateMultiReflectionWaveform,
  calculateEchoStrength,
  calculateDistance,
  calculateAngle
} from '../utils/waveform';
import {
  checkAnyCollision,
  checkNearMiss,
  checkTargetReached
} from '../utils/collision';

type GameStore = GameState & {
  initializeGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  fireSonar: () => void;
  updateSonarPulse: () => void;
  moveSubmarine: (direction: 'up' | 'down' | 'left' | 'right', speed: number) => void;
  setBeatWindow: (isOpen: boolean, beatIndex: number) => void;
  addRemark: (recordId: string, remark: string, author: string) => void;
  completeGame: (success: boolean) => void;
  resetGame: () => void;
}

const createInitialState = (): GameState => {
  const level = LEVEL_1;
  return {
    submarine: {
      x: level.startPosition.x,
      y: level.startPosition.y,
      depth: 100,
      speed: 1,
      direction: 'right'
    },
    reefs: level.reefs.map(r => ({ ...r, detected: false })),
    sonarHistory: [],
    currentSonarPulse: null,
    decisionLog: [],
    misjudgments: [],
    currentPhase: 'intro',
    currentStep: 0,
    score: 100,
    maxScore: 100,
    targetPosition: level.targetPosition,
    beatIndex: 0,
    isBeatWindow: false,
    lastDecisionTime: 0
  };
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createInitialState(),

  initializeGame: () => {
    set(createInitialState());
  },

  startGame: () => {
    set({ currentPhase: 'playing', currentStep: 1 });
  },

  pauseGame: () => {
    set({ currentPhase: 'paused' });
  },

  resumeGame: () => {
    set({ currentPhase: 'playing' });
  },

  fireSonar: () => {
    const state = get();
    if (state.currentPhase !== 'playing' || state.currentSonarPulse) return;

    const submarine = state.submarine;
    const currentStep = state.currentStep;
    const trigger = LEVEL_1.misjudgmentTriggers.find(t => t.step === currentStep);

    const newPulse: SonarPulse = {
      id: `pulse-${Date.now()}`,
      timestamp: Date.now(),
      originX: submarine.x,
      originY: submarine.y,
      radius: 0,
      maxRadius: 300,
      echoes: [],
      isComplete: false,
      isMisjudged: !!trigger
    };

    set({ currentSonarPulse: newPulse });
  },

  updateSonarPulse: () => {
    const state = get();
    const pulse = state.currentSonarPulse;
    if (!pulse || pulse.isComplete) return;

    const newRadius = pulse.radius + 8;
    const echoes: Echo[] = [...pulse.echoes];

    state.reefs.forEach(reef => {
      const distance = calculateDistance(pulse.originX, pulse.originY, reef.x + reef.width / 2, reef.y + reef.height / 2);
      
      if (Math.abs(newRadius - distance) < 15 && !echoes.find(e => e.id === reef.id)) {
        const strength = calculateEchoStrength(distance, REFLECTION_COEFFICIENTS[reef.type]);
        const angle = calculateAngle(pulse.originX, pulse.originY, reef.x + reef.width / 2, reef.y + reef.height / 2);
        const currentStep = state.currentStep;
        const trigger = LEVEL_1.misjudgmentTriggers.find(t => t.step === currentStep && t.reefId === reef.id);

        let waveformData: number[];
        let isMisjudged = false;

        if (trigger) {
          isMisjudged = true;
          if (trigger.type === 'ambiguous_echo') {
            waveformData = generateDistortedWaveform(distance, strength, 0.4);
          } else if (trigger.type === 'multiple_reflections') {
            waveformData = generateMultiReflectionWaveform([distance, distance + 50], [strength, strength * 0.6]);
          } else {
            waveformData = generateDistortedWaveform(distance, strength, 0.3);
          }
        } else {
          waveformData = generateCleanWaveform(distance, strength);
        }

        echoes.push({
          id: reef.id,
          distance,
          angle,
          strength,
          isMisjudged,
          actualTarget: reef.type,
          misjudgmentReason: trigger?.reason,
          waveformData
        });
      }
    });

    const isComplete = newRadius >= pulse.maxRadius;

    set({
      currentSonarPulse: {
        ...pulse,
        radius: newRadius,
        echoes,
        isComplete
      }
    });

    if (isComplete) {
      const detectedReefs = [...state.reefs];
      echoes.forEach(echo => {
        const reefIndex = detectedReefs.findIndex(r => r.id === echo.id);
        if (reefIndex >= 0) {
          detectedReefs[reefIndex] = { ...detectedReefs[reefIndex], detected: true };
        }
      });

      const currentStep = state.currentStep;
      const trigger = LEVEL_1.misjudgmentTriggers.find(t => t.step === currentStep);

      if (trigger && echoes.some(e => e.isMisjudged)) {
        const misjudgedEcho = echoes.find(e => e.isMisjudged)!;
        const misjudgment: Misjudgment = {
          id: `misjudge-${Date.now()}`,
          step: currentStep,
          timestamp: Date.now(),
          sonarPulseId: pulse.id,
          reason: trigger.reason,
          suggestion: trigger.suggestion,
          impactOnScore: -15,
          playerDecision: '待决策',
          correctDecision: trigger.type === 'ambiguous_echo' ? '减速并等待下一次扫描' : '忽略弱信号，保持航线',
          detectedWaveform: misjudgedEcho.waveformData,
          actualWaveform: generateCleanWaveform(misjudgedEcho.distance, misjudgedEcho.strength)
        };

        set({
          reefs: detectedReefs,
          misjudgments: [...state.misjudgments, misjudgment],
          score: state.score - 15
        });
      } else {
        set({ reefs: detectedReefs });
      }

      const record: DecisionRecord = {
        id: `record-${Date.now()}`,
        timestamp: Date.now(),
        step: currentStep,
        action: 'sonar',
        sonarData: { ...pulse, radius: newRadius, echoes, isComplete: true },
        isMissingFields: false,
        isLateEntry: !state.isBeatWindow,
        remarks: `扫描完成，发现 ${echoes.length} 个目标`,
        consequence: trigger ? 'misjudgment' : 'safe'
      };

      set({
        decisionLog: [...state.decisionLog, record],
        sonarHistory: [...state.sonarHistory, { ...pulse, radius: newRadius, echoes, isComplete: true }]
      });

      setTimeout(() => {
        set({ currentSonarPulse: null });
      }, 500);
    }
  },

  moveSubmarine: (direction, speed) => {
    const state = get();
    if (state.currentPhase !== 'playing') return;

    const moveDistance = speed * 40;
    let newX = state.submarine.x;
    let newY = state.submarine.y;

    switch (direction) {
      case 'up': newY -= moveDistance; break;
      case 'down': newY += moveDistance; break;
      case 'left': newX -= moveDistance; break;
      case 'right': newX += moveDistance; break;
    }

    newX = Math.max(20, Math.min(980, newX));
    newY = Math.max(20, Math.min(480, newY));

    const newSubmarine: Submarine = {
      ...state.submarine,
      x: newX,
      y: newY,
      direction,
      speed
    };

    const collision = checkAnyCollision(newSubmarine, state.reefs);
    const nearMiss = state.reefs.some(r => checkNearMiss(newSubmarine, r));
    const reachedTarget = checkTargetReached(newSubmarine, state.targetPosition);

    let consequence: DecisionRecord['consequence'] = 'safe';
    let scoreChange = 0;

    if (collision) {
      consequence = 'collision';
      scoreChange = -30;
    } else if (nearMiss) {
      consequence = 'near-miss';
      scoreChange = -5;
    }

    const newStep = state.currentStep + 1;
    const isLateEntry = !state.isBeatWindow;

    const record: DecisionRecord = {
      id: `record-${Date.now()}`,
      timestamp: Date.now(),
      step: state.currentStep,
      action: 'move',
      direction,
      speed,
      isMissingFields: speed === 0,
      isLateEntry,
      consequence
    };

    set({
      submarine: newSubmarine,
      decisionLog: [...state.decisionLog, record],
      currentStep: newStep,
      score: state.score + scoreChange,
      lastDecisionTime: Date.now()
    });

    if (collision) {
      setTimeout(() => get().completeGame(false), 500);
    } else if (reachedTarget) {
      setTimeout(() => get().completeGame(true), 500);
    }
  },

  setBeatWindow: (isOpen, beatIndex) => {
    set({ isBeatWindow: isOpen, beatIndex });
  },

  addRemark: (recordId, remark, author) => {
    const state = get();
    const logIndex = state.decisionLog.findIndex(r => r.id === recordId);
    if (logIndex < 0) return;

    const record = state.decisionLog[logIndex];
    const oldRemark = record.remarks || '';

    const newLog = [...state.decisionLog];
    newLog[logIndex] = {
      ...record,
      remarks: remark,
      remarkHistory: [
        ...(record.remarkHistory || []),
        {
          id: `remark-${Date.now()}`,
          timestamp: Date.now(),
          oldValue: oldRemark,
          newValue: remark,
          author
        }
      ]
    };

    set({ decisionLog: newLog });
  },

  completeGame: (success) => {
    set({
      currentPhase: success ? 'completed' : 'failed'
    });
  },

  resetGame: () => {
    set(createInitialState());
  }
}));
