import { useCallback, useRef, useState } from 'react';
import { AudioAnalysisResult, PeakMarker } from '../types';
import { analyzeAudioBuffer, calculateVoiceEnergies } from '../utils/fftProcessor';
import { validateAudioData, generateDefaultVoiceLabels } from '../utils/audioValidator';
import { useSpectrumStore } from '../store/spectrumStore';

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    setAnalysisResult,
    setIsAnalyzing,
    setAnalysisProgress,
  } = useSpectrumStore();

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const loadAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = getAudioContext();
    return await audioContext.decodeAudioData(arrayBuffer);
  }, [getAudioContext]);

  const analyzeFile = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const audioBuffer = await loadAudioFile(file);

      const { frames, sampleRate, duration } = analyzeAudioBuffer(
        audioBuffer,
        (progress) => setAnalysisProgress(progress)
      );

      const voiceLabels = calculateVoiceEnergies(frames, sampleRate);

      const issues = validateAudioData({
        frames,
        sampleRate,
        duration,
        voiceLabels,
        fileName: file.name,
      });

      const result: AudioAnalysisResult = {
        frames,
        sampleRate,
        duration,
        voiceLabels: voiceLabels.length > 0 ? voiceLabels : generateDefaultVoiceLabels(),
        issues,
        fileName: file.name,
      };

      setAnalysisResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '音频分析失败';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [loadAudioFile, setAnalysisResult, setAnalysisProgress, setIsAnalyzing]);

  const findPeaks = useCallback((result: AudioAnalysisResult, threshold: number = -20): PeakMarker[] => {
    const peaks: PeakMarker[] = [];
    const { frames } = result;

    for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
      const frame = frames[frameIdx];
      for (let freqIdx = 0; freqIdx < frame.frequencies.length; freqIdx++) {
        const energy = frame.frequencies[freqIdx];
        if (energy > threshold) {
          const isLocalMax = true;
          if (freqIdx > 0 && freqIdx < frame.frequencies.length - 1) {
            if (energy <= frame.frequencies[freqIdx - 1] || energy <= frame.frequencies[freqIdx + 1]) {
              continue;
            }
          }
          if (frameIdx > 0 && frameIdx < frames.length - 1) {
            const prevFrame = frames[frameIdx - 1];
            const nextFrame = frames[frameIdx + 1];
            if (freqIdx < prevFrame.frequencies.length && freqIdx < nextFrame.frequencies.length) {
              if (energy <= prevFrame.frequencies[freqIdx] || energy <= nextFrame.frequencies[freqIdx]) {
                continue;
              }
            }
          }

          if (isLocalMax) {
            peaks.push({
              time: frame.time,
              frequency: (freqIdx / frame.frequencies.length) * 20000 + 20,
              energy,
              frameIndex: frameIdx,
              freqIndex: freqIdx,
            });
          }
        }
      }
    }

    return peaks.sort((a, b) => b.energy - a.energy).slice(0, 50);
  }, []);

  const generateDemoData = useCallback((withSampleRateError: boolean = false) => {
    setIsAnalyzing(true);
    setError(null);

    setTimeout(() => {
      const sampleRate = withSampleRateError ? 22050 : 44100;
      const duration = 8;
      const numFrames = 200;
      const numFreqBins = 64;
      const frames = [];

      for (let i = 0; i < numFrames; i++) {
        const time = (i / numFrames) * duration;
        const frequencies: number[] = [];
        let peakFreq = 0;
        let peakEnergy = -100;

        const bassMod = Math.sin(time * 2) * 15 - 30;
        const midMod = Math.sin(time * 3.5 + 1) * 20 - 25;
        const highMod = Math.sin(time * 5 + 2) * 25 - 35;

        for (let f = 0; f < numFreqBins; f++) {
          const freqRatio = f / numFreqBins;
          let baseEnergy = -60 + Math.random() * 10;

          if (freqRatio < 0.15) {
            baseEnergy = bassMod + Math.random() * 5;
          } else if (freqRatio < 0.4) {
            baseEnergy = midMod + Math.random() * 8;
          } else if (freqRatio < 0.75) {
            baseEnergy = highMod + Math.random() * 10;
          } else {
            baseEnergy = -40 + Math.random() * 15;
          }

          if (withSampleRateError && i > 80 && i < 120 && freqRatio > 0.6) {
            baseEnergy = Math.min(-0.3, baseEnergy + 40);
          }

          if (!withSampleRateError && i > 150 && i < 155) {
            baseEnergy = -55 + Math.random() * 5;
          }

          if (baseEnergy > peakEnergy) {
            peakEnergy = baseEnergy;
            peakFreq = freqRatio * 20000 + 20;
          }

          frequencies.push(baseEnergy);
        }

        frames.push({
          time,
          frequencies,
          peakFrequency: peakFreq,
          peakEnergy,
        });
      }

      const voiceLabels = calculateVoiceEnergies(frames, sampleRate);

      const issues = validateAudioData({
        frames,
        sampleRate,
        duration,
        voiceLabels,
        fileName: withSampleRateError ? 'demo_samplerate_error.wav' : 'demo_normal.wav',
      });

      const result: AudioAnalysisResult = {
        frames,
        sampleRate,
        duration,
        voiceLabels,
        issues,
        fileName: withSampleRateError ? 'demo_samplerate_error.wav' : 'demo_normal.wav',
      };

      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 800);
  }, [setAnalysisResult, setIsAnalyzing]);

  return {
    analyzeFile,
    findPeaks,
    generateDemoData,
    error,
    getAudioContext,
  };
}
