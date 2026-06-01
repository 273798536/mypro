import { generateAllMockData } from './mockData';
import type {
  Material,
  TestBench,
  WorkingConditionSegment,
  SegmentScheme,
  VoltageCurrentData,
  TemperatureData,
  SpeedTorqueData,
  EfficiencyReport,
  AnomalyRecord,
  CorrectionLog,
  CaliberConfig,
  ThresholdConfig,
  FilterCriteria,
  DashboardStats,
} from '@/types';

class DataService {
  private materials: Material[] = [];
  private testBenches: TestBench[] = [];
  private segments: WorkingConditionSegment[] = [];
  private segmentScheme: SegmentScheme | null = null;
  private caliberConfigs: CaliberConfig[] = [];
  private thresholdConfigs: ThresholdConfig[] = [];
  private voltageData: VoltageCurrentData[] = [];
  private temperatureData: TemperatureData[] = [];
  private speedData: SpeedTorqueData[] = [];
  private efficiencyReports: EfficiencyReport[] = [];
  private anomalies: AnomalyRecord[] = [];
  private correctionLogs: CorrectionLog[] = [];
  private anomalyTrend: { date: string; count: number }[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const data = generateAllMockData();
    
    this.materials = data.materials;
    this.testBenches = data.testBenches;
    this.segments = data.segments;
    this.segmentScheme = data.segmentScheme;
    this.caliberConfigs = data.caliberConfigs;
    this.thresholdConfigs = data.thresholdConfigs;
    this.voltageData = data.voltageData;
    this.temperatureData = data.temperatureData;
    this.speedData = data.speedData;
    this.efficiencyReports = data.efficiencyReports;
    this.anomalies = data.anomalies;
    this.correctionLogs = data.correctionLogs;
    this.anomalyTrend = data.anomalyTrend;
    
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DataService not initialized. Call initialize() first.');
    }
  }

  getMaterials(): Material[] {
    this.ensureInitialized();
    return this.materials;
  }

  getTestBenches(): TestBench[] {
    this.ensureInitialized();
    return this.testBenches;
  }

  getSegments(): WorkingConditionSegment[] {
    this.ensureInitialized();
    return this.segments;
  }

  getSegmentScheme(): SegmentScheme | null {
    this.ensureInitialized();
    return this.segmentScheme;
  }

  getCaliberConfigs(): CaliberConfig[] {
    this.ensureInitialized();
    return this.caliberConfigs;
  }

  getThresholdConfigs(): ThresholdConfig[] {
    this.ensureInitialized();
    return this.thresholdConfigs;
  }

  getVoltageData(filters?: FilterCriteria): VoltageCurrentData[] {
    this.ensureInitialized();
    return this.filterData(this.voltageData, filters) as VoltageCurrentData[];
  }

  getTemperatureData(filters?: FilterCriteria): TemperatureData[] {
    this.ensureInitialized();
    return this.filterData(this.temperatureData, filters) as TemperatureData[];
  }

  getSpeedData(filters?: FilterCriteria): SpeedTorqueData[] {
    this.ensureInitialized();
    return this.filterData(this.speedData, filters) as SpeedTorqueData[];
  }

  getEfficiencyReports(filters?: FilterCriteria): EfficiencyReport[] {
    this.ensureInitialized();
    return this.filterReports(this.efficiencyReports, filters);
  }

  getAnomalies(filters?: FilterCriteria): AnomalyRecord[] {
    this.ensureInitialized();
    return this.filterAnomalies(this.anomalies, filters);
  }

  getCorrectionLogs(): CorrectionLog[] {
    this.ensureInitialized();
    return this.correctionLogs;
  }

  getAnomalyTrend(): { date: string; count: number }[] {
    this.ensureInitialized();
    return this.anomalyTrend;
  }

  getDashboardStats(): DashboardStats {
    this.ensureInitialized();
    
    const today = new Date();
    const todayAnomalies = this.anomalies.filter(a => 
      a.timestamp.toDateString() === today.toDateString()
    );
    
    return {
      totalTestBenches: this.testBenches.length,
      onlineTestBenches: this.testBenches.filter(tb => tb.status === 'online').length,
      offlineTestBenches: this.testBenches.filter(tb => tb.status === 'offline').length,
      maintenanceTestBenches: this.testBenches.filter(tb => tb.status === 'maintenance').length,
      todayAnomalies: {
        speedMissing: todayAnomalies.filter(a => a.type === 'speed_missing').length,
        tempOverlimit: todayAnomalies.filter(a => a.type === 'temp_overlimit').length,
        powerReverse: todayAnomalies.filter(a => a.type === 'power_reverse').length,
      },
      recentCorrections: this.correctionLogs.slice(0, 10),
      anomalyTrend: this.anomalyTrend,
    };
  }

  private filterData(
    data: (VoltageCurrentData | TemperatureData | SpeedTorqueData)[],
    filters?: FilterCriteria
  ): (VoltageCurrentData | TemperatureData | SpeedTorqueData)[] {
    if (!filters) return data;
    
    return data.filter(item => {
      if (filters.testBenchIds.length > 0 && !filters.testBenchIds.includes(item.testBenchId)) {
        return false;
      }
      if (filters.materialIds.length > 0 && !filters.materialIds.includes(item.materialId)) {
        return false;
      }
      if (filters.segmentIds.length > 0 && !filters.segmentIds.includes(item.segmentId)) {
        return false;
      }
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        if (item.timestamp < start || item.timestamp > end) {
          return false;
        }
      }
      return true;
    });
  }

  private filterReports(reports: EfficiencyReport[], filters?: FilterCriteria): EfficiencyReport[] {
    if (!filters) return reports;
    
    return reports.filter(item => {
      if (filters.testBenchIds.length > 0 && !filters.testBenchIds.includes(item.testBenchId)) {
        return false;
      }
      if (filters.materialIds.length > 0 && !filters.materialIds.includes(item.materialId)) {
        return false;
      }
      if (filters.segmentIds.length > 0 && !filters.segmentIds.includes(item.segmentId)) {
        return false;
      }
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        if (item.endTime < start || item.startTime > end) {
          return false;
        }
      }
      return true;
    });
  }

  private filterAnomalies(anomalies: AnomalyRecord[], filters?: FilterCriteria): AnomalyRecord[] {
    if (!filters) return anomalies;
    
    return anomalies.filter(item => {
      if (filters.testBenchIds.length > 0 && !filters.testBenchIds.includes(item.testBenchId)) {
        return false;
      }
      if (filters.materialIds.length > 0 && !filters.materialIds.includes(item.materialId)) {
        return false;
      }
      if (filters.segmentIds.length > 0 && !filters.segmentIds.includes(item.segmentId)) {
        return false;
      }
      if (filters.anomalyTypes.length > 0 && !filters.anomalyTypes.includes(item.type)) {
        return false;
      }
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        if (item.timestamp < start || item.timestamp > end) {
          return false;
        }
      }
      return true;
    });
  }

  updateSegments(segments: WorkingConditionSegment[]): void {
    this.ensureInitialized();
    this.segments = segments;
    if (this.segmentScheme) {
      this.segmentScheme.segments = segments;
    }
  }

  updateCaliberConfig(config: CaliberConfig): void {
    this.ensureInitialized();
    const index = this.caliberConfigs.findIndex(c => c.id === config.id);
    if (index !== -1) {
      this.caliberConfigs[index] = config;
    }
  }

  updateThresholdConfig(config: ThresholdConfig): void {
    this.ensureInitialized();
    const index = this.thresholdConfigs.findIndex(c => c.materialId === config.materialId);
    if (index !== -1) {
      this.thresholdConfigs[index] = config;
    }
  }

  updateEfficiencyReport(report: EfficiencyReport): void {
    this.ensureInitialized();
    const index = this.efficiencyReports.findIndex(r => r.id === report.id);
    if (index !== -1) {
      this.efficiencyReports[index] = report;
    }
  }

  addCorrectionLog(log: CorrectionLog): void {
    this.ensureInitialized();
    this.correctionLogs.unshift(log);
  }

  resolveAnomaly(anomalyId: string, resolution: string): void {
    this.ensureInitialized();
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.resolution = resolution;
    }
  }

  recalculateAnomalies(newAnomalies: AnomalyRecord[]): void {
    this.ensureInitialized();
    this.anomalies = newAnomalies;
  }

  recalculateEfficiencyReports(newReports: EfficiencyReport[]): void {
    this.ensureInitialized();
    this.efficiencyReports = newReports;
  }
}

export const dataService = new DataService();
