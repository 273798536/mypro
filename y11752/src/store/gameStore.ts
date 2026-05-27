import { create } from 'zustand';
import { Case, GameRecord, RiskType } from '@/types/game';
import { getCaseById } from '@/data/cases';
import { calculateScore, createGameRecord, generateHash } from '@/utils/gameEngine';
import { addRecord, updateRecord, loadRecords } from '@/utils/storage';

interface GameStore {
  currentCase: Case | null;
  selectedMaterials: string[];
  markedRisks: Record<string, RiskType>;
  timeRemaining: number;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  lastRecord: GameRecord | null;
  records: GameRecord[];

  startGame: (caseId: string) => void;
  selectMaterial: (materialId: string) => void;
  deselectMaterial: (materialId: string) => void;
  markRisk: (materialId: string, riskType: RiskType) => void;
  unmarkRisk: (materialId: string) => void;
  setTimeRemaining: (time: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  submitGame: () => GameRecord;
  resetGame: () => void;
  loadSavedRecords: () => void;
  markAsExported: (recordId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentCase: null,
  selectedMaterials: [],
  markedRisks: {},
  timeRemaining: 0,
  isPlaying: false,
  isPaused: false,
  startTime: 0,
  lastRecord: null,
  records: [],

  startGame: (caseId: string) => {
    const caseData = getCaseById(caseId);
    if (caseData) {
      set({
        currentCase: caseData,
        selectedMaterials: [],
        markedRisks: {},
        timeRemaining: caseData.timeLimit,
        isPlaying: true,
        isPaused: false,
        startTime: Date.now()
      });
    }
  },

  selectMaterial: (materialId: string) => {
    set(state => ({
      selectedMaterials: [...new Set([...state.selectedMaterials, materialId])]
    }));
  },

  deselectMaterial: (materialId: string) => {
    set(state => ({
      selectedMaterials: state.selectedMaterials.filter(id => id !== materialId)
    }));
  },

  markRisk: (materialId: string, riskType: RiskType) => {
    set(state => ({
      markedRisks: {
        ...state.markedRisks,
        [materialId]: riskType
      }
    }));
  },

  unmarkRisk: (materialId: string) => {
    set(state => {
      const newMarkedRisks = { ...state.markedRisks };
      delete newMarkedRisks[materialId];
      return { markedRisks: newMarkedRisks };
    });
  },

  setTimeRemaining: (time: number) => {
    set({ timeRemaining: time });
  },

  pauseGame: () => {
    set({ isPaused: true });
  },

  resumeGame: () => {
    set({ isPaused: false });
  },

  submitGame: () => {
    const state = get();
    if (!state.currentCase) {
      throw new Error('No active game');
    }

    const scoreResult = calculateScore(
      state.currentCase,
      state.markedRisks,
      state.timeRemaining,
      state.startTime
    );

    const record = createGameRecord(state.currentCase, scoreResult, state.startTime);
    const hash = generateHash(record);
    record.exportHash = hash;

    const updatedRecords = addRecord(record);

    set({
      lastRecord: record,
      records: updatedRecords,
      isPlaying: false
    });

    return record;
  },

  resetGame: () => {
    set({
      currentCase: null,
      selectedMaterials: [],
      markedRisks: {},
      timeRemaining: 0,
      isPlaying: false,
      isPaused: false,
      startTime: 0
    });
  },

  loadSavedRecords: () => {
    const records = loadRecords();
    set({ records });
  },

  markAsExported: (recordId: string) => {
    const state = get();
    const record = state.records.find(r => r.id === recordId);
    if (record) {
      const hash = generateHash(record);
      const updatedRecords = updateRecord(recordId, { exported: true, exportHash: hash });
      set({ records: updatedRecords });
    }
  }
}));
