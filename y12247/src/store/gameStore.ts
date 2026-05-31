import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cargo, BallastTank, Violation, GravityTrackPoint, VoyageReport, LevelConfig } from '@/types';
import { levels } from '@/data/levels';
import { calculateShipState, evaluateViolations, calculateScore, getRetroactiveAffectedCargo } from '@/utils/physics';

interface GameState {
  currentLevelIndex: number;
  cargos: Cargo[];
  tanks: BallastTank[];
  violations: Violation[];
  gravityTrack: GravityTrackPoint[];
  shipState: ReturnType<typeof calculateShipState>;
  reports: VoyageReport[];
  submitted: boolean;
  showEvaluation: boolean;
  alertViolations: Violation[];
}

interface GameActions {
  selectLevel: (index: number) => void;
  loadCargo: (cargoId: string, row: number, col: number) => void;
  unloadCargo: (cargoId: string) => void;
  moveCargo: (cargoId: string, row: number, col: number) => void;
  adjustBallast: (tankId: string, amount: number, isRetroactive?: boolean) => void;
  submitVoyage: () => void;
  closeEvaluation: () => void;
  dismissAlert: () => void;
  resetLevel: () => void;
  getCurrentConfig: () => LevelConfig;
}

const computeDerived = (cargos: Cargo[], tanks: BallastTank[], config: LevelConfig) => {
  const shipState = calculateShipState(cargos, tanks, config);
  const violations = evaluateViolations(shipState, cargos, tanks, config);
  return { shipState, violations };
};

const createInitialState = (levelIndex: number): Pick<GameState, 'currentLevelIndex' | 'cargos' | 'tanks' | 'gravityTrack' | 'submitted' | 'showEvaluation' | 'alertViolations'> & { shipState: GameState['shipState']; violations: GameState['violations'] } => {
  const config = levels[levelIndex];
  const cargos = config.cargoList.map(c => ({ ...c }));
  const tanks = config.ballastTanks.map(t => ({ ...t, operations: [] as typeof t.operations }));
  const { shipState, violations } = computeDerived(cargos, tanks, config);
  return {
    currentLevelIndex: levelIndex,
    cargos,
    tanks,
    violations,
    gravityTrack: [{ x: shipState.centerOfGravity.x, y: shipState.centerOfGravity.y, timestamp: Date.now() }],
    shipState,
    submitted: false,
    showEvaluation: false,
    alertViolations: [],
  };
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(0),
      reports: [],

      selectLevel: (index: number) => {
        set({ ...createInitialState(index), reports: get().reports });
      },

      loadCargo: (cargoId: string, row: number, col: number) => {
        const state = get();
        if (state.submitted) return;
        const config = levels[state.currentLevelIndex];
        const occupied = state.cargos.some(c => c.loaded && c.position?.row === row && c.position?.col === col);
        if (occupied) return;
        const newCargos = state.cargos.map(c =>
          c.id === cargoId ? { ...c, loaded: true, position: { row, col } } : c
        );
        const { shipState, violations } = computeDerived(newCargos, state.tanks, config);
        const newAlerts = violations.filter(v =>
          !state.violations.some(sv => sv.rule === v.rule && sv.severity === v.severity)
          && (v.severity === 'danger' || v.severity === 'critical')
        );
        set({
          cargos: newCargos,
          shipState,
          violations,
          gravityTrack: [...state.gravityTrack, { x: shipState.centerOfGravity.x, y: shipState.centerOfGravity.y, timestamp: Date.now() }],
          alertViolations: newAlerts.length > 0 ? newAlerts : state.alertViolations,
        });
      },

      unloadCargo: (cargoId: string) => {
        const state = get();
        if (state.submitted) return;
        const config = levels[state.currentLevelIndex];
        const newCargos = state.cargos.map(c =>
          c.id === cargoId ? { ...c, loaded: false, position: undefined } : c
        );
        const { shipState, violations } = computeDerived(newCargos, state.tanks, config);
        set({
          cargos: newCargos,
          shipState,
          violations,
          gravityTrack: [...state.gravityTrack, { x: shipState.centerOfGravity.x, y: shipState.centerOfGravity.y, timestamp: Date.now() }],
        });
      },

      moveCargo: (cargoId: string, row: number, col: number) => {
        const state = get();
        if (state.submitted) return;
        const config = levels[state.currentLevelIndex];
        const occupied = state.cargos.some(c => c.id !== cargoId && c.loaded && c.position?.row === row && c.position?.col === col);
        if (occupied) return;
        const newCargos = state.cargos.map(c =>
          c.id === cargoId ? { ...c, position: { row, col } } : c
        );
        const { shipState, violations } = computeDerived(newCargos, state.tanks, config);
        const newAlerts = violations.filter(v =>
          !state.violations.some(sv => sv.rule === v.rule && sv.severity === v.severity)
          && (v.severity === 'danger' || v.severity === 'critical')
        );
        set({
          cargos: newCargos,
          shipState,
          violations,
          gravityTrack: [...state.gravityTrack, { x: shipState.centerOfGravity.x, y: shipState.centerOfGravity.y, timestamp: Date.now() }],
          alertViolations: newAlerts.length > 0 ? newAlerts : state.alertViolations,
        });
      },

      adjustBallast: (tankId: string, amount: number, isRetroactive = false) => {
        const state = get();
        if (state.submitted) return;
        const config = levels[state.currentLevelIndex];
        const tank = state.tanks.find(t => t.id === tankId);
        if (!tank) return;
        const newCurrent = Math.max(0, Math.min(tank.capacity, tank.current + amount));
        const actualAmount = newCurrent - tank.current;
        if (actualAmount === 0) return;
        const affectedCargoIds = isRetroactive
          ? getRetroactiveAffectedCargo({ action: amount > 0 ? 'fill' : 'drain', amount: Math.abs(actualAmount), side: tank.side }, state.cargos, config)
          : [];
        const newOp = {
          id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          action: (amount > 0 ? 'fill' : 'drain') as 'fill' | 'drain',
          amount: Math.abs(actualAmount),
          isRetroactive,
          affectedCargoIds,
        };
        const newTanks = state.tanks.map(t =>
          t.id === tankId
            ? { ...t, current: newCurrent, operations: [...t.operations, newOp] }
            : t
        );
        const { shipState, violations } = computeDerived(state.cargos, newTanks, config);
        set({
          tanks: newTanks,
          shipState,
          violations,
          gravityTrack: [...state.gravityTrack, { x: shipState.centerOfGravity.x, y: shipState.centerOfGravity.y, timestamp: Date.now() }],
        });
      },

      submitVoyage: () => {
        const state = get();
        const config = levels[state.currentLevelIndex];
        const score = calculateScore(state.shipState, state.violations, state.cargos, config);
        const report: VoyageReport = {
          id: `report-${Date.now()}`,
          levelId: config.id,
          cargoManifest: state.cargos.map(c => ({ ...c })),
          ballastLog: state.tanks.flatMap(t => t.operations.map(op => ({ ...op }))),
          gravityTrack: [...state.gravityTrack],
          violations: [...state.violations],
          score,
          submittedAt: Date.now(),
        };
        set({
          submitted: true,
          showEvaluation: true,
          reports: [...state.reports, report],
        });
      },

      closeEvaluation: () => set({ showEvaluation: false }),
      dismissAlert: () => set({ alertViolations: [] }),
      resetLevel: () => {
        const state = get();
        set({ ...createInitialState(state.currentLevelIndex), reports: state.reports });
      },
      getCurrentConfig: () => levels[get().currentLevelIndex],
    }),
    {
      name: 'voyage_game_state',
      partialize: (state) => ({
        currentLevelIndex: state.currentLevelIndex,
        reports: state.reports,
      }),
    }
  )
);
