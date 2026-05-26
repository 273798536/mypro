import type { GyroFrame, Anomaly, Severity } from '../types';
import { isNormalized, quaternionToEuler, integrateAngularVelocity } from './quaternion';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

interface DetectionConfig {
  quaternionNormalizationTolerance: number;
  driftThreshold: number;
  driftWindowSize: number;
  signalQualityWarningThreshold: number;
  signalQualityErrorThreshold: number;
  voltageWarningMin: number;
  voltageWarningMax: number;
  temperatureWarningMin: number;
  temperatureWarningMax: number;
}

const defaultConfig: DetectionConfig = {
  quaternionNormalizationTolerance: 0.01,
  driftThreshold: 0.05,
  driftWindowSize: 10,
  signalQualityWarningThreshold: 70,
  signalQualityErrorThreshold: 40,
  voltageWarningMin: 3.3,
  voltageWarningMax: 5.5,
  temperatureWarningMin: -10,
  temperatureWarningMax: 60,
};

export const detectAnomalies = (
  frames: GyroFrame[],
  config: Partial<DetectionConfig> = {}
): Anomaly[] => {
  const mergedConfig = { ...defaultConfig, ...config };
  const anomalies: Anomaly[] = [];

  if (frames.length === 0) return anomalies;

  anomalies.push(...detectQuaternionNormalization(frames, mergedConfig));
  anomalies.push(...detectTimestampOrder(frames));
  anomalies.push(...detectDrift(frames, mergedConfig));
  anomalies.push(...detectSensorAbnormalities(frames, mergedConfig));

  return anomalies.sort((a, b) => a.frameIndex - b.frameIndex);
};

const detectQuaternionNormalization = (
  frames: GyroFrame[],
  config: DetectionConfig
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  frames.forEach((frame, index) => {
    const normalized = isNormalized(frame.quaternion, config.quaternionNormalizationTolerance);
    if (!normalized) {
      const norm = Math.sqrt(
        frame.quaternion[0] ** 2 +
        frame.quaternion[1] ** 2 +
        frame.quaternion[2] ** 2 +
        frame.quaternion[3] ** 2
      );
      const deviation = Math.abs(norm - 1);
      const severity: Severity = deviation > 0.1 ? 'critical' : deviation > 0.05 ? 'error' : 'warning';

      anomalies.push({
        id: generateId(),
        type: 'quaternion_not_normalized',
        severity,
        frameIndex: index,
        timestamp: frame.timestamp,
        description: `四元数未归一化，模长为 ${norm.toFixed(4)}，偏离标准值 ${deviation.toFixed(4)}`,
        details: {
          norm,
          deviation,
          quaternion: frame.quaternion,
        },
      });
    }
  });

  return anomalies;
};

const detectTimestampOrder = (frames: GyroFrame[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  for (let i = 1; i < frames.length; i++) {
    const prevTime = frames[i - 1].timestamp;
    const currTime = frames[i].timestamp;

    if (currTime <= prevTime) {
      const timeDiff = prevTime - currTime;
      const severity: Severity = timeDiff > 1000 ? 'critical' : timeDiff > 100 ? 'error' : 'warning';

      anomalies.push({
        id: generateId(),
        type: 'timestamp_out_of_order',
        severity,
        frameIndex: i,
        timestamp: currTime,
        description: `时间戳乱序，当前帧时间 (${currTime}ms) 早于或等于上一帧 (${prevTime}ms)，倒推 ${timeDiff}ms`,
        details: {
          prevTimestamp: prevTime,
          currentTimestamp: currTime,
          timeDiff,
        },
      });
    }
  }

  return anomalies;
};

const detectDrift = (frames: GyroFrame[], config: DetectionConfig): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  if (frames.length < config.driftWindowSize) return anomalies;

  for (let i = config.driftWindowSize; i < frames.length; i++) {
    const startIdx = i - config.driftWindowSize;
    const startFrame = frames[startIdx];
    let expectedQuaternion = [...startFrame.quaternion] as [number, number, number, number];

    for (let j = startIdx + 1; j <= i; j++) {
      const dt = (frames[j].timestamp - frames[j - 1].timestamp) / 1000;
      expectedQuaternion = integrateAngularVelocity(
        expectedQuaternion,
        frames[j - 1].angularVelocity,
        dt
      );
    }

    const actualQuaternion = frames[i].quaternion;
    const expectedEuler = quaternionToEuler(expectedQuaternion);
    const actualEuler = quaternionToEuler(actualQuaternion);

    const drift = Math.max(
      Math.abs(expectedEuler[0] - actualEuler[0]),
      Math.abs(expectedEuler[1] - actualEuler[1]),
      Math.abs(expectedEuler[2] - actualEuler[2])
    );

    if (drift > config.driftThreshold) {
      const severity: Severity = drift > config.driftThreshold * 5 ? 'critical' : drift > config.driftThreshold * 2 ? 'error' : 'warning';

      anomalies.push({
        id: generateId(),
        type: 'drift_detected',
        severity,
        frameIndex: i,
        timestamp: frames[i].timestamp,
        description: `检测到姿态漂移，在 ${config.driftWindowSize} 帧窗口内最大姿态偏差为 ${(drift * 180 / Math.PI).toFixed(2)}°`,
        details: {
          driftRad: drift,
          driftDeg: drift * 180 / Math.PI,
          expectedEuler,
          actualEuler,
          windowSize: config.driftWindowSize,
        },
      });
    }
  }

  return anomalies;
};

const detectSensorAbnormalities = (
  frames: GyroFrame[],
  config: DetectionConfig
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  frames.forEach((frame, index) => {
    const { temperature, voltage, signalQuality } = frame.sensorStatus;
    const issues: string[] = [];
    let maxSeverity: Severity | null = null;

    if (signalQuality < config.signalQualityErrorThreshold) {
      issues.push(`信号质量过低: ${signalQuality}%`);
      maxSeverity = 'error';
    } else if (signalQuality < config.signalQualityWarningThreshold) {
      issues.push(`信号质量偏低: ${signalQuality}%`);
      maxSeverity = 'warning';
    }

    if (voltage < config.voltageWarningMin || voltage > config.voltageWarningMax) {
      issues.push(`电压异常: ${voltage}V`);
      maxSeverity = maxSeverity === 'error' ? 'error' : 'warning';
    }

    if (temperature < config.temperatureWarningMin || temperature > config.temperatureWarningMax) {
      issues.push(`温度异常: ${temperature}°C`);
      maxSeverity = maxSeverity === 'error' ? 'error' : 'warning';
    }

    if (issues.length > 0) {
      anomalies.push({
        id: generateId(),
        type: 'sensor_abnormal',
        severity: maxSeverity!,
        frameIndex: index,
        timestamp: frame.timestamp,
        description: `传感器异常: ${issues.join('; ')}`,
        details: {
          temperature,
          voltage,
          signalQuality,
          issues,
        },
      });
    }
  });

  return anomalies;
};

export const getAnomalyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    quaternion_not_normalized: '四元数未归一化',
    timestamp_out_of_order: '时间戳乱序',
    drift_detected: '姿态漂移',
    sensor_abnormal: '传感器异常',
  };
  return labels[type] || type;
};

export const getSeverityColor = (severity: Severity): string => {
  const colors: Record<Severity, string> = {
    warning: '#ff9500',
    error: '#ff3b30',
    critical: '#af0000',
  };
  return colors[severity];
};

export const getSeverityLabel = (severity: Severity): string => {
  const labels: Record<Severity, string> = {
    warning: '警告',
    error: '错误',
    critical: '严重',
  };
  return labels[severity];
};
