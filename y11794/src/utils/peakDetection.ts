import type { FrequencyPeak } from '../types';

export interface PeakDetectionOptions {
  threshold: number;
  minDistance: number;
  maxPeaks: number;
}

const defaultOptions: PeakDetectionOptions = {
  threshold: 0.1,
  minDistance: 3,
  maxPeaks: 10
};

export function findPeaks(
  frequencies: Float32Array,
  magnitudes: Float32Array,
  options: Partial<PeakDetectionOptions> = {}
): FrequencyPeak[] {
  const opt = { ...defaultOptions, ...options };
  const peaks: FrequencyPeak[] = [];
  const n = magnitudes.length;

  if (n < 3) return peaks;

  const maxMagnitude = Math.max(...Array.from(magnitudes));
  const normalizedThreshold = opt.threshold * maxMagnitude;

  for (let i = 1; i < n - 1; i++) {
    if (magnitudes[i] > normalizedThreshold &&
        magnitudes[i] > magnitudes[i - 1] &&
        magnitudes[i] >= magnitudes[i + 1]) {
      
      let isLocalMax = true;
      for (let j = Math.max(0, i - opt.minDistance); j < Math.min(n, i + opt.minDistance + 1); j++) {
        if (j !== i && magnitudes[j] > magnitudes[i]) {
          isLocalMax = false;
          break;
        }
      }

      if (isLocalMax) {
        const interpolatedFreq = interpolatePeakFrequency(frequencies, magnitudes, i);
        
        peaks.push({
          frequency: interpolatedFreq,
          amplitude: magnitudes[i],
          isNoise: false,
          index: i
        });
      }
    }
  }

  peaks.sort((a, b) => b.amplitude - a.amplitude);
  return peaks.slice(0, opt.maxPeaks);
}

function interpolatePeakFrequency(
  frequencies: Float32Array,
  magnitudes: Float32Array,
  peakIndex: number
): number {
  if (peakIndex <= 0 || peakIndex >= magnitudes.length - 1) {
    return frequencies[peakIndex];
  }

  const y0 = magnitudes[peakIndex - 1];
  const y1 = magnitudes[peakIndex];
  const y2 = magnitudes[peakIndex + 1];

  const denominator = 2 * (y0 - 2 * y1 + y2);
  if (Math.abs(denominator) < 1e-10) {
    return frequencies[peakIndex];
  }

  const offset = (y0 - y2) / denominator;
  const binWidth = frequencies[1] - frequencies[0];

  return frequencies[peakIndex] + offset * binWidth;
}

export function filterNoisePeaks(
  peaks: FrequencyPeak[],
  noiseThreshold: number,
  maxMagnitude: number
): FrequencyPeak[] {
  const absoluteThreshold = noiseThreshold * maxMagnitude;
  
  return peaks.map(peak => ({
    ...peak,
    isNoise: peak.amplitude < absoluteThreshold
  }));
}

export function findDominantPeak(
  peaks: FrequencyPeak[],
  excludeNoise: boolean = true
): FrequencyPeak | null {
  const validPeaks = excludeNoise ? peaks.filter(p => !p.isNoise) : peaks;
  
  if (validPeaks.length === 0) {
    return peaks.length > 0 ? peaks[0] : null;
  }

  return validPeaks.reduce((dominant, peak) => 
    peak.amplitude > dominant.amplitude ? peak : dominant
  );
}

export function calculateSNR(
  magnitudes: Float32Array,
  peakIndex: number,
  peakWindow: number = 5
): number {
  const peakMagnitude = magnitudes[peakIndex];
  
  let noiseSum = 0;
  let noiseCount = 0;

  for (let i = 0; i < magnitudes.length; i++) {
    if (Math.abs(i - peakIndex) > peakWindow) {
      noiseSum += magnitudes[i];
      noiseCount++;
    }
  }

  if (noiseCount === 0) return Infinity;

  const noiseAvg = noiseSum / noiseCount;
  if (noiseAvg === 0) return Infinity;

  return peakMagnitude / noiseAvg;
}
