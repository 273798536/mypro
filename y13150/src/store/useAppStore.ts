import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, AppActions, MaintenanceNote, CalculationResult, AbnormalRecord } from '../types';
import { mockObjects, mockNotes, mockParameterSets, mockResults, mockAbnormalRecords } from '../data/mockData';
import { detectUnit, normalizeToSI } from '../utils/unitConverter';
import { detectExtremeValue } from '../utils/extremeValueDetector';
import { calculateReverbTime } from '../utils/reverbCalculator';

const initialState: AppState = {
  objects: [],
  notes: [],
  results: [],
  abnormalRecords: [],
  parameterSets: [],
  selectedObjectId: null,
  selectedNoteId: null,
  hoveredObjectId: null,
  currentTime: Date.now(),
  timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() },
  compareMode: false,
  selectedParamSetIds: [null, null],
  summary: {
    totalNotes: 0,
    pendingConfirmations: 0,
    lastCalculationTime: '',
    activeObjectId: null,
    selectedTimeRange: { start: 0, end: 0 },
    quickActions: ['loadExample', 'calculateAll', 'toggleCompare']
  }
};

const generateId = () => Math.random().toString(36).substring(2, 11);

const updateSummary = (state: AppState): AppState['summary'] => {
  const pendingConfirmations = state.abnormalRecords.filter(r => !r.confirmed).length;
  const lastResult = state.results[state.results.length - 1];
  
  return {
    totalNotes: state.notes.length,
    pendingConfirmations,
    lastCalculationTime: lastResult?.timestamp || '',
    activeObjectId: state.selectedObjectId,
    selectedTimeRange: state.timeRange,
    quickActions: ['loadExample', 'calculateAll', 'toggleCompare']
  };
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      selectObject: (id: string | null) => {
        set(state => ({
          selectedObjectId: id,
          selectedNoteId: null,
          summary: updateSummary({ ...state, selectedObjectId: id, selectedNoteId: null })
        }));
      },

      selectNote: (id: string | null) => {
        set(state => {
          const note = id ? state.notes.find(n => n.id === id) : null;
          return {
            selectedNoteId: id,
            selectedObjectId: note ? note.objectId : state.selectedObjectId,
            summary: updateSummary({ ...state, selectedNoteId: id, selectedObjectId: note ? note.objectId : state.selectedObjectId })
          };
        });
      },

      hoverObject: (id: string | null) => {
        set({ hoveredObjectId: id });
      },

      setCurrentTime: (time: number) => {
        set(state => ({
          currentTime: time,
          summary: updateSummary(state)
        }));
      },

      setTimeRange: (range: { start: number; end: number }) => {
        set(state => ({
          timeRange: range,
          summary: updateSummary({ ...state, timeRange: range })
        }));
      },

      addNote: (noteData: Omit<MaintenanceNote, 'id' | 'timestamp' | 'version'>) => {
        const state = get();
        const existingNotes = state.notes.filter(n => n.objectId === noteData.objectId);
        const latestVersion = existingNotes.length > 0 
          ? Math.max(...existingNotes.map(n => n.version)) 
          : 0;

        const detected = detectUnit(noteData.rawValue);
        const normalized = normalizeToSI(detected.value, detected.unit);

        const newNote: MaintenanceNote = {
          ...noteData,
          id: `note-${generateId()}`,
          unit: normalized.unit || detected.unit,
          convertedValue: normalized.value,
          timestamp: new Date().toISOString(),
          version: latestVersion + 1
        };

        const object = state.objects.find(o => o.id === newNote.objectId);
        const detection = detectExtremeValue(newNote, [...state.notes, newNote], object);

        let newAbnormalRecord: AbnormalRecord | null = null;
        if (detection.isAbnormal && detection.record) {
          newAbnormalRecord = {
            id: `abn-${generateId()}`,
            noteId: newNote.id,
            type: detection.record.type,
            reason: detection.record.reason,
            impactScope: detection.record.impactScope,
            confirmed: false
          };
        }

        set(state => {
          const newState = {
            notes: [...state.notes, newNote],
            abnormalRecords: newAbnormalRecord 
              ? [...state.abnormalRecords, newAbnormalRecord]
              : state.abnormalRecords
          };
          return {
            ...newState,
            summary: updateSummary({ ...state, ...newState })
          };
        });

        return newNote;
      },

      calculateReverb: (noteId: string, paramSetId: string) => {
        const state = get();
        const note = state.notes.find(n => n.id === noteId);
        const paramSet = state.parameterSets.find(p => p.id === paramSetId);

        if (!note || !paramSet) {
          throw new Error('备注或参数组不存在');
        }

        const abnormalRecord = state.abnormalRecords.find(
          r => r.noteId === noteId && !r.confirmed
        );

        if (abnormalRecord) {
          return abnormalRecord;
        }

        const result = calculateReverbTime(note, paramSet);
        
        const newResult: CalculationResult = {
          id: `result-${generateId()}`,
          noteId,
          paramSetId,
          ...result,
          timestamp: new Date().toISOString(),
          status: 'completed'
        };

        set(state => {
          const newState = {
            results: [...state.results, newResult]
          };
          return {
            ...newState,
            summary: updateSummary({ ...state, ...newState })
          };
        });

        return newResult;
      },

      confirmAbnormal: (recordId: string, confirmer: string) => {
        set(state => {
          const newState = {
            abnormalRecords: state.abnormalRecords.map(r =>
              r.id === recordId
                ? { ...r, confirmed: true, confirmer, confirmedAt: new Date().toISOString() }
                : r
            )
          };
          return {
            ...newState,
            summary: updateSummary({ ...state, ...newState })
          };
        });
      },

      toggleCompareMode: () => {
        set(state => ({
          compareMode: !state.compareMode,
          selectedParamSetIds: !state.compareMode ? [null, null] : state.selectedParamSetIds
        }));
      },

      setSelectedParamSet: (index: 0 | 1, id: string | null) => {
        set(state => {
          const newIds = [...state.selectedParamSetIds] as [string | null, string | null];
          newIds[index] = id;
          return { selectedParamSetIds: newIds };
        });
      },

      loadExampleData: () => {
        set({
          objects: mockObjects,
          notes: mockNotes,
          parameterSets: mockParameterSets,
          results: mockResults,
          abnormalRecords: mockAbnormalRecords,
          selectedObjectId: 'obj-003',
          summary: {
            totalNotes: mockNotes.length,
            pendingConfirmations: mockAbnormalRecords.filter(r => !r.confirmed).length,
            lastCalculationTime: '',
            activeObjectId: 'obj-003',
            selectedTimeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() },
            quickActions: ['loadExample', 'calculateAll', 'toggleCompare']
          }
        });
      },

      recalculateAll: () => {
        const state = get();
        const paramSetId = state.selectedParamSetIds[0] || state.parameterSets[0]?.id;
        
        if (!paramSetId) return;

        const newResults: CalculationResult[] = [];

        state.notes.forEach(note => {
          const hasAbnormal = state.abnormalRecords.some(
            r => r.noteId === note.id && !r.confirmed
          );
          if (hasAbnormal) return;

          const existingResult = state.results.find(
            r => r.noteId === note.id && r.paramSetId === paramSetId
          );
          if (existingResult) {
            newResults.push(existingResult);
            return;
          }

          const paramSet = state.parameterSets.find(p => p.id === paramSetId);
          if (!paramSet) return;

          const result = calculateReverbTime(note, paramSet);
          newResults.push({
            id: `result-${generateId()}`,
            noteId: note.id,
            paramSetId,
            ...result,
            timestamp: new Date().toISOString(),
            status: 'completed'
          });
        });

        set(state => {
          const newState = {
            results: newResults
          };
          return {
            ...newState,
            summary: updateSummary({ ...state, ...newState })
          };
        });
      }
    }),
    {
      name: 'acoustic-reverb-store',
      partialize: (state) => ({
        objects: state.objects,
        notes: state.notes,
        results: state.results,
        abnormalRecords: state.abnormalRecords,
        parameterSets: state.parameterSets
      })
    }
  )
);
