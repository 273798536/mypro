import { Batch, AudioFile, FFTSpectrum, AnalysisResult, ProblemRecord, FilterParams, ProblemType, FilterType, AudioFileType } from '../types';
import { computeAverageSpectrum } from '../utils/fft';
import { applyFrequencyDomainFilter, computeWaveformDifference } from '../utils/filters';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSineWave(frequency: number, sampleRate: number, duration: number, amplitude: number = 0.5): Float32Array {
  const length = Math.floor(sampleRate * duration);
  const wave = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    wave[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  
  return wave;
}

function generateNoise(sampleRate: number, duration: number, amplitude: number = 0.1): Float32Array {
  const length = Math.floor(sampleRate * duration);
  const noise = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    noise[i] = (Math.random() * 2 - 1) * amplitude;
  }
  
  return noise;
}

function generateCurrentNoise(sampleRate: number, duration: number, amplitude: number = 0.15): Float32Array {
  const length = Math.floor(sampleRate * duration);
  const noise = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const fundamental = Math.sin(2 * Math.PI * 50 * i / sampleRate);
    const harmonic2 = 0.5 * Math.sin(2 * Math.PI * 100 * i / sampleRate);
    const harmonic3 = 0.25 * Math.sin(2 * Math.PI * 150 * i / sampleRate);
    noise[i] = amplitude * (fundamental + harmonic2 + harmonic3);
  }
  
  return noise;
}

function mixSignals(...signals: Float32Array[]): Float32Array {
  const length = Math.min(...signals.map(s => s.length));
  const result = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    for (const signal of signals) {
      result[i] += signal[i];
    }
  }
  
  let max = 0;
  for (let i = 0; i < length; i++) {
    max = Math.max(max, Math.abs(result[i]));
  }
  
  if (max > 1) {
    for (let i = 0; i < length; i++) {
      result[i] /= max;
    }
  }
  
  return result;
}

export function generateMockAudioWithNoise(
  sampleRate: number = 44100,
  duration: number = 3,
  hasCurrentNoise: boolean = true,
  hasEnvNoise: boolean = true
): Float32Array {
  const voice = generateSineWave(440, sampleRate, duration, 0.4);
  
  let modulator1 = new Float32Array(voice.length);
  let modulator2 = new Float32Array(voice.length);
  for (let i = 0; i < voice.length; i++) {
    modulator1[i] = 1 + 0.3 * Math.sin(2 * Math.PI * 3 * i / sampleRate);
    modulator2[i] = 1 + 0.2 * Math.sin(2 * Math.PI * 5 * i / sampleRate);
  }
  
  for (let i = 0; i < voice.length; i++) {
    voice[i] = voice[i] * modulator1[i] * modulator2[i];
  }
  
  const signals: Float32Array[] = [voice];
  
  if (hasCurrentNoise) {
    signals.push(generateCurrentNoise(sampleRate, duration, 0.12));
  }
  
  if (hasEnvNoise) {
    signals.push(generateNoise(sampleRate, duration, 0.08));
  }
  
  const hum500Hz = generateSineWave(500, sampleRate, duration, 0.1);
  signals.push(hum500Hz);
  
  return mixSignals(...signals);
}

export function generateMockBatch(): {
  batch: Batch;
  audioFiles: AudioFile[];
  spectrumBefore: FFTSpectrum;
  spectrumAfter: FFTSpectrum;
  filterParams: FilterParams;
  analysisResult: AnalysisResult;
  problems: ProblemRecord[];
} {
  const batchId = generateId('batch');
  const now = Date.now();
  
  const batch: Batch = {
    batchId,
    name: '学生录音_2024级_钢琴练习_01',
    sourceNote: '学生A提交，录制设备：iPhone 13，环境：宿舍',
    listenerNote: '听感有明显电流嗡嗡声，主要集中在低频，钢琴音色部分可辨',
    createdAt: now - 86400000,
    status: 'has_issues',
  };
  
  const sampleRate = 44100;
  const duration = 3;
  
  const originalChannelData = generateMockAudioWithNoise(sampleRate, duration, true, true);
  
  const originalAudioBlob = new Blob([originalChannelData.buffer], { type: 'application/octet-stream' });
  const originalBlobUrl = URL.createObjectURL(originalAudioBlob);
  
  const originalFile: AudioFile = {
    fileId: generateId('audio'),
    batchId,
    type: 'original',
    sourceType: 'original' as AudioFileType,
    name: '钢琴练习_原始录音.wav',
    sampleRate,
    bitDepth: 16,
    duration,
    blobUrl: originalBlobUrl,
    numberOfChannels: 1,
    channelData: [originalChannelData],
  };
  
  const filterType: FilterType = 'bandpass';
  const lowFreq = 200;
  const highFreq = 4000;
  
  const processedChannelData = applyFrequencyDomainFilter(
    originalChannelData,
    filterType,
    lowFreq,
    highFreq,
    sampleRate
  );
  
  const processedAudioBlob = new Blob([processedChannelData.buffer], { type: 'application/octet-stream' });
  const processedBlobUrl = URL.createObjectURL(processedAudioBlob);
  
  const processedFile: AudioFile = {
    fileId: generateId('audio'),
    batchId,
    type: 'processed',
    sourceType: 'processed' as AudioFileType,
    name: '钢琴练习_滤波后.wav',
    sampleRate,
    bitDepth: 16,
    duration,
    blobUrl: processedBlobUrl,
    numberOfChannels: 1,
    channelData: [processedChannelData],
  };
  
  const fftSize = 2048;
  const windowType = 'hann';
  
  const beforeSpectrum = computeAverageSpectrum(originalChannelData, fftSize, windowType, sampleRate);
  const afterSpectrum = computeAverageSpectrum(processedChannelData, fftSize, windowType, sampleRate);
  
  const spectrumBefore: FFTSpectrum = {
    spectrumId: generateId('spec'),
    fileId: originalFile.fileId,
    batchId,
    fftSize,
    windowType,
    frequencyData: beforeSpectrum.magnitude,
    timeData: originalChannelData,
    binFrequencies: beforeSpectrum.binFrequencies,
    sampleRate,
  };
  
  const spectrumAfter: FFTSpectrum = {
    spectrumId: generateId('spec'),
    fileId: processedFile.fileId,
    batchId,
    fftSize,
    windowType,
    frequencyData: afterSpectrum.magnitude,
    timeData: processedChannelData,
    binFrequencies: afterSpectrum.binFrequencies,
    sampleRate,
  };
  
  const filterParams: FilterParams = {
    paramsId: generateId('params'),
    resultId: generateId('result'),
    filterType,
    lowFreq,
    highFreq,
    gain: 0,
    order: 511,
  };
  
  const analysisResult: AnalysisResult = {
    resultId: filterParams.resultId,
    batchId,
    originalFileId: originalFile.fileId,
    processedFileId: processedFile.fileId,
    paramsId: filterParams.paramsId,
    spectrumBefore,
    spectrumAfter,
    waveformDiff: computeWaveformDifference(originalChannelData, processedChannelData),
    createdAt: now - 3600000,
    analyzedAt: now - 3600000,
    filteredAt: now - 3600000,
    fftSize,
    peakFrequency: 440,
    noiseFloor: -65,
    snr: 25,
    snrImprovement: 8,
    problemCount: 3,
  };
  
  const problems: ProblemRecord[] = [
    {
      problemId: generateId('prob'),
      batchId,
      type: 'high_noise_floor',
      severity: 'warning',
      description: '噪声底过高，低频区域检测到明显的50Hz电源干扰及其谐波成分，平均约 -45 dB。',
      reproduceMethod: '1. 查看频谱图的低频区域(0-200Hz)\n2. 观察50Hz、100Hz、150Hz处的尖峰\n3. 对比正常录音的噪声水平\n4. 检查录音环境的电源干扰',
      detectedAt: now - 7200000,
      frequency: 50,
      magnitude: -45,
      affectedFrequencies: [50, 100, 150],
      suggestedAction: '使用陷波滤波器去除50Hz及其谐波，或改善录音环境远离电源',
      evidence: { avgNoiseDB: -45, mainInterference: '50Hz' },
    },
    {
      problemId: generateId('prob'),
      batchId,
      type: 'sample_rate_mismatch',
      severity: 'info',
      description: '采样率 44100 Hz 与建议的专业标准 48000 Hz 略有差异，对本次分析影响不大。',
      reproduceMethod: '1. 使用音频软件(如Audacity)打开文件\n2. 查看文件信息中的采样率字段\n3. 如需统一标准，可使用重采样功能转换至48000Hz\n4. 重新导入分析',
      detectedAt: now - 7200000,
      affectedFrequencies: [],
      suggestedAction: '如需统一标准，可重采样至48000Hz',
      evidence: { actualRate: 44100, expectedRate: 48000 },
    },
    {
      problemId: generateId('prob'),
      batchId,
      type: 'dc_offset',
      severity: 'info',
      description: '检测到轻微直流偏移约 0.8%，建议使用高通滤波器去除以优化动态范围。',
      reproduceMethod: '1. 观察波形图是否整体偏离中心线\n2. 计算信号平均值确认偏移量\n3. 在滤波器中选择高通模式，设置截止频率20Hz\n4. 重新分析处理后的信号',
      detectedAt: now - 7200000,
      magnitude: 0.008,
      affectedFrequencies: [0],
      suggestedAction: '使用高通滤波器（截止20Hz）去除直流分量',
      evidence: { dcOffsetPercent: '0.8' },
    },
  ];
  
  return {
    batch,
    audioFiles: [originalFile, processedFile],
    spectrumBefore,
    spectrumAfter,
    filterParams,
    analysisResult,
    problems,
  };
}

export function generateMockBatchList(): {
  batch: Batch;
  hasIssues: boolean;
  problemCount: number;
}[] {
  return [
    {
      batch: {
        batchId: 'batch_001',
        name: '学生录音_2024级_钢琴练习_01',
        sourceNote: '学生A提交',
        listenerNote: '有电流嗡嗡声',
        createdAt: Date.now() - 86400000,
        status: 'has_issues',
      },
      hasIssues: true,
      problemCount: 3,
    },
    {
      batch: {
        batchId: 'batch_002',
        name: '学生录音_2024级_小提琴_02',
        sourceNote: '学生B提交',
        listenerNote: '环境噪声较大',
        createdAt: Date.now() - 172800000,
        status: 'completed',
      },
      hasIssues: false,
      problemCount: 1,
    },
    {
      batch: {
        batchId: 'batch_003',
        name: '学生录音_2024级_声乐_03',
        sourceNote: '学生C提交',
        listenerNote: '有削波失真',
        createdAt: Date.now() - 259200000,
        status: 'has_issues',
      },
      hasIssues: true,
      problemCount: 2,
    },
    {
      batch: {
        batchId: 'batch_004',
        name: '学生录音_2024级_吉他_04',
        sourceNote: '学生D提交',
        listenerNote: '待分析',
        createdAt: Date.now() - 345600000,
        status: 'pending',
      },
      hasIssues: false,
      problemCount: 0,
    },
    {
      batch: {
        batchId: 'batch_005',
        name: '学生录音_2024级_笛子_05',
        sourceNote: '学生E提交',
        listenerNote: '分析中',
        createdAt: Date.now() - 432000000,
        status: 'analyzing',
      },
      hasIssues: false,
      problemCount: 0,
    },
  ];
}

export function generateMockSpectrumPeaks(): { frequency: number; magnitude: number; label: string }[] {
  return [
    { frequency: 50, magnitude: -35, label: '电源干扰' },
    { frequency: 100, magnitude: -42, label: '二次谐波' },
    { frequency: 150, magnitude: -48, label: '三次谐波' },
    { frequency: 440, magnitude: -28, label: '基频(A4)' },
    { frequency: 880, magnitude: -32, label: '二次泛音' },
    { frequency: 1320, magnitude: -38, label: '三次泛音' },
    { frequency: 1760, magnitude: -45, label: '四次泛音' },
    { frequency: 2640, magnitude: -52, label: '六次泛音' },
  ];
}
