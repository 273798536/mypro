import type {
  Flywheel,
  AngularVelocityRecord,
  SamplingGap,
  UnitError,
  FrictionOmission,
  MeasurementReport,
} from '../types';
import { detectUnitMismatch, convertToMeters } from '../utils/unitConverter';
import { estimateFrictionDeviation } from './frictionCorrector';
import { materialFrictionStandards } from '../data/mockFlywheels';

export const detectSamplingGaps = (
  records: AngularVelocityRecord[],
  flywheelId: string,
  threshold: number = 0.5
): SamplingGap[] => {
  const gaps: SamplingGap[] = [];
  const flywheelRecords = records
    .filter(r => r.flywheelId === flywheelId && r.isValid)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  if (flywheelRecords.length < 2) return gaps;
  
  let gapStart: number | null = null;
  const flywheel = records.find(r => r.flywheelId === flywheelId);
  
  for (let i = 1; i < flywheelRecords.length; i++) {
    const prev = flywheelRecords[i - 1];
    const curr = flywheelRecords[i];
    const diff = curr.timestamp - prev.timestamp;
    
    if (diff > threshold) {
      if (gapStart === null) {
        gapStart = prev.timestamp;
      }
      
      if (i === flywheelRecords.length - 1 || 
          flywheelRecords[i + 1].timestamp - curr.timestamp <= threshold) {
        gaps.push({
          id: `gap-${flywheelId}-${Date.now()}-${gaps.length}`,
          flywheelId,
          startTime: gapStart,
          endTime: curr.timestamp,
          duration: curr.timestamp - gapStart,
          materialInvolved: '未知材料',
          reason: 'data_loss',
          isInterpolated: false,
        });
        gapStart = null;
      }
    }
  }
  
  return gaps;
};

export const detectUnitErrors = (
  flywheels: Flywheel[],
  reports: MeasurementReport[]
): UnitError[] => {
  const errors: UnitError[] = [];
  
  flywheels.forEach(flywheel => {
    const matchingReport = reports.find(r => r.flywheelId === flywheel.id);
    
    if (matchingReport) {
      const rawInputNum = parseFloat(flywheel.rawRadiusInput);
      
      if (!isNaN(rawInputNum)) {
        const inputInMeters = convertToMeters(rawInputNum, flywheel.radiusUnit);
        const reportInMeters = matchingReport.reportedUnit.includes('m') && !matchingReport.reportedUnit.includes('mm')
          ? matchingReport.reportedInertia > 100 
            ? matchingReport.reportedInertia / 1000
            : matchingReport.reportedInertia
          : matchingReport.reportedInertia;
        
        if (Math.abs(inputInMeters - flywheel.radius) > 0.001) {
          errors.push({
            id: `unit-err-${flywheel.id}-radius`,
            flywheelId: flywheel.id,
            field: 'radius',
            inputValue: flywheel.rawRadiusInput,
            inputUnit: flywheel.radiusUnit,
            expectedUnit: 'm',
            expectedValue: flywheel.radius,
            materialName: flywheel.material,
            severity: 'error',
          });
        }
        
        if (rawInputNum > 100 && flywheel.radiusUnit === 'mm') {
          const expectedInMeters = rawInputNum / 1000;
          if (Math.abs(expectedInMeters - flywheel.radius) > 0.01) {
            errors.push({
              id: `unit-err-${flywheel.id}-radius-mismatch`,
              flywheelId: flywheel.id,
              field: 'radius',
              inputValue: flywheel.rawRadiusInput,
              inputUnit: flywheel.radiusUnit,
              expectedUnit: 'm',
              expectedValue: expectedInMeters,
              materialName: flywheel.name,
              severity: 'error',
            });
          }
        }
      }
    }
    
    const rawInputNum = parseFloat(flywheel.rawRadiusInput);
    if (!isNaN(rawInputNum) && rawInputNum > 100 && flywheel.radiusUnit === 'm') {
      errors.push({
        id: `unit-err-${flywheel.id}-radius-large`,
        flywheelId: flywheel.id,
        field: 'radius',
        inputValue: flywheel.rawRadiusInput,
        inputUnit: flywheel.radiusUnit,
        expectedUnit: 'mm',
        expectedValue: rawInputNum / 1000,
        materialName: flywheel.name,
        severity: 'warning',
      });
    }
  });
  
  return errors;
};

export const detectFrictionOmissions = (
  flywheels: Flywheel[]
): FrictionOmission[] => {
  const omissions: FrictionOmission[] = [];
  
  flywheels.forEach(flywheel => {
    if (flywheel.frictionCoeff === null || flywheel.frictionCoeff === 0) {
      const theoreticalInertia = 0.5 * flywheel.mass * flywheel.radius * flywheel.radius;
      const estimatedDeviation = estimateFrictionDeviation(flywheel, theoreticalInertia);
      
      omissions.push({
        id: `friction-omit-${flywheel.id}`,
        flywheelId: flywheel.id,
        materialName: flywheel.material,
        batchNo: flywheel.batchNo,
        estimatedDeviation,
        isConfigured: false,
      });
    }
  });
  
  return omissions;
};

export const detectAllErrors = (
  flywheels: Flywheel[],
  angularVelocities: AngularVelocityRecord[],
  reports: MeasurementReport[]
) => {
  const allGaps: SamplingGap[] = [];
  flywheels.forEach(fw => {
    const gaps = detectSamplingGaps(angularVelocities, fw.id);
    gaps.forEach(g => {
      allGaps.push({
        ...g,
        materialInvolved: fw.material,
      });
    });
  });
  
  const unitErrors = detectUnitErrors(flywheels, reports);
  const frictionOmissions = detectFrictionOmissions(flywheels);
  
  return {
    samplingGaps: allGaps,
    unitErrors,
    frictionOmissions,
  };
};

export const formatFrictionOmissionMessage = (omission: FrictionOmission): string => {
  const standardCoeff = materialFrictionStandards[omission.materialName] || 0.025;
  return `【摩擦修正遗漏】${omission.batchNo}批次${omission.materialName}飞轮摩擦系数未配置，当前计算值偏差约${omission.estimatedDeviation.toFixed(1)}%，建议配置标准值 ${standardCoeff}`;
};

export const formatUnitErrorMessage = (error: UnitError): string => {
  return `【半径单位错误】当前输入 ${error.inputValue}${error.inputUnit} 与系统换算值 ${error.expectedValue.toFixed(3)}${error.expectedUnit} 不一致，请确认材料"${error.materialName}"的实际尺寸`;
};

export const formatSamplingGapMessage = (gap: SamplingGap): string => {
  return `【采样缺口】时间点 ${gap.startTime.toFixed(1)}s-${gap.endTime.toFixed(1)}s 无角速度记录，涉及材料"${gap.materialInvolved}"，${gap.isInterpolated ? '已自动插值' : '惯量计算已自动插值'}，建议复核`;
};
