import { generateId, formatAnomalyMessage } from '@/utils/helpers';
import type {
  Material,
  TestBench,
  WorkingConditionSegment,
  SpeedTorqueData,
  TemperatureData,
  VoltageCurrentData,
  AnomalyRecord,
  ThresholdConfig,
  AnomalyType,
  AllDataType,
} from '@/types';

export class AnomalyDetectionEngine {
  private thresholdConfigs: Map<string, ThresholdConfig> = new Map();
  private materialMap: Map<string, Material> = new Map();
  private testBenchMap: Map<string, TestBench> = new Map();
  private segmentMap: Map<string, WorkingConditionSegment> = new Map();

  setThresholdConfigs(configs: ThresholdConfig[]): void {
    this.thresholdConfigs.clear();
    configs.forEach(config => {
      this.thresholdConfigs.set(config.materialId, config);
    });
  }

  setMaterials(materials: Material[]): void {
    this.materialMap.clear();
    materials.forEach(m => this.materialMap.set(m.id, m));
  }

  setTestBenches(testBenches: TestBench[]): void {
    this.testBenchMap.clear();
    testBenches.forEach(tb => this.testBenchMap.set(tb.id, tb));
  }

  setSegments(segments: WorkingConditionSegment[]): void {
    this.segmentMap.clear();
    segments.forEach(s => this.segmentMap.set(s.id, s));
  }

  detectSpeedMissing(
    data: SpeedTorqueData[],
    material: Material,
    testBench: TestBench
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const threshold = this.thresholdConfigs.get(material.id)?.speedSampleInterval ?? 100;
    
    for (let i = 0; i < data.length; i++) {
      if (i > 0 && data[i].isMissing && !data[i - 1].isMissing) {
        let missingCount = 0;
        let missingStart = data[i].timestamp;
        
        for (let j = i; j < data.length && data[j].isMissing; j++) {
          missingCount++;
        }
        
        if (missingCount > 1) {
          const actualInterval = missingCount * 20 * 1000;
          const segment = this.segmentMap.get(data[i].segmentId);
          
          anomalies.push({
            id: generateId(),
            type: 'speed_missing',
            severity: actualInterval > 500 ? 'critical' : 'error',
            testBenchId: testBench.id,
            materialId: material.id,
            segmentId: data[i].segmentId,
            timestamp: missingStart,
            actualValue: actualInterval,
            threshold,
            duration: missingCount * 20,
            message: formatAnomalyMessage(
              'speed_missing',
              material.code,
              testBench.code,
              missingStart,
              actualInterval,
              threshold,
              undefined,
              segment?.name
            ),
            resolved: false,
          });
          
          i += missingCount - 1;
        }
      }
    }
    
    return anomalies;
  }

  detectTemperatureOverlimit(
    data: TemperatureData[],
    material: Material,
    testBench: TestBench,
    segment: WorkingConditionSegment
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const threshold = this.thresholdConfigs.get(material.id)?.temperatureLimit ?? 100;
    
    let overlimitStart: Date | null = null;
    let overlimitCount = 0;
    let maxTemp = 0;
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (item.temperature > threshold) {
        if (!overlimitStart) {
          overlimitStart = item.timestamp;
          overlimitCount = 0;
          maxTemp = 0;
        }
        overlimitCount++;
        maxTemp = Math.max(maxTemp, item.temperature);
        
        const nextItem = data[i + 1];
        const isLastOverlimit = !nextItem || nextItem.temperature <= threshold;
        
        if (isLastOverlimit && overlimitCount >= 3) {
          const duration = overlimitCount * 20;
          
          anomalies.push({
            id: generateId(),
            type: 'temp_overlimit',
            severity: maxTemp > threshold + 15 ? 'critical' : 'warning',
            testBenchId: testBench.id,
            materialId: material.id,
            objectType: item.objectType,
            segmentId: segment.id,
            timestamp: overlimitStart,
            actualValue: maxTemp,
            threshold,
            duration,
            message: formatAnomalyMessage(
              'temp_overlimit',
              material.code,
              testBench.code,
              overlimitStart,
              maxTemp,
              threshold,
              item.objectType,
              segment.name,
              duration
            ),
            resolved: false,
          });
          
          overlimitStart = null;
        }
      } else {
        overlimitStart = null;
      }
    }
    
    return anomalies;
  }

  detectPowerReverse(
    data: VoltageCurrentData[],
    material: Material,
    testBench: TestBench
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const thresholdConfig = this.thresholdConfigs.get(material.id);
    const minPower = thresholdConfig?.powerMin ?? 0;
    
    for (const item of data) {
      if (item.power < minPower) {
        const segment = this.segmentMap.get(item.segmentId);
        
        anomalies.push({
          id: generateId(),
          type: 'power_reverse',
          severity: 'error',
          testBenchId: testBench.id,
          materialId: material.id,
          segmentId: item.segmentId,
          timestamp: item.timestamp,
          actualValue: item.power,
          threshold: minPower,
          message: formatAnomalyMessage(
            'power_reverse',
            material.code,
            testBench.code,
            item.timestamp,
            item.power,
            minPower,
            undefined,
            segment?.name
          ),
          resolved: false,
        });
      }
    }
    
    return anomalies;
  }

  formatMessage(anomaly: AnomalyRecord): string {
    const material = this.materialMap.get(anomaly.materialId);
    const testBench = this.testBenchMap.get(anomaly.testBenchId);
    const segment = this.segmentMap.get(anomaly.segmentId);
    
    if (!material || !testBench) return anomaly.message;
    
    return formatAnomalyMessage(
      anomaly.type,
      material.code,
      testBench.code,
      anomaly.timestamp,
      anomaly.actualValue,
      anomaly.threshold,
      anomaly.objectType,
      segment?.name,
      anomaly.duration
    );
  }

  recalculateAll(
    segments: WorkingConditionSegment[],
    allData: AllDataType
  ): AnomalyRecord[] {
    this.setSegments(segments);
    
    const allAnomalies: AnomalyRecord[] = [];
    
    const materials = Array.from(this.materialMap.values());
    const testBenches = Array.from(this.testBenchMap.values());
    
    for (const material of materials) {
      for (const testBench of testBenches) {
        const speedData = allData.speedData.filter(
          d => d.materialId === material.id && d.testBenchId === testBench.id
        );
        const speedAnomalies = this.detectSpeedMissing(speedData, material, testBench);
        allAnomalies.push(...speedAnomalies);
        
        for (const segment of segments) {
          const tempData = allData.temperatureData.filter(
            d => d.materialId === material.id && 
                 d.testBenchId === testBench.id && 
                 d.segmentId === segment.id
          );
          const tempAnomalies = this.detectTemperatureOverlimit(tempData, material, testBench, segment);
          allAnomalies.push(...tempAnomalies);
        }
        
        const voltageData = allData.voltageData.filter(
          d => d.materialId === material.id && d.testBenchId === testBench.id
        );
        const powerAnomalies = this.detectPowerReverse(voltageData, material, testBench);
        allAnomalies.push(...powerAnomalies);
      }
    }
    
    return allAnomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAnomalyStats(anomalies: AnomalyRecord[]): Record<AnomalyType, number> {
    return {
      speed_missing: anomalies.filter(a => a.type === 'speed_missing').length,
      temp_overlimit: anomalies.filter(a => a.type === 'temp_overlimit').length,
      power_reverse: anomalies.filter(a => a.type === 'power_reverse').length,
    };
  }

  getUnresolvedCount(anomalies: AnomalyRecord[]): number {
    return anomalies.filter(a => !a.resolved).length;
  }

  getAnomaliesBySeverity(anomalies: AnomalyRecord[], severity: string): AnomalyRecord[] {
    return anomalies.filter(a => a.severity === severity);
  }
}

export const anomalyEngine = new AnomalyDetectionEngine();
