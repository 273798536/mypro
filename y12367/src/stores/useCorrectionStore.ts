import { create } from 'zustand';
import type {
  EfficiencyReport,
  CorrectionLog,
  ComparisonData,
  AnomalyRecord,
  FilterCriteria,
} from '@/types';
import { dataService } from '@/services/dataService';
import { efficiencyEngine } from '@/engines/EfficiencyCalculationEngine';
import { generateId } from '@/utils/helpers';

interface CorrectionState {
  initialized: boolean;
  
  filters: {
    testBenchIds: string[];
    materialIds: string[];
    timeRange: [Date, Date] | null;
  };
  
  pendingCorrections: EfficiencyReport[];
  filteredCorrections: EfficiencyReport[];
  selectedReport: EfficiencyReport | null;
  
  draftSpeed: number | null;
  draftTorque: number | null;
  draftReason: string;
  
  previewResult: {
    newEfficiency: number;
    newOutputPower: number;
    anomalyChanges: AnomalyRecord[];
    validation: {
      valid: boolean;
      warnings: string[];
      errors: string[];
    };
  } | null;
  
  comparisonData: ComparisonData | null;
  
  correctionLogs: CorrectionLog[];
  
  isLoading: boolean;
  error: string | null;
  
  setFilters: (filters: Partial<CorrectionState['filters']>) => void;
  selectReport: (report: EfficiencyReport | null) => void;
  setDraftValues: (speed?: number, torque?: number, reason?: string) => void;
  calculatePreview: () => void;
  submitCorrection: () => Promise<boolean>;
  loadLogs: () => Promise<void>;
  initialize: () => Promise<void>;
  clearDraft: () => void;
}

const initialFilters: CorrectionState['filters'] = {
  testBenchIds: [],
  materialIds: [],
  timeRange: null,
};

export const useCorrectionStore = create<CorrectionState>((set, get) => ({
  initialized: false,
  
  filters: initialFilters,
  
  pendingCorrections: [],
  filteredCorrections: [],
  selectedReport: null,
  
  draftSpeed: null,
  draftTorque: null,
  draftReason: '',
  
  previewResult: null,
  comparisonData: null,
  
  correctionLogs: [],
  
  isLoading: false,
  error: null,
  
  initialize: async () => {
    const state = get();
    if (state.initialized) return;
    
    set({ isLoading: true, error: null });
    
    try {
      await dataService.initialize();
      
      const allReports = dataService.getEfficiencyReports();
      const pendingCorrections = allReports.filter(r => !r.isCorrected);
      const correctionLogs = dataService.getCorrectionLogs();
      
      set({
        initialized: true,
        pendingCorrections,
        filteredCorrections: pendingCorrections,
        correctionLogs,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '初始化失败',
      });
    }
  },
  
  setFilters: (partialFilters) => {
    const state = get();
    const newFilters = { ...state.filters, ...partialFilters };
    
    let filtered = [...state.pendingCorrections];
    
    if (newFilters.testBenchIds.length > 0) {
      filtered = filtered.filter(r => newFilters.testBenchIds.includes(r.testBenchId));
    }
    if (newFilters.materialIds.length > 0) {
      filtered = filtered.filter(r => newFilters.materialIds.includes(r.materialId));
    }
    if (newFilters.timeRange) {
      const [start, end] = newFilters.timeRange;
      filtered = filtered.filter(r => 
        r.startTime >= start && r.endTime <= end
      );
    }
    
    set({
      filters: newFilters,
      filteredCorrections: filtered,
    });
  },
  
  selectReport: (report) => {
    if (!report) {
      set({
        selectedReport: null,
        draftSpeed: null,
        draftTorque: null,
        draftReason: '',
        previewResult: null,
        comparisonData: null,
      });
      return;
    }
    
    const originalSpeed = report.correctedData?.speed ?? report.originalData?.speed ?? 0;
    const originalTorque = report.correctedData?.torque ?? report.originalData?.torque ?? 0;
    
    set({
      selectedReport: report,
      draftSpeed: originalSpeed,
      draftTorque: originalTorque,
      draftReason: '',
      previewResult: null,
      comparisonData: null,
    });
  },
  
  setDraftValues: (speed, torque, reason) => {
    const state = get();
    const updates: Partial<CorrectionState> = {};
    
    if (speed !== undefined) updates.draftSpeed = speed;
    if (torque !== undefined) updates.draftTorque = torque;
    if (reason !== undefined) updates.draftReason = reason;
    
    set(updates);
    
    if (state.selectedReport && 
        updates.draftSpeed !== undefined && 
        updates.draftTorque !== undefined) {
      get().calculatePreview();
    }
  },
  
  calculatePreview: () => {
    const state = get();
    const { selectedReport, draftSpeed, draftTorque } = state;
    
    if (!selectedReport || draftSpeed === null || draftTorque === null) {
      set({ previewResult: null, comparisonData: null });
      return;
    }
    
    const validation = efficiencyEngine.validateCorrection(
      selectedReport,
      draftSpeed,
      draftTorque
    );
    
    const result = efficiencyEngine.recalculateAfterCorrection(
      selectedReport,
      draftSpeed,
      draftTorque
    );
    
    const tempCorrected = {
      ...selectedReport,
      correctedData: {
        speed: draftSpeed,
        torque: draftTorque,
        efficiency: result.newEfficiency,
        operator: '当前用户',
        reason: state.draftReason,
        correctedAt: new Date(),
      },
      outputPower: result.newOutputPower,
      efficiency: result.newEfficiency,
      isCorrected: true,
    };
    
    const comparisonData = efficiencyEngine.generateComparisonData(
      selectedReport,
      tempCorrected
    );
    
    set({
      previewResult: {
        ...result,
        validation,
      },
      comparisonData,
    });
  },
  
  submitCorrection: async () => {
    const state = get();
    const { selectedReport, draftSpeed, draftTorque, draftReason, previewResult } = state;
    
    if (!selectedReport || draftSpeed === null || draftTorque === null) {
      return false;
    }
    
    if (previewResult?.validation.valid === false) {
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const updatedReport = efficiencyEngine.applyCorrection(
        { ...selectedReport },
        draftSpeed,
        draftTorque,
        '当前用户',
        draftReason
      );
      
      dataService.updateEfficiencyReport(updatedReport);
      
      const log: CorrectionLog = {
        id: generateId(),
        reportId: updatedReport.id,
        operatorId: 'current-user',
        operatorName: '当前用户',
        originalSpeed: selectedReport.originalData?.speed ?? selectedReport.efficiency,
        originalTorque: selectedReport.originalData?.torque ?? 0,
        originalEfficiency: selectedReport.originalData?.efficiency ?? selectedReport.efficiency,
        correctedSpeed: draftSpeed,
        correctedTorque: draftTorque,
        correctedEfficiency: updatedReport.efficiency,
        reason: draftReason,
        status: 'pending',
        createdAt: new Date(),
      };
      
      dataService.addCorrectionLog(log);
      
      const pendingCorrections = dataService.getEfficiencyReports().filter(r => !r.isCorrected);
      const correctionLogs = dataService.getCorrectionLogs();
      
      const filters = state.filters;
      let filtered = [...pendingCorrections];
      if (filters.testBenchIds.length > 0) {
        filtered = filtered.filter(r => filters.testBenchIds.includes(r.testBenchId));
      }
      if (filters.materialIds.length > 0) {
        filtered = filtered.filter(r => filters.materialIds.includes(r.materialId));
      }
      
      set({
        pendingCorrections,
        filteredCorrections: filtered,
        correctionLogs,
        selectedReport: null,
        draftSpeed: null,
        draftTorque: null,
        draftReason: '',
        previewResult: null,
        comparisonData: null,
        isLoading: false,
      });
      
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '提交修正失败',
      });
      return false;
    }
  },
  
  loadLogs: async () => {
    set({ isLoading: true });
    try {
      await dataService.initialize();
      const logs = dataService.getCorrectionLogs();
      set({ correctionLogs: logs, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '加载日志失败',
      });
    }
  },
  
  clearDraft: () => {
    set({
      draftSpeed: null,
      draftTorque: null,
      draftReason: '',
      previewResult: null,
      comparisonData: null,
    });
  },
}));
