import { create } from 'zustand';
import type {
  FilterCriteria,
  VoltageCurrentData,
  TemperatureData,
  SpeedTorqueData,
  EfficiencyReport,
  AnomalyRecord,
  Material,
  TestBench,
  WorkingConditionSegment,
  ChartDataPoint,
} from '@/types';
import { dataService } from '@/services/dataService';
import { caliberEngine } from '@/engines/CaliberConsistencyEngine';
import { anomalyEngine } from '@/engines/AnomalyDetectionEngine';
import { segmentEngine } from '@/engines/SegmentCalculationEngine';
import { efficiencyEngine } from '@/engines/EfficiencyCalculationEngine';

interface AnalysisState {
  initialized: boolean;
  
  filters: FilterCriteria;
  
  materials: Material[];
  testBenches: TestBench[];
  segments: WorkingConditionSegment[];
  
  voltageData: VoltageCurrentData[];
  temperatureData: TemperatureData[];
  speedData: SpeedTorqueData[];
  efficiencyReports: EfficiencyReport[];
  anomalies: AnomalyRecord[];
  
  filteredVoltageData: VoltageCurrentData[];
  filteredTemperatureData: TemperatureData[];
  filteredSpeedData: SpeedTorqueData[];
  filteredReports: EfficiencyReport[];
  filteredAnomalies: AnomalyRecord[];
  
  chartData: {
    efficiency: ChartDataPoint[];
    temperature: ChartDataPoint[];
    power: ChartDataPoint[];
  };
  
  hoveredTimestamp: number | null;
  selectedDataPoint: string | null;
  
  isLoading: boolean;
  error: string | null;
  
  setFilters: (filters: Partial<FilterCriteria>) => Promise<void>;
  setHoveredTimestamp: (ts: number | null) => void;
  setSelectedDataPoint: (id: string | null) => void;
  
  adjustSegmentBoundary: (
    segmentId: string,
    newSpeedRange?: [number, number],
    newTorqueRange?: [number, number]
  ) => Promise<void>;
  
  initialize: () => Promise<void>;
  recalculateAll: () => Promise<void>;
}

const initialFilters: FilterCriteria = {
  testBenchIds: [],
  materialIds: [],
  segmentIds: [],
  timeRange: null,
  anomalyTypes: [],
  dataCaliber: 'all',
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  initialized: false,
  
  filters: initialFilters,
  
  materials: [],
  testBenches: [],
  segments: [],
  
  voltageData: [],
  temperatureData: [],
  speedData: [],
  efficiencyReports: [],
  anomalies: [],
  
  filteredVoltageData: [],
  filteredTemperatureData: [],
  filteredSpeedData: [],
  filteredReports: [],
  filteredAnomalies: [],
  
  chartData: {
    efficiency: [],
    temperature: [],
    power: [],
  },
  
  hoveredTimestamp: null,
  selectedDataPoint: null,
  
  isLoading: false,
  error: null,
  
  initialize: async () => {
    const state = get();
    if (state.initialized) return;
    
    set({ isLoading: true, error: null });
    
    try {
      await dataService.initialize();
      
      const materials = dataService.getMaterials();
      const testBenches = dataService.getTestBenches();
      const segments = dataService.getSegments();
      const segmentScheme = dataService.getSegmentScheme();
      const caliberConfigs = dataService.getCaliberConfigs();
      const thresholdConfigs = dataService.getThresholdConfigs();
      
      caliberEngine.loadActiveCalibers(caliberConfigs);
      anomalyEngine.setThresholdConfigs(thresholdConfigs);
      anomalyEngine.setMaterials(materials);
      anomalyEngine.setTestBenches(testBenches);
      anomalyEngine.setSegments(segments);
      
      if (segmentScheme) {
        segmentEngine.setActiveScheme(segmentScheme);
      }
      
      const voltageData = dataService.getVoltageData();
      const temperatureData = dataService.getTemperatureData();
      const speedData = dataService.getSpeedData();
      const efficiencyReports = dataService.getEfficiencyReports();
      const anomalies = dataService.getAnomalies();
      
      const chartData = segmentEngine.onSegmentChange(
        voltageData,
        temperatureData,
        speedData,
        efficiencyReports,
        anomalies
      ).chartData;
      
      set({
        initialized: true,
        materials,
        testBenches,
        segments,
        voltageData,
        temperatureData,
        speedData,
        efficiencyReports,
        anomalies,
        filteredVoltageData: voltageData,
        filteredTemperatureData: temperatureData,
        filteredSpeedData: speedData,
        filteredReports: efficiencyReports,
        filteredAnomalies: anomalies,
        chartData,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '初始化失败',
      });
    }
  },
  
  setFilters: async (partialFilters) => {
    const state = get();
    const newFilters = { ...state.filters, ...partialFilters };
    
    set({ filters: newFilters, isLoading: true });
    
    try {
      const filteredVoltageData = dataService.getVoltageData(newFilters);
      const filteredTemperatureData = dataService.getTemperatureData(newFilters);
      const filteredSpeedData = dataService.getSpeedData(newFilters);
      const filteredReports = dataService.getEfficiencyReports(newFilters);
      const filteredAnomalies = dataService.getAnomalies(newFilters);
      
      const chartData = segmentEngine.onSegmentChange(
        filteredVoltageData,
        filteredTemperatureData,
        filteredSpeedData,
        filteredReports,
        filteredAnomalies
      ).chartData;
      
      set({
        filteredVoltageData,
        filteredTemperatureData,
        filteredSpeedData,
        filteredReports,
        filteredAnomalies,
        chartData,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '筛选数据失败',
      });
    }
  },
  
  setHoveredTimestamp: (ts) => {
    set({ hoveredTimestamp: ts });
  },
  
  setSelectedDataPoint: (id) => {
    set({ selectedDataPoint: id });
  },
  
  adjustSegmentBoundary: async (segmentId, newSpeedRange, newTorqueRange) => {
    const state = get();
    set({ isLoading: true });
    
    try {
      const newSegments = segmentEngine.adjustSegmentBoundary(
        segmentId,
        newSpeedRange,
        newTorqueRange
      );
      
      dataService.updateSegments(newSegments);
      
      const result = segmentEngine.onSegmentChange(
        state.voltageData,
        state.temperatureData,
        state.speedData,
        state.efficiencyReports,
        state.anomalies
      );
      
      const newReports = efficiencyEngine.calculateAllSegments(newSegments, {
        voltageData: result.voltageData,
        temperatureData: result.temperatureData,
        speedData: result.speedData,
        efficiencyReports: result.efficiencyReports,
        anomalies: result.anomalies,
      });
      
      const newAnomalies = anomalyEngine.recalculateAll(newSegments, {
        voltageData: result.voltageData,
        temperatureData: result.temperatureData,
        speedData: result.speedData,
        efficiencyReports: newReports,
        anomalies: result.anomalies,
      });
      
      dataService.recalculateEfficiencyReports(newReports);
      dataService.recalculateAnomalies(newAnomalies);
      
      const filters = state.filters;
      const filteredVoltageData = dataService.getVoltageData(filters);
      const filteredTemperatureData = dataService.getTemperatureData(filters);
      const filteredSpeedData = dataService.getSpeedData(filters);
      const filteredReports = dataService.getEfficiencyReports(filters);
      const filteredAnomalies = dataService.getAnomalies(filters);
      
      set({
        segments: newSegments,
        voltageData: result.voltageData,
        temperatureData: result.temperatureData,
        speedData: result.speedData,
        efficiencyReports: newReports,
        anomalies: newAnomalies,
        filteredVoltageData,
        filteredTemperatureData,
        filteredSpeedData,
        filteredReports,
        filteredAnomalies,
        chartData: result.chartData,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '调整分段失败',
      });
    }
  },
  
  recalculateAll: async () => {
    const state = get();
    set({ isLoading: true });
    
    try {
      const voltageData = dataService.getVoltageData();
      const temperatureData = dataService.getTemperatureData();
      const speedData = dataService.getSpeedData();
      const efficiencyReports = dataService.getEfficiencyReports();
      const anomalies = dataService.getAnomalies();
      
      const newReports = efficiencyEngine.calculateAllSegments(state.segments, {
        voltageData,
        temperatureData,
        speedData,
        efficiencyReports,
        anomalies,
      });
      
      const newAnomalies = anomalyEngine.recalculateAll(state.segments, {
        voltageData,
        temperatureData,
        speedData,
        efficiencyReports: newReports,
        anomalies,
      });
      
      dataService.recalculateEfficiencyReports(newReports);
      dataService.recalculateAnomalies(newAnomalies);
      
      const filters = state.filters;
      const filteredVoltageData = dataService.getVoltageData(filters);
      const filteredTemperatureData = dataService.getTemperatureData(filters);
      const filteredSpeedData = dataService.getSpeedData(filters);
      const filteredReports = dataService.getEfficiencyReports(filters);
      const filteredAnomalies = dataService.getAnomalies(filters);
      
      set({
        voltageData,
        temperatureData,
        speedData,
        efficiencyReports: newReports,
        anomalies: newAnomalies,
        filteredVoltageData,
        filteredTemperatureData,
        filteredSpeedData,
        filteredReports,
        filteredAnomalies,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '重算失败',
      });
    }
  },
}));
