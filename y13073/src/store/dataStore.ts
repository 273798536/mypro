import { create } from 'zustand';
import { CadRecord, AnomalyPoint, TimelineGap, FieldMapping } from '../types';
import { demoCadRecords, demoCsvContent } from '../data/demoData';
import { defaultFieldMappings } from '../data/fieldMappings';
import { detectAllAnomalies } from '../utils/dataProcessor';
import { parseCsvToRecords } from '../utils/csvParser';
import { STORAGE_KEYS } from '../utils/constants';

interface DataState {
  records: CadRecord[];
  anomalies: AnomalyPoint[];
  timelineGaps: TimelineGap[];
  fieldMappings: FieldMapping[];
  detectedCadFields: string[];
  selectedRecordId: string | null;
  selectedAnomalyId: string | null;
  csvContent: string;
  isLoading: boolean;
  warnings: string[];
  
  loadDemoData: () => void;
  loadCsvData: (csvContent: string) => void;
  setSelectedRecord: (id: string | null) => void;
  setSelectedAnomaly: (id: string | null) => void;
  updateFieldMapping: (cadField: string, standardField: string) => void;
  reprocessData: () => void;
  clearData: () => void;
}

const loadFieldMappingsFromStorage = (): FieldMapping[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.fieldMappings);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load field mappings:', e);
  }
  return defaultFieldMappings;
};

const saveFieldMappingsToStorage = (mappings: FieldMapping[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.fieldMappings, JSON.stringify(mappings));
  } catch (e) {
    console.error('Failed to save field mappings:', e);
  }
};

export const useDataStore = create<DataState>((set, get) => ({
  records: [],
  anomalies: [],
  timelineGaps: [],
  fieldMappings: loadFieldMappingsFromStorage(),
  detectedCadFields: [],
  selectedRecordId: null,
  selectedAnomalyId: null,
  csvContent: '',
  isLoading: false,
  warnings: [],

  loadDemoData: () => {
    set({ isLoading: true });
    const { anomalies, gaps } = detectAllAnomalies(demoCadRecords);
    set({
      records: demoCadRecords,
      anomalies,
      timelineGaps: gaps,
      csvContent: demoCsvContent,
      detectedCadFields: demoCadRecords.length > 0
        ? Object.keys(demoCadRecords[0].originalFields)
        : [],
      isLoading: false,
      warnings: [],
    });
  },

  loadCsvData: (csvContent: string) => {
    set({ isLoading: true, warnings: [] });
    const { fieldMappings } = get();
    const { records, warnings, detectedHeaders } = parseCsvToRecords(csvContent, fieldMappings);
    const { anomalies, gaps } = detectAllAnomalies(records);
    
    set({
      records,
      anomalies,
      timelineGaps: gaps,
      csvContent,
      detectedCadFields: detectedHeaders,
      isLoading: false,
      warnings,
    });
  },

  setSelectedRecord: (id: string | null) => {
    set({ selectedRecordId: id });
  },

  setSelectedAnomaly: (id: string | null) => {
    set({ selectedAnomalyId: id });
    if (id) {
      const anomaly = get().anomalies.find(a => a.id === id);
      if (anomaly) {
        set({ selectedRecordId: anomaly.recordId });
      }
    }
  },

  updateFieldMapping: (cadField: string, standardField: string) => {
    const { fieldMappings, csvContent } = get();
    
    const existingIndex = fieldMappings.findIndex(m => m.cadField === cadField);
    let newMappings: FieldMapping[];
    
    if (existingIndex >= 0) {
      newMappings = [...fieldMappings];
      if (!newMappings[existingIndex].locked) {
        newMappings[existingIndex] = {
          ...newMappings[existingIndex],
          standardField,
        };
      }
    } else {
      newMappings = [
        ...fieldMappings,
        { cadField, standardField, locked: false },
      ];
    }
    
    saveFieldMappingsToStorage(newMappings);
    set({ fieldMappings: newMappings });
    
    if (csvContent) {
      get().loadCsvData(csvContent);
    }
  },

  reprocessData: () => {
    const { records } = get();
    if (records.length > 0) {
      set({ isLoading: true });
      const { anomalies, gaps } = detectAllAnomalies(records);
      set({
        anomalies,
        timelineGaps: gaps,
        isLoading: false,
      });
    }
  },

  clearData: () => {
    set({
      records: [],
      anomalies: [],
      timelineGaps: [],
      detectedCadFields: [],
      selectedRecordId: null,
      selectedAnomalyId: null,
      csvContent: '',
      warnings: [],
    });
  },
}));
