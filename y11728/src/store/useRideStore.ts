import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RideInput, RideResult, ValidationResult, HistoryRecord, HistoryVersion } from '@/types';
import { calculatePower } from '@/utils/powerCalculator';
import { validateRideInput } from '@/utils/validator';
import { DEFAULT_INPUT } from '@/data/samples';

interface RideState {
  currentInput: RideInput;
  currentResult: RideResult | null;
  currentValidation: ValidationResult | null;
  history: HistoryRecord[];
  ftp: number;
  selectedHistoryId: string | null;
  
  setInput: (input: Partial<RideInput>) => void;
  loadSample: (sample: RideInput) => void;
  calculate: () => void;
  saveToHistory: (note?: string) => string;
  updateHistoryRecord: (id: string, updates: Partial<RideInput>, note?: string) => void;
  deleteHistoryRecord: (id: string) => void;
  loadFromHistory: (id: string) => void;
  clearCurrent: () => void;
  setFtp: (ftp: number) => void;
  autoFixIssue: (field: keyof RideInput, value: number | string) => void;
}

export const useRideStore = create<RideState>()(
  persist(
    (set, get) => ({
      currentInput: { ...DEFAULT_INPUT },
      currentResult: null,
      currentValidation: null,
      history: [],
      ftp: 250,
      selectedHistoryId: null,

      setInput: (input) => {
        set((state) => {
          const newInput = { ...state.currentInput, ...input, timestamp: Date.now() };
          const validation = validateRideInput(newInput);
          const result = validation.isValid ? calculatePower(newInput, undefined, state.ftp) : state.currentResult;
          return {
            currentInput: newInput,
            currentValidation: validation,
            currentResult: result,
          };
        });
      },

      loadSample: (sample) => {
        const validation = validateRideInput(sample);
        const result = validation.isValid ? calculatePower(sample, undefined, get().ftp) : null;
        set({
          currentInput: { ...sample, id: `input_${Date.now()}` },
          currentValidation: validation,
          currentResult: result,
        });
      },

      calculate: () => {
        const { currentInput, ftp } = get();
        const validation = validateRideInput(currentInput);
        if (validation.isValid) {
          const result = calculatePower(currentInput, undefined, ftp);
          set({ currentResult: result, currentValidation: validation });
        } else {
          set({ currentValidation: validation });
        }
      },

      saveToHistory: (note) => {
        const { currentInput, currentResult, currentValidation, history, ftp } = get();
        if (!currentResult) {
          throw new Error('请先完成计算');
        }
        
        const id = `record_${Date.now()}`;
        const record: HistoryRecord = {
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          input: { ...currentInput, id },
          result: { ...currentResult, inputId: id },
          validation: currentValidation!,
          versions: [{
            version: 1,
            timestamp: Date.now(),
            changes: {},
            previousValues: {},
            note: note || '初始创建',
          }],
          ftp,
        };
        
        set({ history: [record, ...history] });
        return id;
      },

      updateHistoryRecord: (id, updates, note) => {
        set((state) => {
          const history = state.history.map((record) => {
            if (record.id !== id) return record;
            
            const previousValues: Partial<RideInput> = {};
            Object.keys(updates).forEach((key) => {
              const k = key as keyof RideInput;
              (previousValues as any)[k] = record.input[k];
            });
            
            const newInput = { ...record.input, ...updates };
            const validation = validateRideInput(newInput);
            const result = validation.isValid ? calculatePower(newInput, undefined, state.ftp) : record.result;
            
            const newVersion: HistoryVersion = {
              version: record.versions.length + 1,
              timestamp: Date.now(),
              changes: updates,
              previousValues,
              note: note || '数据修正',
            };
            
            return {
              ...record,
              input: newInput,
              result: result,
              validation,
              updatedAt: Date.now(),
              versions: [...record.versions, newVersion],
            };
          });
          
          return { history };
        });
      },

      deleteHistoryRecord: (id) => {
        set((state) => ({
          history: state.history.filter((r) => r.id !== id),
          selectedHistoryId: state.selectedHistoryId === id ? null : state.selectedHistoryId,
        }));
      },

      loadFromHistory: (id) => {
        const record = get().history.find((r) => r.id === id);
        if (record) {
          set({
            currentInput: { ...record.input, id: `input_${Date.now()}` },
            currentResult: record.result,
            currentValidation: record.validation,
            selectedHistoryId: id,
          });
        }
      },

      clearCurrent: () => {
        set({
          currentInput: { ...DEFAULT_INPUT, id: `input_${Date.now()}` },
          currentResult: null,
          currentValidation: null,
          selectedHistoryId: null,
        });
      },

      setFtp: (ftp) => {
        set({ ftp });
        const { currentInput, currentValidation } = get();
        if (currentValidation?.isValid) {
          const result = calculatePower(currentInput, undefined, ftp);
          set({ currentResult: result });
        }
      },

      autoFixIssue: (field, value) => {
        get().setInput({ [field]: value } as Partial<RideInput>);
      },
    }),
    {
      name: 'ride-power-storage',
      partialize: (state) => ({
        history: state.history,
        ftp: state.ftp,
      }),
    }
  )
);
