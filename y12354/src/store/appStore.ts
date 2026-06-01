import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IVCurveData, DiagnosisResult, DiagnosisEvent, Problem } from '../types';

interface AppState {
  curves: IVCurveData[];
  diagnoses: DiagnosisResult[];
  events: DiagnosisEvent[];
  problems: Problem[];
  selectedCurve: IVCurveData | null;
  selectedDiagnosis: DiagnosisResult | null;
  selectedEvent: DiagnosisEvent | null;
  selectedProblem: Problem | null;

  addCurve: (curve: IVCurveData) => void;
  setSelectedCurve: (curve: IVCurveData | null) => void;
  addDiagnosis: (diagnosis: DiagnosisResult) => void;
  setSelectedDiagnosis: (diagnosis: DiagnosisResult | null) => void;
  addEvent: (event: DiagnosisEvent) => void;
  updateEvent: (id: string, updates: Partial<DiagnosisEvent>) => void;
  setSelectedEvent: (event: DiagnosisEvent | null) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (id: string, updates: Partial<Problem>) => void;
  setSelectedProblem: (problem: Problem | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      curves: [],
      diagnoses: [],
      events: [],
      problems: [],
      selectedCurve: null,
      selectedDiagnosis: null,
      selectedEvent: null,
      selectedProblem: null,

      addCurve: (curve) =>
        set((state) => ({
          curves: [...state.curves, curve],
        })),

      setSelectedCurve: (curve) => set({ selectedCurve: curve }),

      addDiagnosis: (diagnosis) =>
        set((state) => ({
          diagnoses: [...state.diagnoses, diagnosis],
        })),

      setSelectedDiagnosis: (diagnosis) => set({ selectedDiagnosis: diagnosis }),

      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event],
        })),

      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      setSelectedEvent: (event) => set({ selectedEvent: event }),

      addProblem: (problem) =>
        set((state) => ({
          problems: [...state.problems, problem],
        })),

      updateProblem: (id, updates) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      setSelectedProblem: (problem) => set({ selectedProblem: problem }),
    }),
    {
      name: 'iv-diagnosis-storage',
    }
  )
);
