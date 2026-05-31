import { 
  RangingRecord, 
  CalibrationConfig, 
  CalibrationStep, 
  Anomaly,
  Phase
} from '../types';
import { 
  SOUND_SPEED_BASE, 
  SOUND_SPEED_TEMP_COEFF,
  NORMAL_TEMPERATURE_RANGE
} from '../constants/config';
import { getMaterialCorrectionFactor } from '../constants/materials';
import { convertDistanceToMeters, convertTemperatureToCelsius } from './unitConversion';

export const calculateSoundSpeed = (temperatureC: number): number => {
  return SOUND_SPEED_BASE + SOUND_SPEED_TEMP_COEFF * temperatureC;
};

export const calculateTemperatureCorrectionFactor = (
  recordTempC: number,
  referenceTempC: number
): number => {
  const recordSoundSpeed = calculateSoundSpeed(recordTempC);
  const referenceSoundSpeed = calculateSoundSpeed(referenceTempC);
  return recordSoundSpeed / referenceSoundSpeed;
};

export const createCalibrationStep = (
  stepName: string,
  beforeValue: number,
  afterValue: number,
  formula: string,
  description: string
): CalibrationStep => ({
  id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  stepName,
  beforeValue,
  afterValue,
  formula,
  description,
  timestamp: new Date(),
});

export const createAnomaly = (
  type: Anomaly['type'],
  severity: Anomaly['severity'],
  description: string,
  suggestion: string,
  value?: number,
  expectedRange?: [number, number],
  echoOrder?: number
): Anomaly => ({
  id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  severity,
  description,
  suggestion,
  isResolved: false,
  value,
  expectedRange,
  echoOrder,
});

export const standardizeRecordUnits = (record: RangingRecord): {
  standardizedDistance: number;
  standardizedTemperature: number;
  unitConverted: boolean;
} => {
  const standardizedDistance = convertDistanceToMeters(
    record.rawDistance,
    record.rawDistanceUnit
  );
  const standardizedTemperature = convertTemperatureToCelsius(
    record.temperature,
    record.temperatureUnit
  );
  
  const unitConverted = record.rawDistanceUnit !== 'm' || record.temperatureUnit !== 'C';
  
  return { standardizedDistance, standardizedTemperature, unitConverted };
};

export const calibrateRecord = (
  record: RangingRecord,
  config: CalibrationConfig,
  phase: Phase
): RangingRecord => {
  const calibrationSteps: CalibrationStep[] = [];
  const anomalies: Anomaly[] = [...record.anomalies];
  let currentValue = record.standardizedDistance ?? convertDistanceToMeters(
    record.rawDistance,
    record.rawDistanceUnit
  );
  const tempC = convertTemperatureToCelsius(record.temperature, record.temperatureUnit);
  
  const standardized = standardizeRecordUnits(record);
  currentValue = standardized.standardizedDistance;
  
  if (standardized.unitConverted) {
    calibrationSteps.push(createCalibrationStep(
      '单位标准化',
      record.rawDistance,
      standardized.standardizedDistance,
      `转换 ${record.rawDistance}${record.rawDistanceUnit} → 米`,
      '将原始测量值统一转换为米(m)单位'
    ));
    
    anomalies.push(createAnomaly(
      'unit_confusion',
      'warning',
      `原始数据单位为${record.rawDistanceUnit}，已自动转换为标准单位米`,
      '建议确认原始数据的单位标注是否正确',
      record.rawDistance
    ));
  }
  
  if (tempC < NORMAL_TEMPERATURE_RANGE[0] || tempC > NORMAL_TEMPERATURE_RANGE[1]) {
    anomalies.push(createAnomaly(
      'temperature_extreme',
      'error',
      `环境温度 ${tempC.toFixed(2)}°C 超出正常工作范围`,
      '建议在标准室温环境下重新测量',
      tempC,
      NORMAL_TEMPERATURE_RANGE
    ));
  }
  
  const tempCorrectionFactor = calculateTemperatureCorrectionFactor(
    tempC,
    config.referenceTemperature
  );
  const tempCorrectedValue = currentValue * tempCorrectionFactor;
  
  calibrationSteps.push(createCalibrationStep(
    '温度校正',
    currentValue,
    tempCorrectedValue,
    `d_corrected = d * (331.3 + 0.606*${tempC.toFixed(2)}) / (331.3 + 0.606*${config.referenceTemperature})`,
    `基于环境温度 ${tempC.toFixed(2)}°C 进行声速校正，校正系数: ${tempCorrectionFactor.toFixed(6)}`
  ));
  
  currentValue = tempCorrectedValue;
  const temperatureCorrection = tempCorrectedValue - standardized.standardizedDistance;
  
  let materialCorrection = 0;
  let affectedByMaterial = false;
  
  if (phase === 'phase2' && record.reflectiveMaterial) {
    const materialFactor = getMaterialCorrectionFactor(record.reflectiveMaterial);
    
    if (materialFactor !== 1.0) {
      const materialCorrectedValue = currentValue * materialFactor;
      
      calibrationSteps.push(createCalibrationStep(
        '反射面材质校正',
        currentValue,
        materialCorrectedValue,
        `d_final = d_temperature_corrected * ${materialFactor} (${record.reflectiveMaterial})`,
        `基于反射面材质"${record.reflectiveMaterial}"进行衰减校正，校正系数: ${materialFactor}`
      ));
      
      currentValue = materialCorrectedValue;
      materialCorrection = materialCorrectedValue - tempCorrectedValue;
      affectedByMaterial = true;
    }
  }
  
  const hasErrorAnomalies = anomalies.some(a => a.severity === 'error');
  
  return {
    ...record,
    standardizedDistance: standardized.standardizedDistance,
    calibratedDistance: currentValue,
    status: hasErrorAnomalies ? 'anomaly' : 'calibrated',
    calibrationSteps,
    anomalies,
    temperatureCorrection,
    materialCorrection,
    affectedByMaterial,
    phase1Distance: phase === 'phase1' ? currentValue : record.phase1Distance,
  };
};

export const detectOutliers = (
  records: RangingRecord[],
  config: CalibrationConfig
): RangingRecord[] => {
  const validRecords = records.filter(r => r.calibratedDistance !== undefined);
  
  if (validRecords.length < 4) return records;
  
  const values = validRecords
    .map(r => r.calibratedDistance!)
    .sort((a, b) => a - b);
  
  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);
  const q1 = values[q1Index];
  const q3 = values[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - config.anomalyThreshold * iqr;
  const upperBound = q3 + config.anomalyThreshold * iqr;
  
  return records.map(record => {
    if (record.calibratedDistance === undefined) return record;
    
    const value = record.calibratedDistance;
    
    if (value < lowerBound || value > upperBound) {
      const existingOutlier = record.anomalies.find(a => a.type === 'outlier');
      
      if (!existingOutlier) {
        return {
          ...record,
          status: 'anomaly' as const,
          anomalies: [
            ...record.anomalies,
            createAnomaly(
              'outlier',
              'error',
              `校准后距离 ${value.toFixed(4)}m 超出正常范围`,
              '建议复核该次测量，或从数据集中剔除',
              value,
              [lowerBound, upperBound]
            ),
          ],
        };
      }
    }
    
    return record;
  });
};

export const detectMultipleEchoes = (
  records: RangingRecord[],
  config: CalibrationConfig
): RangingRecord[] => {
  if (!config.enableMultiEchoDetection) return records;
  
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const echoGroups: Map<string, RangingRecord[]> = new Map();
  const processedIds = new Set<string>();
  
  for (let i = 0; i < sortedRecords.length; i++) {
    if (processedIds.has(sortedRecords[i].id)) continue;
    
    const baseRecord = sortedRecords[i];
    const baseTime = new Date(baseRecord.timestamp).getTime();
    const baseDistance = baseRecord.standardizedDistance ?? 
      convertDistanceToMeters(baseRecord.rawDistance, baseRecord.rawDistanceUnit);
    
    const group: RangingRecord[] = [baseRecord];
    processedIds.add(baseRecord.id);
    
    for (let j = i + 1; j < sortedRecords.length; j++) {
      const compareRecord = sortedRecords[j];
      if (processedIds.has(compareRecord.id)) continue;
      
      const compareTime = new Date(compareRecord.timestamp).getTime();
      const compareDistance = compareRecord.standardizedDistance ??
        convertDistanceToMeters(compareRecord.rawDistance, compareRecord.rawDistanceUnit);
      
      const timeDiff = compareTime - baseTime;
      if (timeDiff > config.multiEchoTimeThreshold) break;
      
      for (let order = 2; order <= 5; order++) {
        const expectedDistance = baseDistance * order;
        const tolerance = expectedDistance * config.multiEchoDistanceTolerance;
        
        if (Math.abs(compareDistance - expectedDistance) <= tolerance) {
          group.push(compareRecord);
          processedIds.add(compareRecord.id);
          break;
        }
      }
    }
    
    if (group.length > 1) {
      echoGroups.set(baseRecord.id, group);
    }
  }
  
  return records.map(record => {
    for (const [baseId, group] of echoGroups) {
      const index = group.findIndex(r => r.id === record.id);
      if (index > 0) {
        return {
          ...record,
          status: 'anomaly' as const,
          anomalies: [
            ...record.anomalies,
            createAnomaly(
              'multiple_echo',
              'error',
              `检测为第${index}次多重回波信号，主波记录ID: ${baseId.slice(0, 8)}`,
              '建议检查测量环境，移除可能造成多次反射的障碍物',
              index,
              undefined,
              index
            ),
          ],
        };
      }
    }
    return record;
  });
};

export const performFullCalibration = (
  records: RangingRecord[],
  config: CalibrationConfig,
  phase: Phase
): RangingRecord[] => {
  let result = records.map(r => calibrateRecord(r, config, phase));
  result = detectOutliers(result, config);
  result = detectMultipleEchoes(result, config);
  
  return result;
};
