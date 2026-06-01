import { AudioSegment, SpectrumFrame } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function gaussianRandom(mean: number = 0, std: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * std + mean;
}

function generateFrequencies(bins: number, minFreq: number, maxFreq: number): number[] {
  const frequencies: number[] = [];
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  
  for (let i = 0; i < bins; i++) {
    const logFreq = logMin + (logMax - logMin) * (i / (bins - 1));
    frequencies.push(Math.pow(10, logFreq));
  }
  
  return frequencies;
}

function generateAmplitudes(
  frequencies: number[],
  time: number,
  hasHarmonics: boolean = true
): number[] {
  return frequencies.map((freq) => {
    let amplitude = 0;
    
    const fundamental = 440;
    const harmonicCount = hasHarmonics ? 8 : 3;
    
    for (let h = 1; h <= harmonicCount; h++) {
      const harmonicFreq = fundamental * h;
      const bandwidth = 50 * h;
      const distance = Math.abs(freq - harmonicFreq);
      
      if (distance < bandwidth * 3) {
        const harmonicAmp = Math.exp(-distance / bandwidth) * (1 / h);
        const vibrato = Math.sin(time * 5 + h) * 0.1;
        amplitude += harmonicAmp * (0.9 + vibrato);
      }
    }
    
    const noiseAmp = gaussianRandom(0, 0.02);
    amplitude += noiseAmp;
    
    const freqDecay = Math.exp(-freq / 5000);
    amplitude *= freqDecay;
    
    return Math.max(0, Math.min(1, amplitude));
  });
}

export function generateSampleSegmentWithAnomalies(): AudioSegment {
  const frameCount = 50;
  const frequencyBins = 64;
  const minFrequency = 20;
  const maxFrequency = 20000;
  const frameRate = 30;
  const baseInterval = 1 / frameRate;
  
  const frequencies = generateFrequencies(frequencyBins, minFrequency, maxFrequency);
  const frames: SpectrumFrame[] = [];
  
  const frameMisalignmentPositions = [15, 28, 42];
  const timeGapPosition = 35;
  const labelMissingRange = { start: 20, end: 27 };
  const aliasingFrames = [10, 11, 12, 30, 31];
  const abnormalAmplitudePositions = [
    { frame: 8, freq: 12 },
    { frame: 25, freq: 28 },
    { frame: 40, freq: 45 }
  ];
  
  let timestamp = 0;
  
  for (let i = 0; i < frameCount; i++) {
    if (frameMisalignmentPositions.includes(i)) {
      timestamp += baseInterval * (1 + 0.25 + Math.random() * 0.1);
    } else if (timeGapPosition === i) {
      timestamp += baseInterval * 5;
    } else {
      timestamp += baseInterval + (Math.random() - 0.5) * baseInterval * 0.02;
    }
    
    let amplitudes = generateAmplitudes(frequencies, timestamp, true);
    
    if (aliasingFrames.includes(i)) {
      amplitudes = amplitudes.map((amp, idx) => {
        if (idx > frequencyBins * 0.7) {
          return Math.min(1, amp + 0.3 + Math.random() * 0.2);
        }
        return amp;
      });
    }
    
    abnormalAmplitudePositions.forEach(pos => {
      if (pos.frame === i) {
        amplitudes[pos.freq] = Math.min(1, amplitudes[pos.freq] + 0.6);
      }
    });
    
    const hasLabels = i < labelMissingRange.start || i > labelMissingRange.end;
    const labels = hasLabels ? ['频谱正常', '谐波结构'] : undefined;
    
    frames.push({
      id: generateId(),
      timestamp,
      frameIndex: i,
      frequencies: [...frequencies],
      amplitudes,
      labels,
      sourceFile: 'sample_audio_01.wav',
      metadata: {
        generated: true,
        hasAnomaly: frameMisalignmentPositions.includes(i) || 
                   aliasingFrames.includes(i) ||
                   (i >= labelMissingRange.start && i <= labelMissingRange.end)
      }
    });
  }
  
  return {
    id: generateId(),
    name: '钢琴C4音符 - 含异常',
    sourceFile: 'sample_audio_01.wav',
    duration: frames[frames.length - 1].timestamp,
    sampleRate: 44100,
    frames,
    frameRate,
    frequencyBins,
    minFrequency,
    maxFrequency,
    createdAt: new Date(),
    tags: ['钢琴', 'C4', '含异常', '测试数据']
  };
}

export function generateCleanSampleSegment(): AudioSegment {
  const frameCount = 40;
  const frequencyBins = 64;
  const minFrequency = 20;
  const maxFrequency = 20000;
  const frameRate = 30;
  const baseInterval = 1 / frameRate;
  
  const frequencies = generateFrequencies(frequencyBins, minFrequency, maxFrequency);
  const frames: SpectrumFrame[] = [];
  
  let timestamp = 0;
  
  for (let i = 0; i < frameCount; i++) {
    timestamp += baseInterval;
    
    const amplitudes = generateAmplitudes(frequencies, timestamp, true);
    
    frames.push({
      id: generateId(),
      timestamp,
      frameIndex: i,
      frequencies: [...frequencies],
      amplitudes,
      labels: ['频谱正常', '谐波结构', '无噪声'],
      sourceFile: 'clean_audio_01.wav',
      metadata: {
        generated: true,
        hasAnomaly: false
      }
    });
  }
  
  return {
    id: generateId(),
    name: '小提琴A3 - 纯净',
    sourceFile: 'clean_audio_01.wav',
    duration: frames[frames.length - 1].timestamp,
    sampleRate: 44100,
    frames,
    frameRate,
    frequencyBins,
    minFrequency,
    maxFrequency,
    createdAt: new Date(),
    tags: ['小提琴', 'A3', '纯净', '训练数据']
  };
}

export function generateBatchSegments(count: number): AudioSegment[] {
  const segments: AudioSegment[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      segments.push(generateSampleSegmentWithAnomalies());
    } else {
      segments.push(generateCleanSampleSegment());
    }
    
    segments[segments.length - 1].name = `音频片段 ${i + 1}`;
    segments[segments.length - 1].sourceFile = `audio_${String(i + 1).padStart(3, '0')}.wav`;
  }
  
  return segments;
}

export function getHighlightPointsFromAnomalies(
  anomalies: any[]
): any[] {
  const highlights: any[] = [];
  
  anomalies.forEach(anomaly => {
    if (anomaly.frameIndex !== undefined && anomaly.frequencyIndex !== undefined) {
      highlights.push({
        frameIndex: anomaly.frameIndex,
        frequencyIndex: anomaly.frequencyIndex,
        type: 'anomaly' as const,
        anomalyId: anomaly.id,
        color: anomaly.severity === 'critical' ? '#ef4444' :
               anomaly.severity === 'high' ? '#f97316' :
               anomaly.severity === 'medium' ? '#fbbf24' : '#22c55e'
      });
    } else if (anomaly.affectedRange) {
      const { startFrame, endFrame } = anomaly.affectedRange;
      for (let f = startFrame; f <= endFrame; f += Math.max(1, Math.floor((endFrame - startFrame) / 5))) {
        highlights.push({
          frameIndex: f,
          frequencyIndex: 32,
          type: 'anomaly' as const,
          anomalyId: anomaly.id,
          color: anomaly.severity === 'critical' ? '#ef4444' : '#f97316'
        });
      }
    }
  });
  
  return highlights;
}
