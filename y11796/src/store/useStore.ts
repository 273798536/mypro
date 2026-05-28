import { create } from 'zustand';
import {
  CircuitParams,
  CalculationResult,
  StudentData,
  CorrectionRecord,
  PresetParams,
  ReportData,
  UnitHistory,
  Warning,
} from '@/types';
import { calculateRCResult } from '@/utils/calculator';
import { calculateErrorStats, detectStudentDataAnomalies, classifyStudentData, generateErrorDistribution, countWarningsByType } from '@/utils/errorAnalysis';
import {
  saveCurrentParams,
  loadCurrentParams,
  savePresets,
  loadPresets,
  getDefaultParams,
  getDefaultPresets,
  saveStudentData,
  saveStudentDataBatch,
  loadAllStudentData,
  saveCorrection,
  saveReport,
  loadAllReports,
  initDB,
} from '@/utils/storage';
import { detectUnitMismatch } from '@/utils/units';
import { generateId } from '@/utils/helpers';

interface AppState {
  params: CircuitParams;
  result: CalculationResult | null;
  studentData: StudentData[];
  selectedStudentId: string | null;
  presets: PresetParams[];
  reports: ReportData[];
  correctionHistory: CorrectionRecord[];
  unitHistory: UnitHistory[];
  showReportModal: boolean;
  isLoading: boolean;
  simulationTime: number;
  isSimulating: boolean;

  setParams: (params: Partial<CircuitParams>, trackUnit?: boolean) => void;
  loadPreset: (preset: PresetParams) => void;
  saveCurrentAsPreset: (name: string, description: string) => void;
  deletePreset: (id: string) => void;
  recalculate: () => void;

  addStudentData: (data: Omit<StudentData, 'id' | 'importedAt' | 'corrections' | 'status' | 'warnings' | 'errorAnalysis'>) => void;
  addStudentDataBatch: (data: Array<Omit<StudentData, 'id' | 'importedAt' | 'corrections' | 'status' | 'warnings' | 'errorAnalysis'>>) => void;
  selectStudent: (id: string | null) => void;
  updateStudentData: (id: string, updates: Partial<StudentData>) => void;
  correctStudentData: (studentId: string, field: string, oldValue: any, newValue: any, reason: string, operator: string) => void;
  processAllStudentData: () => void;

  generateReport: (experimentName: string) => ReportData;
  setShowReportModal: (show: boolean) => void;
  loadReports: () => Promise<void>;

  setSimulationTime: (time: number) => void;
  setIsSimulating: (simulating: boolean) => void;
  toggleSimulation: () => void;
  resetSimulation: () => void;

  init: () => Promise<void>;
  initFromStorage: () => Promise<void>;

  addReport: (report: ReportData) => void;
  deleteStudentData: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  params: getDefaultParams(),
  result: null,
  studentData: [],
  selectedStudentId: null,
  presets: [],
  reports: [],
  correctionHistory: [],
  unitHistory: [],
  showReportModal: false,
  isLoading: false,
  simulationTime: 0,
  isSimulating: false,

  setParams: (updates, trackUnit = true) => {
    set((state) => {
      const newParams = {
        ...state.params,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const newUnitHistory = [...state.unitHistory];
      if (trackUnit) {
        if (updates.resistanceUnit && updates.resistanceUnit !== state.params.resistanceUnit) {
          newUnitHistory.push({
            field: 'resistance',
            oldUnit: state.params.resistanceUnit,
            newUnit: updates.resistanceUnit,
            timestamp: new Date().toISOString(),
          });
        }
        if (updates.capacitanceUnit && updates.capacitanceUnit !== state.params.capacitanceUnit) {
          newUnitHistory.push({
            field: 'capacitance',
            oldUnit: state.params.capacitanceUnit,
            newUnit: updates.capacitanceUnit,
            timestamp: new Date().toISOString(),
          });
        }
        if (updates.voltageUnit && updates.voltageUnit !== state.params.voltageUnit) {
          newUnitHistory.push({
            field: 'voltage',
            oldUnit: state.params.voltageUnit,
            newUnit: updates.voltageUnit,
            timestamp: new Date().toISOString(),
          });
        }
        if (updates.timeUnit && updates.timeUnit !== state.params.timeUnit) {
          newUnitHistory.push({
            field: 'time',
            oldUnit: state.params.timeUnit,
            newUnit: updates.timeUnit,
            timestamp: new Date().toISOString(),
          });
        }
      }

      saveCurrentParams(newParams);
      const newResult = calculateRCResult(newParams);

      const warnings = [...newResult.warnings];
      if (detectUnitMismatch(newUnitHistory.map(h => ({ field: h.field, unit: h.newUnit })))) {
        warnings.push({
          id: generateId(),
          type: 'unit_mismatch',
          severity: 'warning',
          message: '检测到单位混用，请确认所有参数单位是否一致',
          suggestion: '建议统一使用国际单位制（V, Ω, F, s）以避免计算错误。',
        });
      }

      return {
        params: newParams,
        result: { ...newResult, warnings },
        unitHistory: newUnitHistory,
        simulationTime: 0,
      };
    });
  },

  loadPreset: (preset) => {
    set((state) => {
      const newParams: CircuitParams = {
        ...state.params,
        ...preset.params,
        id: state.params.id,
        createdAt: state.params.createdAt,
        updatedAt: new Date().toISOString(),
        source: 'preset',
      };
      saveCurrentParams(newParams);
      const newResult = calculateRCResult(newParams);
      return {
        params: newParams,
        result: newResult,
        simulationTime: 0,
      };
    });
  },

  saveCurrentAsPreset: (name, description) => {
    set((state) => {
      const newPreset: PresetParams = {
        id: generateId(),
        name,
        description,
        params: {
          name: state.params.name,
          resistance: state.params.resistance,
          resistanceUnit: state.params.resistanceUnit,
          capacitance: state.params.capacitance,
          capacitanceUnit: state.params.capacitanceUnit,
          sourceVoltage: state.params.sourceVoltage,
          voltageUnit: state.params.voltageUnit,
          initialVoltage: state.params.initialVoltage,
          samplePoints: state.params.samplePoints,
          timeRange: state.params.timeRange,
          timeUnit: state.params.timeUnit,
          mode: state.params.mode,
        },
        createdAt: new Date().toISOString(),
      };
      const newPresets = [...state.presets, newPreset];
      savePresets(newPresets);
      return { presets: newPresets };
    });
  },

  deletePreset: (id) => {
    set((state) => {
      const newPresets = state.presets.filter(p => p.id !== id);
      savePresets(newPresets);
      return { presets: newPresets };
    });
  },

  recalculate: () => {
    set((state) => {
      const newResult = calculateRCResult(state.params);
      return { result: newResult, simulationTime: 0 };
    });
  },

  addStudentData: (data) => {
    set((state) => {
      const result = state.result;
      const warnings: Warning[] = [];
      let errorAnalysis;

      if (result) {
        const theoreticalCurve = state.params.mode === 'charge' 
          ? result.chargeCurve 
          : result.dischargeCurve;
        
        errorAnalysis = calculateErrorStats(data.dataPoints, theoreticalCurve);
        const anomalies = detectStudentDataAnomalies(
          data.dataPoints,
          theoreticalCurve,
          state.params.voltageUnit
        );
        warnings.push(...anomalies);
      }

      const newStudent: StudentData = {
        ...data,
        id: generateId(),
        importedAt: new Date().toISOString(),
        corrections: [],
        status: warnings.some(w => w.severity === 'error') ? 'needs_review' : 'raw',
        warnings,
        errorAnalysis,
      };

      saveStudentData(newStudent);
      return { studentData: [...state.studentData, newStudent] };
    });
  },

  addStudentDataBatch: (dataList) => {
    set((state) => {
      const result = state.result;
      const newStudents: StudentData[] = dataList.map(data => {
        const warnings: Warning[] = [];
        let errorAnalysis;

        if (result) {
          const theoreticalCurve = state.params.mode === 'charge'
            ? result.chargeCurve
            : result.dischargeCurve;
          
          errorAnalysis = calculateErrorStats(data.dataPoints, theoreticalCurve);
          const anomalies = detectStudentDataAnomalies(
            data.dataPoints,
            theoreticalCurve,
            state.params.voltageUnit
          );
          warnings.push(...anomalies);
        }

        return {
          ...data,
          id: generateId(),
          importedAt: new Date().toISOString(),
          corrections: [],
          status: warnings.some(w => w.severity === 'error') ? 'needs_review' : 'raw',
          warnings,
          errorAnalysis,
        };
      });

      saveStudentDataBatch(newStudents);
      return { studentData: [...state.studentData, ...newStudents] };
    });
  },

  selectStudent: (id) => {
    set({ selectedStudentId: id });
  },

  updateStudentData: (id, updates) => {
    set((state) => {
      const newStudentData = state.studentData.map(s =>
        s.id === id ? { ...s, ...updates } : s
      );
      const updated = newStudentData.find(s => s.id === id);
      if (updated) saveStudentData(updated);
      return { studentData: newStudentData };
    });
  },

  correctStudentData: (studentId, field, oldValue, newValue, reason, operator) => {
    set((state) => {
      const student = state.studentData.find(s => s.id === studentId);
      if (!student) return state;

      const record: CorrectionRecord = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        field,
        oldValue,
        newValue,
        reason,
        operator,
        dataSource: student.source,
        version: student.corrections.length + 1,
      };

      saveCorrection(record, studentId);

      let newDataPoints = student.dataPoints;
      if (field === 'dataPoints' && Array.isArray(newValue)) {
        newDataPoints = newValue;
      }

      const result = state.result;
      let errorAnalysis = student.errorAnalysis;
      if (result) {
        const theoreticalCurve = state.params.mode === 'charge'
          ? result.chargeCurve
          : result.dischargeCurve;
        errorAnalysis = calculateErrorStats(newDataPoints, theoreticalCurve);
      }

      const newStudent: StudentData = {
        ...student,
        dataPoints: newDataPoints,
        corrections: [...student.corrections, record],
        status: 'corrected',
        errorAnalysis,
      };

      saveStudentData(newStudent);

      return {
        studentData: state.studentData.map(s =>
          s.id === studentId ? newStudent : s
        ),
        correctionHistory: [...state.correctionHistory, record],
      };
    });
  },

  processAllStudentData: () => {
    set((state) => {
      const result = state.result;
      if (!result) return state;

      const theoreticalCurve = state.params.mode === 'charge'
        ? result.chargeCurve
        : result.dischargeCurve;

      const newStudentData = state.studentData.map(student => {
        if (student.status !== 'raw') return student;
        
        const errorAnalysis = calculateErrorStats(student.dataPoints, theoreticalCurve);
        const anomalies = detectStudentDataAnomalies(
          student.dataPoints,
          theoreticalCurve,
          state.params.voltageUnit
        );

        const newStudent: StudentData = {
          ...student,
          status: anomalies.length > 0 ? 'needs_review' : 'processed',
          warnings: [...student.warnings, ...anomalies],
          errorAnalysis,
        };
        saveStudentData(newStudent);
        return newStudent;
      });

      return { studentData: newStudentData };
    });
  },

  generateReport: (experimentName) => {
    const state = get();
    const classified = classifyStudentData(state.studentData);
    
    const allProcessed = state.studentData.filter(s => s.errorAnalysis);
    const averageMSE = allProcessed.length > 0
      ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.mse || 0), 0) / allProcessed.length
      : 0;
    const averageRMSE = allProcessed.length > 0
      ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.rmse || 0), 0) / allProcessed.length
      : 0;

    const report: ReportData = {
      id: generateId(),
      generatedAt: new Date().toISOString(),
      experimentName,
      totalStudents: state.studentData.length,
      rawData: classified.rawData,
      correctedData: classified.correctedData,
      needsReview: classified.needsReview,
      errorSummary: {
        averageMSE,
        averageRMSE,
        errorDistribution: generateErrorDistribution(state.studentData),
        warningCounts: countWarningsByType(state.studentData),
      },
    };

    saveReport(report);
    return report;
  },

  setShowReportModal: (show) => {
    set({ showReportModal: show });
  },

  loadReports: async () => {
    const reports = await loadAllReports();
    set({ reports });
  },

  setSimulationTime: (time) => {
    set({ simulationTime: time });
  },

  setIsSimulating: (simulating) => {
    set({ isSimulating: simulating });
  },

  toggleSimulation: () => {
    set((state) => ({ isSimulating: !state.isSimulating }));
  },

  init: async () => {
    set({ isLoading: true });
    try {
      await initDB();
      
      const savedParams = loadCurrentParams();
      const params = savedParams || getDefaultParams();
      const result = calculateRCResult(params);

      let presets = loadPresets();
      if (presets.length === 0) {
        presets = getDefaultPresets();
        savePresets(presets);
      }

      const studentData = await loadAllStudentData();
      const reports = await loadAllReports();

      set({
        params,
        result,
        presets,
        studentData,
        reports,
        isLoading: false,
      });
    } catch (error) {
      console.error('Init failed:', error);
      const params = getDefaultParams();
      const result = calculateRCResult(params);
      const presets = getDefaultPresets();
      savePresets(presets);
      set({
        params,
        result,
        presets,
        isLoading: false,
      });
    }
  },

  initFromStorage: async () => {
    await get().init();
  },

  resetSimulation: () => {
    set({ simulationTime: 0, isSimulating: false });
  },

  addReport: (report) => {
    set((state) => ({ reports: [...state.reports, report] }));
  },

  deleteStudentData: (id) => {
    set((state) => {
      const newStudentData = state.studentData.filter(s => s.id !== id);
      const newSelectedId = state.selectedStudentId === id ? null : state.selectedStudentId;
      return { studentData: newStudentData, selectedStudentId: newSelectedId };
    });
  },
}));
