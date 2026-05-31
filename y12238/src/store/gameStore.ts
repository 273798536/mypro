import { create } from 'zustand';
import {
  Truck,
  GateDecision,
  GameSession,
  Level,
  RuleFeedback,
  Conflict,
  GameStep,
  DecisionType,
} from '@/types';

interface GameState {
  session: GameSession | null;
  currentLevel: Level | null;
  currentTruckIndex: number;
  trucks: Truck[];
  yardVersion: number;
  yardVersionHistory: { version: number; timestamp: Date }[];
  decisions: GateDecision[];
  steps: GameStep[];
  conflicts: Conflict[];
  feedback: RuleFeedback | null;
  isFailureModalOpen: boolean;
  failureReason: string | null;
  selectedTruck: Truck | null;
  isGameOver: boolean;
  score: number;
  correctDecisions: number;

  initGame: (level: Level) => void;
  processDecision: (truckId: string, decision: DecisionType) => void;
  updateTruckRemark: (truckId: string, newRemark: string) => void;
  updateYardVersion: (newVersion: number) => void;
  setShiftOvertime: (truckId: string, overtimeMinutes: number) => void;
  setAppointmentOverdue: (truckId: string, overdue: boolean) => void;
  setFeedback: (feedback: RuleFeedback | null) => void;
  openFailureModal: (reason: string) => void;
  closeFailureModal: () => void;
  selectTruck: (truck: Truck | null) => void;
  endGame: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  currentLevel: null,
  currentTruckIndex: 0,
  trucks: [],
  yardVersion: 1,
  yardVersionHistory: [],
  decisions: [],
  steps: [],
  conflicts: [],
  feedback: null,
  isFailureModalOpen: false,
  failureReason: null,
  selectedTruck: null,
  isGameOver: false,
  score: 100,
  correctDecisions: 0,

  initGame: (level: Level) => {
    const now = new Date();
    const session: GameSession = {
      id: `session-${Date.now()}`,
      levelId: level.id,
      levelName: level.name,
      score: 100,
      totalSteps: 0,
      conflictCount: 0,
      startTime: now,
      endTime: now,
      decisions: [],
      evidences: [],
      steps: [],
      yardVersionHistory: [{ version: level.yardVersion, timestamp: now }],
    };

    set({
      session,
      currentLevel: level,
      currentTruckIndex: 0,
      trucks: JSON.parse(JSON.stringify(level.initialTrucks)),
      yardVersion: level.yardVersion,
      yardVersionHistory: [{ version: level.yardVersion, timestamp: now }],
      decisions: [],
      steps: [],
      conflicts: [],
      feedback: null,
      isFailureModalOpen: false,
      failureReason: null,
      selectedTruck: null,
      isGameOver: false,
      score: 100,
      correctDecisions: 0,
    });
  },

  processDecision: (truckId: string, decision: DecisionType) => {
    const state = get();
    const truckIndex = state.trucks.findIndex(t => t.id === truckId);
    if (truckIndex === -1) return;

    const truck = state.trucks[truckIndex];
    const decisionLabels: Record<DecisionType, string> = {
      release: '放行',
      detain: '暂扣',
      transfer: '转场',
    };

    const gateDecision: GateDecision = {
      id: `decision-${Date.now()}-${truckId}`,
      truckId,
      decisionType: decision,
      gateNo: 'G1',
      timestamp: new Date(),
      operator: '学员',
      conclusion: decisionLabels[decision],
    };

    const step: GameStep = {
      id: `step-${Date.now()}`,
      stepNo: state.steps.length + 1,
      actionType: 'decision',
      truckId,
      decision,
      isValid: true,
      conflicts: [],
      stateSnapshot: {
        trucks: JSON.parse(JSON.stringify(state.trucks)),
        yardVersion: state.yardVersion,
      },
    };

    set({
      decisions: [...state.decisions, gateDecision],
      steps: [...state.steps, step],
      currentTruckIndex: truckIndex + 1,
    });
  },

  updateTruckRemark: (truckId: string, newRemark: string) => {
    const state = get();
    const trucks = state.trucks.map(truck => {
      if (truck.id === truckId) {
        const newVersion = truck.currentVersion + 1;
        return {
          ...truck,
          currentRemark: newRemark,
          currentVersion: newVersion,
          versionHistory: [
            ...truck.versionHistory,
            {
              id: `${truckId}-v${newVersion}`,
              version: newVersion,
              remark: newRemark,
              timestamp: new Date(),
              operator: '系统更新',
            },
          ],
        };
      }
      return truck;
    });
    set({ trucks });
  },

  updateYardVersion: (newVersion: number) => {
    const state = get();
    set({
      yardVersion: newVersion,
      yardVersionHistory: [
        ...state.yardVersionHistory,
        { version: newVersion, timestamp: new Date() },
      ],
    });
  },

  setShiftOvertime: (truckId: string, overtimeMinutes: number) => {
    const trucks = get().trucks.map(truck => {
      if (truck.id === truckId) {
        return {
          ...truck,
          shiftRecord: {
            ...truck.shiftRecord,
            isOvertime: true,
            overtimeMinutes,
          },
        };
      }
      return truck;
    });
    set({ trucks });
  },

  setAppointmentOverdue: (truckId: string, overdue: boolean) => {
    console.log('setAppointmentOverdue', truckId, overdue);
  },

  setFeedback: (feedback: RuleFeedback | null) => {
    set({ feedback });
  },

  openFailureModal: (reason: string) => {
    set({ isFailureModalOpen: true, failureReason: reason });
  },

  closeFailureModal: () => {
    set({ isFailureModalOpen: false, failureReason: null });
  },

  selectTruck: (truck: Truck | null) => {
    set({ selectedTruck: truck });
  },

  endGame: () => {
    const state = get();
    if (state.session) {
      set({
        session: {
          ...state.session,
          endTime: new Date(),
          score: state.score,
          totalSteps: state.steps.length,
          conflictCount: state.conflicts.length,
          decisions: state.decisions,
          steps: state.steps,
          yardVersionHistory: state.yardVersionHistory,
        },
        isGameOver: true,
      });
    }
  },

  resetGame: () => {
    const state = get();
    if (state.currentLevel) {
      get().initGame(state.currentLevel);
    }
  },
}));
