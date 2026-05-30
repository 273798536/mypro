import { v4 as uuidv4 } from 'uuid';
import {
  MonitoringDetail,
  AnomalyDetectionResult,
  CableArchive,
  TemperatureRecord
} from '../types';
import {
  correctFrequency,
  detectTemperatureDrift,
  detectSensorBreak,
  detectWindMissing,
  analyzeTrend
} from './frequencyCorrection';

export interface DetectionContext {
  cableArchive?: CableArchive;
  allRecords: TemperatureRecord[];
  allDetails: MonitoringDetail[];
  previousRecord?: TemperatureRecord;
}

export function detectAnomaly(
  temperatureRecord: TemperatureRecord,
  context: DetectionContext,
  detectionVersion: number = 1
): {
  detail: Omit<MonitoringDetail, 'id' | 'created_at' | 'updated_at'>;
  detectionResult: Omit<AnomalyDetectionResult, 'id' | 'created_at'>;
} {
  const correction = correctFrequency(
    temperatureRecord.frequency,
    temperatureRecord.temperature,
    temperatureRecord.wind_speed,
    context.cableArchive
  );

  const sensorBreak = detectSensorBreak(temperatureRecord, context.previousRecord);
  const windMissing = detectWindMissing(temperatureRecord.wind_speed);
  const tempDrift = detectTemperatureDrift(
    context.allRecords.map(r => ({ record_time: r.record_time, temperature: r.temperature })),
    { record_time: temperatureRecord.record_time, temperature: temperatureRecord.temperature }
  );

  let anomalyScore = 0;
  let anomalyType: AnomalyDetectionResult['anomaly_type'] = 'normal';
  let isAnomaly = false;
  let causeExplanations: string[] = [];

  if (sensorBreak.isBreak) {
    anomalyScore += 80;
    anomalyType = 'sensor_break';
    isAnomaly = true;
    causeExplanations.push(sensorBreak.explanation);
  }

  if (tempDrift.isDrift) {
    anomalyScore += 30;
    if (!isAnomaly) {
      anomalyType = 'temperature_drift';
      isAnomaly = true;
    }
    causeExplanations.push(tempDrift.explanation);
  }

  if (windMissing.isMissing) {
    anomalyScore += 10;
    if (!isAnomaly) {
      anomalyType = 'wind_missing';
      isAnomaly = true;
    }
    causeExplanations.push(windMissing.explanation);
  }

  if (correction.deviation_from_design !== null) {
    const absDeviation = Math.abs(correction.deviation_from_design);
    if (absDeviation > 15) {
      anomalyScore += 75;
      anomalyType = 'structural_damage';
      isAnomaly = true;
      causeExplanations.push(`频率偏离设计值 ${absDeviation.toFixed(2)}%，疑似结构损伤`);
    } else if (absDeviation > 8) {
      anomalyScore += 40;
      if (!isAnomaly) {
        anomalyType = 'wind_induced';
      }
      isAnomaly = true;
      causeExplanations.push(`频率偏离设计值 ${absDeviation.toFixed(2)}%，可能为风致振动影响`);
    } else if (absDeviation > 3) {
      anomalyScore += 15;
      if (!isAnomaly) {
        anomalyType = 'wind_induced';
        isAnomaly = true;
      }
      causeExplanations.push(`频率轻度偏离设计值 ${absDeviation.toFixed(2)}%`);
    }
  }

  if (correction.wind_effect_estimate !== null && correction.wind_effect_estimate > 1.0) {
    anomalyScore += 20;
    if (!isAnomaly) {
      anomalyType = 'wind_induced';
      isAnomaly = true;
    }
    causeExplanations.push(`风致振动影响估计 ${correction.wind_effect_estimate.toFixed(3)} Hz`);
  }

  if (anomalyScore > 100) anomalyScore = 100;

  const confidence = calculateConfidence(temperatureRecord, context);

  const detailBase: Omit<MonitoringDetail, 'id' | 'created_at' | 'updated_at'> = {
    temperature_record_id: temperatureRecord.id,
    sensor_id: temperatureRecord.sensor_id,
    cable_id: context.cableArchive?.id,
    record_time: temperatureRecord.record_time,
    raw_frequency: temperatureRecord.frequency,
    raw_temperature: temperatureRecord.temperature,
    wind_speed: temperatureRecord.wind_speed,
    corrected_frequency: correction.corrected_frequency,
    temperature_correction: correction.temperature_correction,
    wind_effect_estimate: correction.wind_effect_estimate,
    deviation_from_design: correction.deviation_from_design,
    anomaly_score: anomalyScore,
    is_anomaly: isAnomaly,
    anomaly_cause: causeExplanations.length > 0 ? causeExplanations.join('；') : '无异常',
    import_phase: context.cableArchive ? 2 : 1,
    affected_by_cable_archive: false,
    detection_version: detectionVersion,
    status: isAnomaly
      ? anomalyScore >= 70 ? 'critical' : 'warning'
      : 'normal'
  };

  const trendAnalysis = analyzeTrend(
    { ...detailBase, id: '', created_at: '', updated_at: '' } as MonitoringDetail,
    context.allDetails
  );

  detailBase.trend_comparison = `${trendAnalysis.trend}：${trendAnalysis.comparison}`;

  const detectionResult: Omit<AnomalyDetectionResult, 'id' | 'created_at'> = {
    detail_id: '',
    detection_version: detectionVersion,
    is_anomaly: isAnomaly,
    anomaly_score: anomalyScore,
    anomaly_type: anomalyType,
    cause_explanation: causeExplanations.length > 0 ? causeExplanations.join('；') : '频率在正常范围内，无异常',
    trend_analysis: `${trendAnalysis.trend}。${trendAnalysis.comparison}`,
    confidence: confidence
  };

  return { detail: detailBase, detectionResult };
}

function calculateConfidence(
  record: TemperatureRecord,
  context: DetectionContext
): number {
  let confidence = 100;

  if (record.frequency === null) confidence -= 30;
  if (record.temperature === null) confidence -= 20;
  if (record.wind_speed === null) confidence -= 15;
  if (!context.cableArchive) confidence -= 25;

  const recentRecords = context.allRecords
    .filter(r => r.sensor_id === record.sensor_id && r.is_valid)
    .slice(-10);
  
  if (recentRecords.length < 5) confidence -= 10;

  return Math.max(10, confidence);
}

export function reanalyzeWithCableArchive(
  existingDetail: MonitoringDetail,
  cableArchive: CableArchive,
  allRecords: TemperatureRecord[],
  allDetails: MonitoringDetail[]
): {
  updatedDetail: Partial<MonitoringDetail>;
  newDetectionResult: Omit<AnomalyDetectionResult, 'id' | 'created_at'>;
  changes: Array<{ field: string; oldValue: string; newValue: string; reason: string }>;
} {
  const temperatureRecord = allRecords.find(r => r.id === existingDetail.temperature_record_id);
  if (!temperatureRecord) {
    throw new Error('关联温度记录不存在');
  }

  const previousRecord = allRecords
    .filter(r => r.sensor_id === existingDetail.sensor_id && r.id !== temperatureRecord.id)
    .sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime())[0];

  const newVersion = existingDetail.detection_version + 1;

  const { detail, detectionResult } = detectAnomaly(
    temperatureRecord,
    {
      cableArchive,
      allRecords,
      allDetails,
      previousRecord
    },
    newVersion
  );

  const changes: Array<{ field: string; oldValue: string; newValue: string; reason: string }> = [];

  if (existingDetail.cable_id !== cableArchive.id) {
    changes.push({
      field: 'cable_id',
      oldValue: existingDetail.cable_id || '未关联',
      newValue: cableArchive.id,
      reason: '补录桥索档案后关联桥索信息'
    });
  }

  if (existingDetail.corrected_frequency !== detail.corrected_frequency) {
    changes.push({
      field: 'corrected_frequency',
      oldValue: existingDetail.corrected_frequency?.toString() || '未计算',
      newValue: detail.corrected_frequency?.toString() || '未计算',
      reason: '补录桥索档案后使用桥索设计参数重新进行温度校正'
    });
  }

  if (existingDetail.temperature_correction !== detail.temperature_correction) {
    changes.push({
      field: 'temperature_correction',
      oldValue: existingDetail.temperature_correction?.toString() || '未计算',
      newValue: detail.temperature_correction?.toString() || '未计算',
      reason: '补录桥索档案后使用桥索温度系数重新计算温度校正量'
    });
  }

  if (existingDetail.deviation_from_design !== detail.deviation_from_design) {
    changes.push({
      field: 'deviation_from_design',
      oldValue: existingDetail.deviation_from_design?.toString() || '未计算',
      newValue: detail.deviation_from_design?.toString() || '未计算',
      reason: '补录桥索档案后使用桥索设计频率计算偏差率'
    });
  }

  if (existingDetail.anomaly_score !== detail.anomaly_score) {
    changes.push({
      field: 'anomaly_score',
      oldValue: existingDetail.anomaly_score.toString(),
      newValue: detail.anomaly_score.toString(),
      reason: '补录桥索档案后异常评分因桥索档案信息更新而重新计算'
    });
  }

  if (existingDetail.is_anomaly !== detail.is_anomaly) {
    changes.push({
      field: 'is_anomaly',
      oldValue: existingDetail.is_anomaly ? '是' : '否',
      newValue: detail.is_anomaly ? '是' : '否',
      reason: '补录桥索档案后异常状态因桥索档案信息更新而重新判定'
    });
  }

  if (existingDetail.anomaly_cause !== detail.anomaly_cause) {
    changes.push({
      field: 'anomaly_cause',
      oldValue: existingDetail.anomaly_cause || '无',
      newValue: detail.anomaly_cause || '无',
      reason: '补录桥索档案后异常原因因桥索档案信息更新而重新解释'
    });
  }

  if (existingDetail.status !== detail.status) {
    changes.push({
      field: 'status',
      oldValue: existingDetail.status,
      newValue: detail.status,
      reason: '补录桥索档案后状态因桥索档案信息更新而重新判定'
    });
  }

  if (existingDetail.trend_comparison !== detail.trend_comparison) {
    changes.push({
      field: 'trend_comparison',
      oldValue: existingDetail.trend_comparison || '无',
      newValue: detail.trend_comparison || '无',
      reason: '补录桥索档案后趋势对比因桥索档案信息更新而重新分析'
    });
  }

  if (existingDetail.wind_effect_estimate !== detail.wind_effect_estimate) {
    changes.push({
      field: 'wind_effect_estimate',
      oldValue: existingDetail.wind_effect_estimate?.toString() || '未计算',
      newValue: detail.wind_effect_estimate?.toString() || '未计算',
      reason: '补录桥索档案后风致振动影响重新计算'
    });
  }

  const updatedDetail: Partial<MonitoringDetail> = {
    ...detail,
    id: existingDetail.id,
    import_phase: 2,
    affected_by_cable_archive: true,
    detection_version: newVersion
  };

  return {
    updatedDetail,
    newDetectionResult: {
      ...detectionResult,
      detail_id: existingDetail.id
    },
    changes
  };
}
