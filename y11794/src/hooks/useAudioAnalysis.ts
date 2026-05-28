import { useCallback, useRef } from 'react';
import { useAnalysisStore, createAnomaly, createCorrection } from '../store/analysisStore';
import { computeFFT } from '../utils/fft';
import { findPeaks, filterNoisePeaks, findDominantPeak, calculateSNR } from '../utils/peakDetection';
import { calculateDopplerShift, checkDirectionConsistency } from '../utils/doppler';
import type { AudioData, Direction, FrequencyPeak } from '../types';

export function useAudioAnalysis() {
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const {
    setAudioData,
    setSpectrum,
    setIsAnalyzing,
    parameters,
    createNewRecord,
    updateRecordResults,
    addAnomaly,
    updateRecordStatus,
    setCurrentRecord,
    currentRecord
  } = useAnalysisStore();

  const loadAudioFile = useCallback(async (file: File): Promise<AudioData | null> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = new Float32Array(channelData);
      
      const audioData: AudioData = {
        buffer: audioBuffer,
        waveform: samples,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration
      };
      
      setAudioData(audioData);
      
      createNewRecord({
        fileName: file.name,
        fileSize: file.size,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        importedFrom: 'local_file'
      });
      
      return audioData;
    } catch (error) {
      console.error('Error loading audio file:', error);
      return null;
    }
  }, [setAudioData, createNewRecord]);

  const checkSampleRateMismatch = useCallback((fileSampleRate: number, configSampleRate: number): boolean => {
    const mismatch = Math.abs(fileSampleRate - configSampleRate) > 1;
    
    if (mismatch && currentRecord) {
      const anomaly = createAnomaly(
        'sample_rate_mismatch',
        'error',
        `采样率不匹配：文件采样率 ${fileSampleRate} Hz ≠ 配置采样率 ${configSampleRate} Hz`,
        '请根据文件实际采样率修正配置，或重新采样音频文件'
      );
      addAnomaly(currentRecord.id, anomaly);
    }
    
    return mismatch;
  }, [currentRecord, addAnomaly]);

  const analyzeAudio = useCallback((audioData: AudioData): {
    spectrum: ReturnType<typeof computeFFT>;
    peaks: FrequencyPeak[];
    dominantPeak: FrequencyPeak | null;
  } | null => {
    if (!currentRecord) return null;
    
    setIsAnalyzing(true);
    updateRecordStatus(currentRecord.id, 'calculating');

    try {
      const hasMismatch = checkSampleRateMismatch(audioData.sampleRate, parameters.sampleRate);
      
      const fftSize = 4096;
      const spectrum = computeFFT(audioData.waveform, audioData.sampleRate, fftSize);
      setSpectrum(spectrum);

      const peaks = findPeaks(spectrum.frequencies, spectrum.magnitudes, {
        threshold: 0.05,
        minDistance: 10,
        maxPeaks: 20
      });

      const maxMagnitude = Math.max(...Array.from(spectrum.magnitudes));
      const filteredPeaks = filterNoisePeaks(peaks, parameters.noiseThreshold, maxMagnitude);

      const noisePeaks = filteredPeaks.filter(p => p.isNoise);
      if (noisePeaks.length > 0) {
        const anomaly = createAnomaly(
          'noise_peak',
          'warning',
          `检测到 ${noisePeaks.length} 个噪声峰，已自动过滤`,
          '可以尝试提高噪声阈值以减少干扰，或检查音频质量'
        );
        addAnomaly(currentRecord.id, anomaly);
      }

      const dominantPeak = findDominantPeak(filteredPeaks, true);

      if (dominantPeak) {
        const snr = calculateSNR(spectrum.magnitudes, dominantPeak.index, 10);
        
        if (snr < 2) {
          const anomaly = createAnomaly(
            'low_confidence',
            'warning',
            `信噪比偏低 (${snr.toFixed(2)}:1)，结果可能不可靠`,
            '建议使用更清晰的音频样本，或调整噪声阈值'
          );
          addAnomaly(currentRecord.id, anomaly);
        }

        const dopplerResult = calculateDopplerShift(
          parameters.baseFrequency,
          dominantPeak.frequency,
          parameters.direction
        );

        const { isConsistent, detectedDirection } = checkDirectionConsistency(
          dominantPeak.frequency,
          parameters.baseFrequency,
          parameters.direction
        );

        if (!isConsistent) {
          const anomaly = createAnomaly(
            'direction_error',
            'error',
            `方向符号可能错误：根据频移检测到${detectedDirection === 'approaching' ? '靠近' : '远离'}，但配置为${parameters.direction === 'approaching' ? '靠近' : '远离'}`,
            `建议将移动方向切换为"${detectedDirection === 'approaching' ? '靠近观察者' : '远离观察者'}"`
          );
          addAnomaly(currentRecord.id, anomaly);
        }

        updateRecordResults(currentRecord.id, {
          observedFrequency: dopplerResult.observedFrequency,
          frequencyShift: dopplerResult.frequencyShift,
          velocity: dopplerResult.velocity,
          confidence: dopplerResult.confidence,
          peaks: filteredPeaks
        });

        updateRecordStatus(currentRecord.id, 'completed');
      } else {
        const anomaly = createAnomaly(
          'low_confidence',
          'error',
          '未检测到有效的频率峰值',
          '请检查音频文件是否包含有效的信号，或降低噪声阈值'
        );
        addAnomaly(currentRecord.id, anomaly);
        updateRecordStatus(currentRecord.id, 'error');
      }

      setIsAnalyzing(false);
      return { spectrum, peaks: filteredPeaks, dominantPeak };
    } catch (error) {
      console.error('Error analyzing audio:', error);
      updateRecordStatus(currentRecord.id, 'error');
      setIsAnalyzing(false);
      return null;
    }
  }, [
    currentRecord,
    parameters,
    setIsAnalyzing,
    setSpectrum,
    checkSampleRateMismatch,
    addAnomaly,
    updateRecordResults,
    updateRecordStatus
  ]);

  const correctParameter = useCallback((field: string, newValue: number | string, reason: string) => {
    if (!currentRecord) return;
    
    const oldValue = field === 'direction' 
      ? parameters.direction
      : parameters[field as keyof typeof parameters];
    
    const correction = createCorrection(field, oldValue, newValue, reason);
    addAnomaly(currentRecord.id, {
      type: 'low_confidence',
      severity: 'warning',
      message: `修正参数: ${field}`,
      suggestion: reason,
      timestamp: Date.now()
    });
    
    useAnalysisStore.getState().addCorrection(currentRecord.id, correction);
  }, [currentRecord, parameters, addAnomaly]);

  return {
    loadAudioFile,
    analyzeAudio,
    correctParameter
  };
}
