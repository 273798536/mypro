import { create } from 'zustand';
import { 
  RangingRecord, 
  CalibrationConfig, 
  Phase, 
  FilterState,
  ExportFormat
} from '../types';
import { DEFAULT_CALIBRATION_CONFIG } from '../constants/config';
import { performFullCalibration } from '../utils/calibration';
import { exportResults } from '../utils/export';
import { parseDistanceUnit, parseTemperatureUnit } from '../utils/unitConversion';
import Papa from 'papaparse';

interface CalibrationState {
  records: RangingRecord[];
  config: CalibrationConfig;
  phase: Phase;
  isCalibrating: boolean;
  selectedRecordId: string | null;
  filters: FilterState;
  importErrors: string[];
  importWarnings: string[];
  
  importPhase1Data: (data: string | File) => Promise<void>;
  importPhase2Data: (data: string | File) => Promise<void>;
  calibrate: () => void;
  updateConfig: (config: Partial<CalibrationConfig>) => void;
  selectRecord: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  exportData: (format: ExportFormat) => void;
  resolveAnomaly: (recordId: string, anomalyId: string) => void;
  reset: () => void;
  loadSampleData: () => void;
  loadBoundaryTestData: () => void;
}

export const useCalibrationStore = create<CalibrationState>((set, get) => ({
  records: [],
  config: DEFAULT_CALIBRATION_CONFIG,
  phase: 'phase1',
  isCalibrating: false,
  selectedRecordId: null,
  filters: {
    status: 'all',
    anomalyType: 'all',
    searchText: '',
    affectedByMaterial: 'all',
  },
  importErrors: [],
  importWarnings: [],

  importPhase1Data: async (data: string | File) => {
    try {
      let csvText: string;
      
      if (typeof data === 'string') {
        csvText = data;
      } else {
        csvText = await new Promise((resolve, reject) => {
          Papa.parse(data, {
            complete: (results) => {
              const rows = results.data as string[][];
              const csv = rows.map(row => row.join(',')).join('\n');
              resolve(csv);
            },
            error: reject,
          });
        });
      }
      
      const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const records: RangingRecord[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      results.data.forEach((row: any, index: number) => {
        try {
          const requiredFields = ['rawDistance', 'temperature', 'frequency'];
          const missingFields = requiredFields.filter(f => !row[f]);
          
          if (missingFields.length > 0) {
            errors.push(`行 ${index + 1}: 缺少必填字段: ${missingFields.join(', ')}`);
            return;
          }
          
          const record: RangingRecord = {
            id: row.id || `rec-${Date.now()}-${index}`,
            rawDistance: parseFloat(row.rawDistance),
            rawDistanceUnit: parseDistanceUnit(row.rawDistanceUnit || 'm'),
            temperature: parseFloat(row.temperature),
            temperatureUnit: parseTemperatureUnit(row.temperatureUnit || 'C'),
            frequency: parseFloat(row.frequency),
            reflectiveMaterial: row.reflectiveMaterial || undefined,
            timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
            status: 'pending',
            source: 'phase1',
            calibrationSteps: [],
            anomalies: [],
          };
          
          if (isNaN(record.rawDistance)) {
            errors.push(`行 ${index + 1}: 无效的测距值`);
            return;
          }
          if (isNaN(record.temperature)) {
            errors.push(`行 ${index + 1}: 无效的温度值`);
            return;
          }
          
          records.push(record);
        } catch (e) {
          errors.push(`行 ${index + 1}: 解析错误`);
        }
      });
      
      set({ 
        records, 
        importErrors: errors, 
        importWarnings: warnings,
        phase: 'phase1',
      });
    } catch (error) {
      set({ importErrors: [`导入失败: ${(error as Error).message}`] });
    }
  },

  importPhase2Data: async (data: string | File) => {
    try {
      let csvText: string;
      
      if (typeof data === 'string') {
        csvText = data;
      } else {
        csvText = await new Promise((resolve, reject) => {
          Papa.parse(data, {
            complete: (results) => {
              const rows = results.data as string[][];
              const csv = rows.map(row => row.join(',')).join('\n');
              resolve(csv);
            },
            error: reject,
          });
        });
      }
      
      const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const materialMap: Record<string, string> = {};
      
      results.data.forEach((row: any) => {
        if (row.id && row.reflectiveMaterial) {
          materialMap[row.id] = row.reflectiveMaterial;
        }
      });
      
      const { records } = get();
      
      const updatedRecords = records.map(record => {
        const material = materialMap[record.id];
        if (material) {
          return {
            ...record,
            reflectiveMaterial: material,
            source: 'phase2' as const,
          };
        }
        return record;
      });
      
      set({ 
        records: updatedRecords, 
        phase: 'phase2',
      });
      
      get().calibrate();
    } catch (error) {
      set({ importErrors: [`材质数据导入失败: ${(error as Error).message}`] });
    }
  },

  calibrate: () => {
    set({ isCalibrating: true });
    
    setTimeout(() => {
      const { records, config, phase } = get();
      const calibratedRecords = performFullCalibration(records, config, phase);
      set({ records: calibratedRecords, isCalibrating: false });
    }, 500);
  },

  updateConfig: (newConfig: Partial<CalibrationConfig>) => {
    set(state => ({
      config: { ...state.config, ...newConfig },
    }));
    
    const { records } = get();
    if (records.length > 0 && records.some(r => r.status !== 'pending')) {
      get().calibrate();
    }
  },

  selectRecord: (id: string | null) => {
    set({ selectedRecordId: id });
  },

  setFilters: (filters: Partial<FilterState>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  exportData: (format: ExportFormat) => {
    const { records, phase } = get();
    exportResults(records, format, phase);
  },

  resolveAnomaly: (recordId: string, anomalyId: string) => {
    set(state => ({
      records: state.records.map(record => {
        if (record.id === recordId) {
          return {
            ...record,
            anomalies: record.anomalies.map(a => 
              a.id === anomalyId ? { ...a, isResolved: true } : a
            ),
          };
        }
        return record;
      }),
    }));
  },

  reset: () => {
    set({
      records: [],
      phase: 'phase1',
      selectedRecordId: null,
      importErrors: [],
      importWarnings: [],
      filters: {
        status: 'all',
        anomalyType: 'all',
        searchText: '',
        affectedByMaterial: 'all',
      },
    });
  },

  loadSampleData: () => {
    import('../utils/sampleData').then(({ generateSampleRecords }) => {
      const records = generateSampleRecords(15);
      set({ 
        records, 
        phase: 'phase1',
        importErrors: [],
        importWarnings: [],
      });
    });
  },

  loadBoundaryTestData: () => {
    import('../utils/sampleData').then(({ generateBoundaryTestData }) => {
      const records = generateBoundaryTestData();
      set({ 
        records, 
        phase: 'phase1',
        importErrors: [],
        importWarnings: [],
      });
    });
  },
}));
