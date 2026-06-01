import { 
  AudioSegment, 
  SpectrumFrame, 
  AnomalyDetail, 
  ValidationResult,
  AnomalyType,
  AnomalySeverity
} from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function createAnomaly(
  type: AnomalyType,
  severity: AnomalySeverity,
  message: string,
  options: Partial<AnomalyDetail> = {}
): AnomalyDetail {
  return {
    id: generateId(),
    type,
    severity,
    message,
    ...options
  };
}

export function detectFrameMisalignment(frames: SpectrumFrame[]): AnomalyDetail[] {
  const anomalies: AnomalyDetail[] = [];
  
  if (frames.length < 2) return anomalies;

  const expectedInterval = frames[1].timestamp - frames[0].timestamp;
  const tolerance = expectedInterval * 0.1;

  for (let i = 1; i < frames.length; i++) {
    const actualInterval = frames[i].timestamp - frames[i - 1].timestamp;
    const diff = Math.abs(actualInterval - expectedInterval);

    if (diff > tolerance) {
      const severity: AnomalySeverity = 
        diff > expectedInterval * 0.5 ? 'critical' :
        diff > expectedInterval * 0.3 ? 'high' :
        diff > expectedInterval * 0.15 ? 'medium' : 'low';

      anomalies.push(createAnomaly(
        'FRAME_MISALIGNMENT',
        severity,
        `帧 ${i - 1} 到 ${i} 时间间隔异常: 期望 ${expectedInterval.toFixed(3)}s, 实际 ${actualInterval.toFixed(3)}s`,
        {
          frameIndex: i,
          affectedRange: {
            startFrame: i - 1,
            endFrame: i
          },
          suggestion: '检查音频采集设备是否丢帧，或考虑使用插值方法补全',
          metadata: {
            expectedInterval,
            actualInterval,
            deviation: diff
          }
        }
      ));
    }
  }

  return anomalies;
}

export function detectFrequencyAliasing(frames: SpectrumFrame[]): AnomalyDetail[] {
  const anomalies: AnomalyDetail[] = [];
  const frequencyThreshold = 0.85;

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const maxFreq = Math.max(...frame.frequencies);
    const nyquistFreq = maxFreq * 2;
    const aliasingThreshold = nyquistFreq * frequencyThreshold;

    const highFreqIndices: number[] = [];
    frame.frequencies.forEach((freq, idx) => {
      if (freq > aliasingThreshold && frame.amplitudes[idx] > 0.1) {
        highFreqIndices.push(idx);
      }
    });

    if (highFreqIndices.length > 5) {
      const startFreqIdx = Math.min(...highFreqIndices);
      const endFreqIdx = Math.max(...highFreqIndices);
      
      anomalies.push(createAnomaly(
        'FREQUENCY_ALIASING',
        frameIdx % 3 === 0 ? 'high' : 'medium',
        `帧 ${frameIdx} 在高频区域(${frame.frequencies[startFreqIdx].toFixed(0)}Hz - ${frame.frequencies[endFreqIdx].toFixed(0)}Hz)检测到潜在混叠`,
        {
          frameIndex: frameIdx,
          frequencyIndex: startFreqIdx,
          affectedRange: {
            startFrame: frameIdx,
            endFrame: frameIdx,
            startFreq: frame.frequencies[startFreqIdx],
            endFreq: frame.frequencies[endFreqIdx]
          },
          suggestion: '考虑提高采样率或应用抗混叠滤波器',
          metadata: {
            nyquistFreq,
            aliasingThreshold,
            affectedBinCount: highFreqIndices.length
          }
        }
      ));
    }
  }

  return anomalies;
}

export function detectLabelMissing(frames: SpectrumFrame[]): AnomalyDetail[] {
  const anomalies: AnomalyDetail[] = [];
  const missingFrames: number[] = [];

  frames.forEach((frame, idx) => {
    if (!frame.labels || frame.labels.length === 0) {
      missingFrames.push(idx);
    }
  });

  if (missingFrames.length > 0) {
    let consecutiveStart = missingFrames[0];
    let consecutiveEnd = missingFrames[0];

    for (let i = 1; i < missingFrames.length; i++) {
      if (missingFrames[i] === consecutiveEnd + 1) {
        consecutiveEnd = missingFrames[i];
      } else {
        const severity: AnomalySeverity = 
          consecutiveEnd - consecutiveStart >= 10 ? 'high' :
          consecutiveEnd - consecutiveStart >= 5 ? 'medium' : 'low';

        anomalies.push(createAnomaly(
          'LABEL_MISSING',
          severity,
          `帧 ${consecutiveStart} - ${consecutiveEnd} 缺少标签`,
          {
            frameIndex: consecutiveStart,
            affectedRange: {
              startFrame: consecutiveStart,
              endFrame: consecutiveEnd
            },
            suggestion: '为这些帧添加频谱特征标签',
            metadata: {
              missingCount: consecutiveEnd - consecutiveStart + 1
            }
          }
        ));
        consecutiveStart = missingFrames[i];
        consecutiveEnd = missingFrames[i];
      }
    }

    const severity: AnomalySeverity = 
      consecutiveEnd - consecutiveStart >= 10 ? 'high' :
      consecutiveEnd - consecutiveStart >= 5 ? 'medium' : 'low';

    anomalies.push(createAnomaly(
      'LABEL_MISSING',
      severity,
      `帧 ${consecutiveStart} - ${consecutiveEnd} 缺少标签`,
      {
        frameIndex: consecutiveStart,
        affectedRange: {
          startFrame: consecutiveStart,
          endFrame: consecutiveEnd
        },
        suggestion: '为这些帧添加频谱特征标签',
        metadata: {
          missingCount: consecutiveEnd - consecutiveStart + 1
        }
      }
    ));
  }

  return anomalies;
}

export function detectAmplitudeAbnormalities(frames: SpectrumFrame[]): AnomalyDetail[] {
  const anomalies: AnomalyDetail[] = [];
  const allAmplitudes = frames.flatMap(f => f.amplitudes);
  const mean = allAmplitudes.reduce((a, b) => a + b, 0) / allAmplitudes.length;
  const std = Math.sqrt(
    allAmplitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allAmplitudes.length
  );

  const zScoreThreshold = 3;

  frames.forEach((frame, frameIdx) => {
    frame.amplitudes.forEach((amp, freqIdx) => {
      const zScore = (amp - mean) / std;
      if (Math.abs(zScore) > zScoreThreshold) {
        const severity: AnomalySeverity = 
          Math.abs(zScore) > 5 ? 'critical' :
          Math.abs(zScore) > 4 ? 'high' : 'medium';

        anomalies.push(createAnomaly(
          'AMPLITUDE_ABNORMAL',
          severity,
          `帧 ${frameIdx}, 频点 ${freqIdx} (${frame.frequencies[freqIdx].toFixed(0)}Hz) 振幅异常: Z-score = ${zScore.toFixed(2)}`,
          {
            frameIndex: frameIdx,
            frequencyIndex: freqIdx,
            suggestion: zScore > 0 ? '检查是否存在突发噪声或峰值' : '检查信号是否衰减或丢失',
            metadata: {
              amplitude: amp,
              zScore,
              mean,
              std
            }
          }
        ));
      }
    });
  });

  return anomalies;
}

export function detectTimeGaps(frames: SpectrumFrame[]): AnomalyDetail[] {
  const anomalies: AnomalyDetail[] = [];
  
  if (frames.length < 2) return anomalies;

  const expectedInterval = 1 / 30;

  for (let i = 1; i < frames.length; i++) {
    const gap = frames[i].timestamp - frames[i - 1].timestamp;
    if (gap > expectedInterval * 3) {
      anomalies.push(createAnomaly(
        'TIME_GAP',
        'critical',
        `帧 ${i - 1} 到 ${i} 存在时间间隙: ${gap.toFixed(3)}s`,
        {
          frameIndex: i,
          affectedRange: {
            startFrame: i - 1,
            endFrame: i
          },
          suggestion: '该时间段数据可能丢失，请检查原始音频文件',
          metadata: { gap }
        }
      ));
    }
  }

  return anomalies;
}

export function validateSegment(segment: AudioSegment): ValidationResult {
  const allAnomalies: AnomalyDetail[] = [];

  allAnomalies.push(...detectFrameMisalignment(segment.frames));
  allAnomalies.push(...detectFrequencyAliasing(segment.frames));
  allAnomalies.push(...detectLabelMissing(segment.frames));
  allAnomalies.push(...detectAmplitudeAbnormalities(segment.frames));
  allAnomalies.push(...detectTimeGaps(segment.frames));

  const criticalAnomalies = allAnomalies.filter(a => a.severity === 'critical');
  const highAnomalies = allAnomalies.filter(a => a.severity === 'high');
  
  const isRejected = criticalAnomalies.length > 3 || highAnomalies.length > 10;
  
  const rejectionReasons: string[] = [];
  if (criticalAnomalies.length > 3) {
    rejectionReasons.push(`存在 ${criticalAnomalies.length} 个严重异常，超过阈值`);
  }
  if (highAnomalies.length > 10) {
    rejectionReasons.push(`存在 ${highAnomalies.length} 个高级异常，超过阈值`);
  }

  const validFrames = segment.frames.filter((_, idx) => {
    return !allAnomalies.some(a => 
      a.affectedRange?.startFrame === idx && 
      a.severity === 'critical'
    );
  }).length;

  return {
    segmentId: segment.id,
    totalFrames: segment.frames.length,
    validFrames,
    anomalies: allAnomalies,
    isRejected,
    rejectionReasons
  };
}

export function filterAnomaliesByType(
  anomalies: AnomalyDetail[],
  types: AnomalyType[]
): AnomalyDetail[] {
  if (types.length === 0) return anomalies;
  return anomalies.filter(a => types.includes(a.type));
}

export function filterAnomaliesBySeverity(
  anomalies: AnomalyDetail[],
  severities: AnomalySeverity[]
): AnomalyDetail[] {
  if (severities.length === 0) return anomalies;
  return anomalies.filter(a => severities.includes(a.severity));
}

export function getAnomaliesForFrame(
  anomalies: AnomalyDetail[],
  frameIndex: number
): AnomalyDetail[] {
  return anomalies.filter(a => {
    if (a.frameIndex === frameIndex) return true;
    if (a.affectedRange) {
      return frameIndex >= a.affectedRange.startFrame && frameIndex <= a.affectedRange.endFrame;
    }
    return false;
  });
}
