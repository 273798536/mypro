import { ProblemRecord, ProblemType, Severity, AudioFile, FFTSpectrum } from '../types';
import { magnitudeToDB } from './fft';

function generateId(): string {
  return `prob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function detectSampleRateMismatch(
  audioFiles: AudioFile[],
  expectedSampleRate: number = 44100
): ProblemRecord | null {
  const differentRates = new Set(audioFiles.map(f => f.sampleRate));
  if (differentRates.size > 1) {
    const rates = Array.from(differentRates).join(', ');
    return {
      problemId: generateId(),
      batchId: audioFiles[0]?.batchId || '',
      type: 'sample_rate_mismatch',
      severity: 'error',
      description: `检测到多个采样率: ${rates} Hz。所有音频应统一为 ${expectedSampleRate} Hz 以确保分析准确性。`,
      reproduceMethod: '1. 检查所有导入音频的属性\n2. 比较采样率字段\n3. 使用音频编辑器将所有音频重采样至统一采样率\n4. 重新导入分析',
      detectedAt: Date.now(),
      affectedFrequencies: [],
      suggestedAction: '使用音频编辑器将所有音频重采样至同一采样率',
      evidence: { rateCount: differentRates.size, rates },
    };
  }
  
  const firstFile = audioFiles[0];
  if (firstFile && firstFile.sampleRate !== expectedSampleRate) {
    return {
      problemId: generateId(),
      batchId: firstFile.batchId,
      type: 'sample_rate_mismatch',
      severity: 'warning',
      description: `采样率 ${firstFile.sampleRate} Hz 与标准 ${expectedSampleRate} Hz 不符，可能影响频谱分析精度。`,
      reproduceMethod: '1. 使用音频软件打开文件\n2. 查看文件信息中的采样率\n3. 使用重采样功能转换至44100Hz\n4. 重新导入分析',
      detectedAt: Date.now(),
      affectedFrequencies: [],
      suggestedAction: '重采样至标准采样率',
      evidence: { actualRate: firstFile.sampleRate, expectedRate: expectedSampleRate },
    };
  }
  
  return null;
}

export function detectOverFiltering(
  spectrumBefore: FFTSpectrum,
  spectrumAfter: FFTSpectrum
): ProblemRecord | null {
  const dbBefore = magnitudeToDB(spectrumBefore.frequencyData);
  const dbAfter = magnitudeToDB(spectrumAfter.frequencyData);
  
  const binCount = dbBefore.length;
  let flatBins = 0;
  
  for (let i = 0; i < binCount; i++) {
    if (dbAfter[i] < -100 && dbBefore[i] > -60) {
      flatBins++;
    }
  }
  
  const flatRatio = flatBins / binCount;
  
  if (flatRatio > 0.3) {
    const flatPercent = Math.round(flatRatio * 100);
    const affectedFreqs: number[] = [];
    for (let i = 0; i < binCount; i++) {
      if (dbAfter[i] < -100 && dbBefore[i] > -60 && spectrumBefore.binFrequencies[i]) {
        affectedFreqs.push(Math.round(spectrumBefore.binFrequencies[i]));
      }
    }
    return {
      problemId: generateId(),
      batchId: spectrumBefore.batchId || spectrumAfter.batchId || '',
      type: 'over_filtering',
      severity: 'warning',
      description: `检测到过度滤波：约 ${flatPercent}% 的频段被过度衰减，可能导致音频失真或丢失重要信息。`,
      reproduceMethod: '1. 打开滤波器控制面板\n2. 逐步放宽滤波频段范围\n3. 减小滤波强度\n4. 对比A/B试听效果\n5. 观察频谱图中被滤除的频段是否包含有效信号',
      detectedAt: Date.now(),
      affectedFrequencies: affectedFreqs.slice(0, 10),
      suggestedAction: '放宽滤波频段或降低滤波强度',
      evidence: { flatPercent, flatBins, totalBins: binCount },
    };
  }
  
  return null;
}

export function detectFrequencyAliasing(
  spectrum: FFTSpectrum
): ProblemRecord | null {
  const nyquist = spectrum.sampleRate / 2;
  const frequencies = spectrum.binFrequencies;
  const magnitude = magnitudeToDB(spectrum.frequencyData);
  
  const highFreqIndex = frequencies.findIndex(f => f >= nyquist * 0.9);
  if (highFreqIndex === -1) return null;
  
  let highFreqEnergy = 0;
  let totalEnergy = 0;
  
  for (let i = 0; i < magnitude.length; i++) {
    const mag = Math.pow(10, magnitude[i] / 20);
    totalEnergy += mag;
    if (i >= highFreqIndex) {
      highFreqEnergy += mag;
    }
  }
  
  const highFreqRatio = highFreqEnergy / totalEnergy;
  
  if (highFreqRatio > 0.15) {
    return {
      problemId: generateId(),
      batchId: spectrum.batchId || '',
      type: 'frequency_aliasing',
      severity: 'warning',
      description: `高频能量占比过高（${Math.round(highFreqRatio * 100)}%），接近奈奎斯特频率 ${nyquist} Hz，可能存在混叠风险。`,
      reproduceMethod: '1. 查看频谱图高频区域\n2. 检查是否有信号接近奈奎斯特频率处是否有镜像频率\n3. 提高采样率或使用抗混叠滤波\n4. 重新采样分析',
      detectedAt: Date.now(),
      frequency: nyquist,
      affectedFrequencies: [nyquist],
      suggestedAction: '提高采样率或添加抗混叠滤波器',
      evidence: { highFreqRatio: Math.round(highFreqRatio * 100), nyquist },
    };
  }
  
  return null;
}

export function detectHighNoiseFloor(
  spectrum: FFTSpectrum,
  thresholdDB: number = -60
): ProblemRecord | null {
  const magnitude = magnitudeToDB(spectrum.frequencyData);
  
  let lowFreqEnd = Math.floor(magnitude.length * 0.1);
  
  let avgNoise = 0;
  for (let i = 0; i < lowFreqEnd; i++) {
    avgNoise += magnitude[i];
  }
  avgNoise /= lowFreqEnd;
  
  if (avgNoise > thresholdDB) {
    const affectedFreqs: number[] = [];
    for (let i = 0; i < lowFreqEnd; i++) {
      if (magnitude[i] > thresholdDB && spectrum.binFrequencies[i]) {
        affectedFreqs.push(Math.round(spectrum.binFrequencies[i]));
      }
    }
    return {
      problemId: generateId(),
      batchId: spectrum.batchId || '',
      type: 'high_noise_floor',
      severity: avgNoise > -40 ? 'error' : 'warning',
      description: `噪声底过高，平均约 ${avgNoise.toFixed(1)} dB。建议使用降噪算法或改进录音环境。`,
      reproduceMethod: '1. 查看频谱图的低频区域\n2. 观察无信号区域的基底噪声水平\n3. 对比正常信号的噪声水平\n4. 检查录音设备和环境\n5. 应用降噪滤波器',
      detectedAt: Date.now(),
      magnitude: avgNoise,
      affectedFrequencies: affectedFreqs.slice(0, 10),
      suggestedAction: '使用降噪滤波器或改善录音环境',
      evidence: { avgNoise: avgNoise.toFixed(1), thresholdDB },
    };
  }
  
  return null;
}

export function detectDCOffset(signal: Float32Array): ProblemRecord | null {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) {
    sum += signal[i];
  }
  const dcOffset = sum / signal.length;
  
  if (Math.abs(dcOffset) > 0.01) {
    return {
      problemId: generateId(),
      batchId: '',
      type: 'dc_offset',
      severity: 'info',
      description: `检测到直流偏移：${(dcOffset * 100).toFixed(2)}%。这会导致波形不对称，影响动态范围。`,
      reproduceMethod: '1. 观察波形图是否偏离中心线\n2. 计算整个信号的平均值\n3. 使用高通滤波器去除直流分量\n4. 重新分析处理后的信号',
      detectedAt: Date.now(),
      magnitude: dcOffset,
      affectedFrequencies: [0],
      suggestedAction: '使用高通滤波器（截止20Hz）去除直流分量',
      evidence: { dcOffsetPercent: (dcOffset * 100).toFixed(2) },
    };
  }
  
  return null;
}

export function detectClipping(signal: Float32Array): ProblemRecord | null {
  let clipCount = 0;
  const threshold = 0.99;
  
  for (let i = 0; i < signal.length; i++) {
    if (Math.abs(signal[i]) >= threshold) {
      clipCount++;
    }
  }
  
  const clipRatio = clipCount / signal.length;
  
  if (clipRatio > 0.001) {
    return {
      problemId: generateId(),
      batchId: '',
      type: 'clipping',
      severity: clipRatio > 0.01 ? 'error' : 'warning',
      description: `检测到削波失真，约 ${(clipRatio * 100).toFixed(3)}% 的样本达到满幅。`,
      reproduceMethod: '1. 观察波形图顶部/底部是否被削平\n2. 检查信号峰值是否超过阈值\n3. 降低录音增益或使用限制器\n4. 重新录制',
      detectedAt: Date.now(),
      affectedFrequencies: [],
      suggestedAction: '降低录音增益或使用限制器',
      evidence: { clipRatio: (clipRatio * 100).toFixed(3), clipCount },
    };
  }
  
  return null;
}

export function detectAllProblems(
  audioFiles: AudioFile[],
  spectrumBefore?: FFTSpectrum,
  spectrumAfter?: FFTSpectrum
): ProblemRecord[] {
  const problems: ProblemRecord[] = [];
  
  const sampleRateProblem = detectSampleRateMismatch(audioFiles);
  if (sampleRateProblem) problems.push(sampleRateProblem);
  
  if (audioFiles.length > 0) {
    const signal = audioFiles[0].channelData[0];
    const dcProblem = detectDCOffset(signal);
    if (dcProblem) {
      dcProblem.batchId = audioFiles[0].batchId;
      problems.push(dcProblem);
    }
    
    const clipProblem = detectClipping(signal);
    if (clipProblem) {
      clipProblem.batchId = audioFiles[0].batchId;
      problems.push(clipProblem);
    }
  }
  
  if (spectrumBefore) {
    const aliasingProblem = detectFrequencyAliasing(spectrumBefore);
    if (aliasingProblem) {
      aliasingProblem.batchId = audioFiles[0]?.batchId || spectrumBefore.batchId || '';
      problems.push(aliasingProblem);
    }
    
    const noiseProblem = detectHighNoiseFloor(spectrumBefore);
    if (noiseProblem) {
      noiseProblem.batchId = audioFiles[0]?.batchId || spectrumBefore.batchId || '';
      problems.push(noiseProblem);
    }
  }
  
  if (spectrumBefore && spectrumAfter) {
    const overFilterProblem = detectOverFiltering(spectrumBefore, spectrumAfter);
    if (overFilterProblem) {
      overFilterProblem.batchId = audioFiles[0]?.batchId || spectrumBefore.batchId || '';
      problems.push(overFilterProblem);
    }
  }
  
  return problems;
}

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'info': return 'sky';
    case 'warning': return 'amber';
    case 'error': return 'rose';
    case 'critical': return 'rose';
  }
}

export function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'info': return '提示';
    case 'warning': return '警告';
    case 'error': return '错误';
    case 'critical': return '严重';
  }
}
