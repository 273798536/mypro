import { generateId, calculateEfficiency, calculateOutputPower } from '@/utils/helpers';
import type {
  WorkingConditionSegment,
  VoltageCurrentData,
  SpeedTorqueData,
  EfficiencyReport,
  AnomalyRecord,
  ComparisonData,
  AllDataType,
} from '@/types';
import { caliberEngine } from './CaliberConsistencyEngine';
import { anomalyEngine } from './AnomalyDetectionEngine';

export class EfficiencyCalculationEngine {
  calculateSegmentEfficiency(
    segmentId: string,
    voltageData: VoltageCurrentData[],
    speedData: SpeedTorqueData[]
  ): EfficiencyReport {
    const segVoltageData = voltageData.filter(d => d.segmentId === segmentId);
    const segSpeedData = speedData.filter(d => d.segmentId === segmentId && !d.isMissing);
    
    if (segVoltageData.length === 0 || segSpeedData.length === 0) {
      return {
        id: generateId(),
        testBenchId: '',
        materialId: '',
        segmentId,
        startTime: new Date(),
        endTime: new Date(),
        inputPower: 0,
        outputPower: 0,
        efficiency: 0,
        isCorrected: false,
      };
    }
    
    const testBenchId = segVoltageData[0].testBenchId;
    const materialId = segVoltageData[0].materialId;
    
    const inputPowerValues = segVoltageData.map(d => Math.abs(d.power));
    const avgInputPower = inputPowerValues.reduce((a, b) => a + b, 0) / inputPowerValues.length;
    
    const avgSpeed = segSpeedData.reduce((a, b) => a + b.speed, 0) / segSpeedData.length;
    const avgTorque = segSpeedData.reduce((a, b) => a + b.torque, 0) / segSpeedData.length;
    
    const outputPower = caliberEngine.calculate('efficiency', {
      inputPower: avgInputPower,
      outputPower: calculateOutputPower(avgSpeed, avgTorque),
    });
    
    const efficiency = calculateEfficiency(avgInputPower, calculateOutputPower(avgSpeed, avgTorque));
    
    const timestamps = segVoltageData.map(d => d.timestamp.getTime());
    const startTime = new Date(Math.min(...timestamps));
    const endTime = new Date(Math.max(...timestamps));
    
    return {
      id: generateId(),
      testBenchId,
      materialId,
      segmentId,
      startTime,
      endTime,
      inputPower: Number(avgInputPower.toFixed(4)),
      outputPower: Number(outputPower.toFixed(4)),
      efficiency: Number(efficiency.toFixed(2)),
      isCorrected: false,
    };
  }

  calculateAllSegments(
    segments: WorkingConditionSegment[],
    data: AllDataType
  ): EfficiencyReport[] {
    const reports: EfficiencyReport[] = [];
    
    const testBenchIds = [...new Set(data.voltageData.map(d => d.testBenchId))];
    const materialIds = [...new Set(data.voltageData.map(d => d.materialId))];
    
    for (const testBenchId of testBenchIds) {
      for (const materialId of materialIds) {
        for (const segment of segments) {
          const segVoltageData = data.voltageData.filter(
            d => d.testBenchId === testBenchId && 
                 d.materialId === materialId && 
                 d.segmentId === segment.id
          );
          const segSpeedData = data.speedData.filter(
            d => d.testBenchId === testBenchId && 
                 d.materialId === materialId && 
                 d.segmentId === segment.id
          );
          
          if (segVoltageData.length === 0 || segSpeedData.length === 0) continue;
          
          const report = this.calculateSegmentEfficiency(
            segment.id,
            segVoltageData,
            segSpeedData
          );
          
          reports.push(report);
        }
      }
    }
    
    return reports;
  }

  recalculateAfterCorrection(
    report: EfficiencyReport,
    newSpeed: number,
    newTorque: number
  ): {
    newEfficiency: number;
    newOutputPower: number;
    anomalyChanges: AnomalyRecord[];
  } {
    const newOutputPower = calculateOutputPower(newSpeed, newTorque);
    const newEfficiency = calculateEfficiency(report.inputPower, newOutputPower);
    
    const anomalyChanges: AnomalyRecord[] = [];
    
    const thresholdConfig = anomalyEngine['thresholdConfigs'].get(report.materialId);
    const material = anomalyEngine['materialMap'].get(report.materialId);
    const testBench = anomalyEngine['testBenchMap'].get(report.testBenchId);
    
    if (thresholdConfig && material && testBench) {
      const oldSpeed = report.correctedData?.speed ?? report.originalData?.speed ?? 0;
      const oldTorque = report.correctedData?.torque ?? report.originalData?.torque ?? 0;
      
      const oldOutputPower = calculateOutputPower(oldSpeed, oldTorque);
      
      if (oldOutputPower < thresholdConfig.powerMin && newOutputPower >= thresholdConfig.powerMin) {
        anomalyChanges.push({
          id: generateId(),
          type: 'power_reverse',
          severity: 'error',
          testBenchId: report.testBenchId,
          materialId: report.materialId,
          segmentId: report.segmentId,
          timestamp: new Date(),
          actualValue: newOutputPower,
          threshold: thresholdConfig.powerMin,
          message: `修正后功率恢复正常范围`,
          resolved: true,
          resolution: '手动修正转速扭矩后功率恢复正常',
        });
      }
    }
    
    return {
      newEfficiency: Number(newEfficiency.toFixed(2)),
      newOutputPower: Number(newOutputPower.toFixed(4)),
      anomalyChanges,
    };
  }

  generateComparisonData(
    original: EfficiencyReport,
    corrected: EfficiencyReport
  ): ComparisonData {
    const origSpeed = original.originalData?.speed ?? original.correctedData?.speed ?? 0;
    const origTorque = original.originalData?.torque ?? original.correctedData?.torque ?? 0;
    const origEff = original.originalData?.efficiency ?? original.efficiency;
    const origPower = calculateOutputPower(origSpeed, origTorque);
    
    const corrSpeed = corrected.correctedData?.speed ?? 0;
    const corrTorque = corrected.correctedData?.torque ?? 0;
    const corrEff = corrected.efficiency;
    const corrPower = calculateOutputPower(corrSpeed, corrTorque);
    
    return {
      original,
      corrected,
      diff: {
        speed: Number((corrSpeed - origSpeed).toFixed(2)),
        torque: Number((corrTorque - origTorque).toFixed(2)),
        efficiency: Number((corrEff - origEff).toFixed(2)),
        power: Number((corrPower - origPower).toFixed(4)),
      },
    };
  }

  applyCorrection(
    report: EfficiencyReport,
    newSpeed: number,
    newTorque: number,
    operator: string,
    reason: string
  ): EfficiencyReport {
    const result = this.recalculateAfterCorrection(report, newSpeed, newTorque);
    
    const originalSpeed = report.correctedData?.speed ?? 
                          report.originalData?.speed ?? 
                          (report.originalData = { speed: 0, torque: 0, efficiency: report.efficiency }).speed;
    const originalTorque = report.correctedData?.torque ?? report.originalData?.torque ?? 0;
    const originalEfficiency = report.correctedData?.efficiency ?? report.originalData?.efficiency ?? report.efficiency;
    
    if (!report.originalData) {
      report.originalData = {
        speed: originalSpeed,
        torque: originalTorque,
        efficiency: originalEfficiency,
      };
    }
    
    report.correctedData = {
      speed: newSpeed,
      torque: newTorque,
      efficiency: result.newEfficiency,
      operator,
      reason,
      correctedAt: new Date(),
    };
    
    report.outputPower = result.newOutputPower;
    report.efficiency = result.newEfficiency;
    report.isCorrected = true;
    
    return report;
  }

  getSegmentSummary(
    reports: EfficiencyReport[],
    segments: WorkingConditionSegment[]
  ): Array<{
    segment: WorkingConditionSegment;
    avgEfficiency: number;
    minEfficiency: number;
    maxEfficiency: number;
    reportCount: number;
    correctedCount: number;
  }> {
    return segments.map(segment => {
      const segReports = reports.filter(r => r.segmentId === segment.id);
      
      if (segReports.length === 0) {
        return {
          segment,
          avgEfficiency: 0,
          minEfficiency: 0,
          maxEfficiency: 0,
          reportCount: 0,
          correctedCount: 0,
        };
      }
      
      const efficiencies = segReports.map(r => r.efficiency);
      
      return {
        segment,
        avgEfficiency: Number((efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(2)),
        minEfficiency: Math.min(...efficiencies),
        maxEfficiency: Math.max(...efficiencies),
        reportCount: segReports.length,
        correctedCount: segReports.filter(r => r.isCorrected).length,
      };
    });
  }

  getEfficiencyTrend(
    reports: EfficiencyReport[],
    days: number = 7
  ): Array<{ date: string; efficiency: number; segmentId: string }> {
    const trend: Array<{ date: string; efficiency: number; segmentId: string }> = [];
    
    const sortedReports = [...reports].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    const dailyMap = new Map<string, Map<string, number[]>>();
    
    for (const report of sortedReports) {
      const dateKey = report.startTime.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, new Map());
      }
      const segmentMap = dailyMap.get(dateKey)!;
      if (!segmentMap.has(report.segmentId)) {
        segmentMap.set(report.segmentId, []);
      }
      segmentMap.get(report.segmentId)!.push(report.efficiency);
    }
    
    for (const [date, segmentMap] of dailyMap) {
      for (const [segmentId, efficiencies] of segmentMap) {
        trend.push({
          date,
          efficiency: Number((efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(2)),
          segmentId,
        });
      }
    }
    
    return trend;
  }

  validateCorrection(
    report: EfficiencyReport,
    newSpeed: number,
    newTorque: number
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (newSpeed < 0 || newSpeed > 10000) {
      errors.push('转速值超出正常范围(0-10000 rpm)');
    }
    
    if (newTorque < 0 || newTorque > 500) {
      errors.push('扭矩值超出正常范围(0-500 N·m)');
    }
    
    const originalSpeed = report.correctedData?.speed ?? report.originalData?.speed ?? 0;
    const originalTorque = report.correctedData?.torque ?? report.originalData?.torque ?? 0;
    
    const speedDiff = Math.abs(newSpeed - originalSpeed);
    const torqueDiff = Math.abs(newTorque - originalTorque);
    
    if (speedDiff > originalSpeed * 0.2 && originalSpeed > 0) {
      warnings.push(`转速修正幅度超过20%，请确认是否合理`);
    }
    
    if (torqueDiff > originalTorque * 0.2 && originalTorque > 0) {
      warnings.push(`扭矩修正幅度超过20%，请确认是否合理`);
    }
    
    const expectedOutput = calculateOutputPower(newSpeed, newTorque);
    if (expectedOutput > report.inputPower * 1.5) {
      warnings.push('修正后输出功率显著大于输入功率，可能存在问题');
    }
    
    return { valid: errors.length === 0, warnings, errors };
  }
}

export const efficiencyEngine = new EfficiencyCalculationEngine();
