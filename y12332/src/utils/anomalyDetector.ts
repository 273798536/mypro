import {
  TemperatureReading,
  AnomalyEvent,
  DiagnosisResult,
  DataQualityIssue,
  DiagnosisType,
  SeverityLevel,
  MaintenanceNote,
  CargoBatch,
  EvidenceItem,
} from '@/types';
import { generateId, calculateMean, calculateStdDev, getTimeDiffMinutes, addMinutes } from './helpers';

export class AnomalyDetector {
  private readings: TemperatureReading[];
  private maintenanceNotes: MaintenanceNote[];
  private cargoBatches: CargoBatch[];
  private batchId: string;

  constructor(
    batchId: string,
    readings: TemperatureReading[],
    maintenanceNotes: MaintenanceNote[] = [],
    cargoBatches: CargoBatch[] = []
  ) {
    this.batchId = batchId;
    this.readings = readings;
    this.maintenanceNotes = maintenanceNotes;
    this.cargoBatches = cargoBatches;
  }

  detectOutliers(sensorReadings: TemperatureReading[]): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];
    const temps = sensorReadings.map((r) => r.temperature);
    const mean = calculateMean(temps);
    const stdDev = calculateStdDev(temps);
    const threshold = mean + 3 * stdDev;
    const lowerThreshold = mean - 3 * stdDev;

    for (const reading of sensorReadings) {
      if (reading.temperature > threshold || reading.temperature < lowerThreshold) {
        const deviation = Math.abs(reading.temperature - mean);
        const severity: SeverityLevel =
          deviation > 5 * stdDev ? 'critical' : deviation > 4 * stdDev ? 'high' : deviation > 3 * stdDev ? 'medium' : 'low';

        anomalies.push({
          id: generateId(),
          batchId: this.batchId,
          readingId: reading.id,
          sensorId: reading.sensorId,
          eventTime: reading.timestamp,
          temperature: reading.temperature,
          threshold,
          deviation,
          anomalyType: 'outlier',
          severity,
          confidence: 0.95,
        });
      }
    }

    return anomalies;
  }

  detectMissingSamples(sensorReadings: TemperatureReading[]): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];
    const sorted = [...sensorReadings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const diff = getTimeDiffMinutes(sorted[i].timestamp, sorted[i - 1].timestamp);
      if (diff > 10) {
        const missingCount = Math.floor(diff / 5) - 1;
        if (missingCount > 0) {
          const severity: SeverityLevel =
            missingCount > 20 ? 'critical' : missingCount > 10 ? 'high' : missingCount > 5 ? 'medium' : 'low';

          anomalies.push({
            id: generateId(),
            batchId: this.batchId,
            readingId: sorted[i].id,
            sensorId: sorted[i].sensorId,
            eventTime: addMinutes(sorted[i - 1].timestamp, 5),
            temperature: sorted[i].temperature,
            threshold: 10,
            deviation: diff,
            anomalyType: 'missing_sample',
            severity,
            confidence: 1.0,
            notes: `缺失 ${missingCount} 个采样点，持续约 ${Math.round(diff)} 分钟`,
          });
        }
      }
    }

    return anomalies;
  }

  detectClockDrift(sensorReadings: TemperatureReading[]): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];
    const sorted = [...sensorReadings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(getTimeDiffMinutes(sorted[i].timestamp, sorted[i - 1].timestamp));
    }

    if (intervals.length < 10) return anomalies;

    const meanInterval = calculateMean(intervals);
    const stdDevInterval = calculateStdDev(intervals);

    for (let i = 1; i < sorted.length; i++) {
      const interval = getTimeDiffMinutes(sorted[i].timestamp, sorted[i - 1].timestamp);
      if (Math.abs(interval - meanInterval) > 2 * stdDevInterval && interval > 0) {
        const drift = Math.abs(interval - meanInterval);
        const severity: SeverityLevel =
          drift > 10 ? 'high' : drift > 5 ? 'medium' : 'low';

        anomalies.push({
          id: generateId(),
          batchId: this.batchId,
          readingId: sorted[i].id,
          sensorId: sorted[i].sensorId,
          eventTime: sorted[i].timestamp,
          temperature: sorted[i].temperature,
          threshold: meanInterval + 2 * stdDevInterval,
          deviation: drift,
          anomalyType: 'clock_drift',
          severity,
          confidence: 0.85,
          notes: `采样间隔异常，预期约 ${meanInterval.toFixed(1)} 分钟，实际 ${interval.toFixed(1)} 分钟`,
        });
      }
    }

    return anomalies;
  }

  detectOffline(sensorReadings: TemperatureReading[]): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];
    const sorted = [...sensorReadings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const diff = getTimeDiffMinutes(sorted[i].timestamp, sorted[i - 1].timestamp);
      if (diff > 60) {
        const severity: SeverityLevel =
          diff > 360 ? 'critical' : diff > 180 ? 'high' : diff > 120 ? 'medium' : 'low';

        anomalies.push({
          id: generateId(),
          batchId: this.batchId,
          readingId: sorted[i].id,
          sensorId: sorted[i].sensorId,
          eventTime: sorted[i - 1].timestamp,
          temperature: sorted[i - 1].temperature,
          threshold: 60,
          deviation: diff,
          anomalyType: 'sensor_offline',
          severity,
          confidence: 1.0,
          notes: `传感器离线约 ${Math.round(diff / 60)} 小时`,
        });
      }
    }

    return anomalies;
  }

  detectValueOutOfRange(sensorReadings: TemperatureReading[]): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];
    const minValidTemp = -40;
    const maxValidTemp = 40;

    for (const reading of sensorReadings) {
      if (reading.temperature < minValidTemp || reading.temperature > maxValidTemp) {
        const deviation = Math.max(
          Math.abs(reading.temperature - maxValidTemp),
          Math.abs(reading.temperature - minValidTemp)
        );
        const severity: SeverityLevel = deviation > 30 ? 'critical' : deviation > 15 ? 'high' : 'medium';

        anomalies.push({
          id: generateId(),
          batchId: this.batchId,
          readingId: reading.id,
          sensorId: reading.sensorId,
          eventTime: reading.timestamp,
          temperature: reading.temperature,
          threshold: reading.temperature > 0 ? maxValidTemp : minValidTemp,
          deviation,
          anomalyType: 'value_out_of_range',
          severity,
          confidence: 1.0,
          notes: `温度值超出合理范围 [${minValidTemp}°C, ${maxValidTemp}°C]`,
        });
      }
    }

    return anomalies;
  }

  detectAll(): AnomalyEvent[] {
    const allAnomalies: AnomalyEvent[] = [];
    const sensorIds = [...new Set(this.readings.map((r) => r.sensorId))];

    for (const sensorId of sensorIds) {
      const sensorReadings = this.readings.filter((r) => r.sensorId === sensorId);

      allAnomalies.push(...this.detectOutliers(sensorReadings));
      allAnomalies.push(...this.detectMissingSamples(sensorReadings));
      allAnomalies.push(...this.detectClockDrift(sensorReadings));
      allAnomalies.push(...this.detectOffline(sensorReadings));
      allAnomalies.push(...this.detectValueOutOfRange(sensorReadings));
    }

    return allAnomalies.sort(
      (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
    );
  }

  diagnose(anomaly: AnomalyEvent): DiagnosisResult {
    const evidenceChain: EvidenceItem[] = [];
    let diagnosisType: DiagnosisType = 'unknown';
    let confidence = 0.5;
    let description = '需要进一步分析确认异常原因';

    const nearbyMaintenance = this.maintenanceNotes.filter(
      (m) =>
        m.sensorId === anomaly.sensorId &&
        Math.abs(new Date(m.eventTime).getTime() - new Date(anomaly.eventTime).getTime()) <
          1000 * 60 * 60 * 4
    );

    if (nearbyMaintenance.length > 0) {
      evidenceChain.push({
        type: 'maintenance',
        description: `发现相关维修记录：${nearbyMaintenance[0].eventType} - ${nearbyMaintenance[0].description}`,
        timestamp: nearbyMaintenance[0].eventTime,
      });

      if (nearbyMaintenance[0].eventType.includes('检修') || nearbyMaintenance[0].eventType.includes('故障')) {
        diagnosisType = 'sensor_fault';
        confidence = 0.9;
        description = '根据维修记录，该异常大概率由传感器故障引起';
      } else if (nearbyMaintenance[0].eventType.includes('网络')) {
        diagnosisType = 'data_quality_issue';
        confidence = 0.95;
        description = '根据维修记录，该异常由网络问题导致的数据质量问题';
      }
    }

    const otherSensorReadings = this.readings.filter(
      (r) =>
        r.sensorId !== anomaly.sensorId &&
        Math.abs(new Date(r.timestamp).getTime() - new Date(anomaly.eventTime).getTime()) <
          1000 * 60 * 30
    );

    if (otherSensorReadings.length > 0) {
      const otherTemps = otherSensorReadings.map((r) => r.temperature);
      const otherMean = calculateMean(otherTemps);
      const otherStdDev = calculateStdDev(otherTemps);

      evidenceChain.push({
        type: 'sensor_reading',
        description: `相邻传感器同期平均温度 ${otherMean.toFixed(2)}°C，标准差 ${otherStdDev.toFixed(2)}°C`,
        timestamp: anomaly.eventTime,
        value: otherMean,
      });

      if (
        anomaly.anomalyType === 'outlier' &&
        Math.abs(anomaly.temperature - otherMean) > 3 * otherStdDev &&
        diagnosisType === 'unknown'
      ) {
        const affectedCargo = this.cargoBatches.find(
          (c) =>
            new Date(anomaly.eventTime) >= new Date(c.startTime) &&
            new Date(anomaly.eventTime) <= new Date(c.endTime)
        );

        if (affectedCargo) {
          evidenceChain.push({
            type: 'cargo_batch',
            description: `关联货品批次：${affectedCargo.productName} (${affectedCargo.cargoId})，要求温度范围 ${affectedCargo.minTemp}°C ~ ${affectedCargo.maxTemp}°C`,
            timestamp: anomaly.eventTime,
          });

          if (
            anomaly.temperature > affectedCargo.maxTemp ||
            anomaly.temperature < affectedCargo.minTemp
          ) {
            diagnosisType = 'cargo_anomaly';
            confidence = 0.8;
            description = '相邻传感器读数正常，该异常可能影响货品质量';
          } else {
            diagnosisType = 'data_quality_issue';
            confidence = 0.7;
            description = '相邻传感器读数正常，该异常可能为数据质量问题';
          }
        } else {
          diagnosisType = 'data_quality_issue';
          confidence = 0.75;
          description = '相邻传感器读数正常，该异常可能为数据质量问题或局部环境波动';
        }
      } else if (
        anomaly.anomalyType === 'outlier' &&
        Math.abs(anomaly.temperature - otherMean) <= 2 * otherStdDev
      ) {
        diagnosisType = 'environment_change';
        confidence = 0.7;
        description = '相邻传感器存在类似温度变化，可能为环境整体变化';
      }
    }

    if (anomaly.anomalyType === 'sensor_offline') {
      diagnosisType = 'data_quality_issue';
      confidence = 0.95;
      description = '传感器离线导致数据缺失，属于数据质量问题';
    } else if (anomaly.anomalyType === 'missing_sample') {
      diagnosisType = 'data_quality_issue';
      confidence = 0.9;
      description = '采样数据缺失，属于数据质量问题';
    } else if (anomaly.anomalyType === 'clock_drift') {
      diagnosisType = 'data_quality_issue';
      confidence = 0.85;
      description = '时钟漂移导致时间戳异常，属于数据质量问题';
    } else if (anomaly.anomalyType === 'value_out_of_range') {
      diagnosisType = 'sensor_fault';
      confidence = 0.9;
      description = '读数超出物理合理范围，大概率为传感器故障';
    }

    evidenceChain.push({
      type: 'statistical',
      description: `异常偏离度 ${anomaly.deviation.toFixed(2)}，置信度 ${(anomaly.confidence * 100).toFixed(0)}%`,
      timestamp: anomaly.eventTime,
      value: anomaly.deviation,
    });

    return {
      id: generateId(),
      anomalyId: anomaly.id,
      diagnosisType,
      description,
      confidence,
      evidenceChain,
    };
  }

  diagnoseAll(anomalies: AnomalyEvent[]): DiagnosisResult[] {
    return anomalies.map((anomaly) => this.diagnose(anomaly));
  }
}

export const runFullDetection = (
  batchId: string,
  readings: TemperatureReading[],
  maintenanceNotes: MaintenanceNote[],
  cargoBatches: CargoBatch[]
): {
  anomalies: AnomalyEvent[];
  diagnoses: DiagnosisResult[];
} => {
  const detector = new AnomalyDetector(batchId, readings, maintenanceNotes, cargoBatches);
  const anomalies = detector.detectAll();
  const diagnoses = detector.diagnoseAll(anomalies);

  const diagnosedAnomalies = anomalies.map((anomaly) => {
    const diagnosis = diagnoses.find((d) => d.anomalyId === anomaly.id);
    return {
      ...anomaly,
      diagnosis: diagnosis?.diagnosisType,
    };
  });

  return {
    anomalies: diagnosedAnomalies,
    diagnoses,
  };
};
