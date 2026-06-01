import { FilterType, FFTSpectrum } from '../types';
import { FFT, createWindow, applyWindow, computeMagnitude } from './fft';

export function createFilterKernel(
  filterType: FilterType,
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  order: number
): Float32Array {
  const kernelSize = order + 1;
  const kernel = new Float32Array(kernelSize);
  const center = Math.floor(kernelSize / 2);
  const nyquist = sampleRate / 2;
  
  const lowNorm = lowFreq / nyquist;
  const highNorm = highFreq / nyquist;
  
  for (let n = 0; n < kernelSize; n++) {
    const k = n - center;
    
    if (k === 0) {
      switch (filterType) {
        case 'lowpass':
          kernel[n] = 2 * highNorm;
          break;
        case 'highpass':
          kernel[n] = 1 - 2 * lowNorm;
          break;
        case 'bandpass':
          kernel[n] = 2 * (highNorm - lowNorm);
          break;
        case 'notch':
          kernel[n] = 1 - 2 * (highNorm - lowNorm);
          break;
      }
    } else {
      const piK = Math.PI * k;
      switch (filterType) {
        case 'lowpass':
          kernel[n] = Math.sin(2 * piK * highNorm) / piK;
          break;
        case 'highpass':
          kernel[n] = -Math.sin(2 * piK * lowNorm) / piK;
          break;
        case 'bandpass':
          kernel[n] = (Math.sin(2 * piK * highNorm) - Math.sin(2 * piK * lowNorm)) / piK;
          break;
        case 'notch':
          kernel[n] = (Math.sin(2 * piK * lowNorm) - Math.sin(2 * piK * highNorm)) / piK;
          break;
      }
    }
  }
  
  const window = createWindow(kernelSize, 'hann');
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] *= window[i];
  }
  
  return kernel;
}

export function applyFilter(
  signal: Float32Array,
  filterType: FilterType,
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  order: number
): Float32Array {
  const kernel = createFilterKernel(filterType, lowFreq, highFreq, sampleRate, order);
  const result = new Float32Array(signal.length);
  const kernelLength = kernel.length;
  const halfLength = Math.floor(kernelLength / 2);
  
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    for (let j = 0; j < kernelLength; j++) {
      const signalIndex = i - halfLength + j;
      if (signalIndex >= 0 && signalIndex < signal.length) {
        sum += signal[signalIndex] * kernel[j];
      }
    }
    result[i] = sum;
  }
  
  return result;
}

export function applyFrequencyDomainFilter(
  signal: Float32Array,
  filterType: FilterType,
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  fftSize: number = 4096
): Float32Array {
  const fft = new FFT(fftSize);
  const window = createWindow(fftSize, 'hann');
  const result = new Float32Array(signal.length);
  const hopSize = fftSize / 2;
  
  const nyquist = sampleRate / 2;
  const lowBin = Math.floor((lowFreq / nyquist) * (fftSize / 2));
  const highBin = Math.floor((highFreq / nyquist) * (fftSize / 2));
  
  const filterMask = new Float32Array(fftSize / 2 + 1);
  for (let i = 0; i < filterMask.length; i++) {
    switch (filterType) {
      case 'lowpass':
        filterMask[i] = i <= highBin ? 1 : 0;
        break;
      case 'highpass':
        filterMask[i] = i >= lowBin ? 1 : 0;
        break;
      case 'bandpass':
        filterMask[i] = (i >= lowBin && i <= highBin) ? 1 : 0;
        break;
      case 'notch':
        filterMask[i] = (i >= lowBin && i <= highBin) ? 0 : 1;
        break;
    }
  }
  
  let overlapBuffer = new Float32Array(fftSize);
  
  for (let start = 0; start < signal.length; start += hopSize) {
    const frame = new Float32Array(fftSize);
    const copyLength = Math.min(fftSize, signal.length - start);
    frame.set(signal.subarray(start, start + copyLength));
    
    const windowed = applyWindow(frame, window);
    const real = new Float32Array(windowed);
    const imag = new Float32Array(fftSize);
    
    fft.forward(real, imag);
    
    for (let i = 0; i <= fftSize / 2; i++) {
      const mask = filterMask[i];
      real[i] *= mask;
      imag[i] *= mask;
      
      if (i > 0 && i < fftSize / 2) {
        real[fftSize - i] *= mask;
        imag[fftSize - i] *= mask;
      }
    }
    
    fft.inverse(real, imag);
    
    for (let i = 0; i < fftSize; i++) {
      const outputIndex = start + i;
      if (outputIndex < result.length) {
        result[outputIndex] += real[i] * window[i];
      }
    }
  }
  
  const windowSum = new Float32Array(signal.length);
  for (let start = 0; start < signal.length; start += hopSize) {
    for (let i = 0; i < fftSize && start + i < signal.length; i++) {
      windowSum[start + i] += window[i] * window[i];
    }
  }
  
  for (let i = 0; i < result.length; i++) {
    if (windowSum[i] > 0.001) {
      result[i] /= windowSum[i];
    }
  }
  
  return result;
}

export function computeWaveformDifference(
  original: Float32Array,
  processed: Float32Array
): number[] {
  const length = Math.min(original.length, processed.length);
  const diff: number[] = [];
  const step = Math.max(1, Math.floor(length / 500));
  
  for (let i = 0; i < length; i += step) {
    diff.push(Math.abs(original[i] - processed[i]));
  }
  
  return diff;
}

export function getFrequencyResponse(
  filterType: FilterType,
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  fftSize: number = 1024
): { frequencies: number[]; magnitude: number[] } {
  const kernel = createFilterKernel(filterType, lowFreq, highFreq, sampleRate, 511);
  const padded = new Float32Array(fftSize);
  padded.set(kernel.subarray(0, Math.min(kernel.length, fftSize)));
  
  const fft = new FFT(fftSize);
  const real = new Float32Array(padded);
  const imag = new Float32Array(fftSize);
  
  fft.forward(real, imag);
  const magnitude = computeMagnitude(real, imag);
  
  const binWidth = sampleRate / fftSize;
  const frequencies: number[] = [];
  const magDB: number[] = [];
  
  for (let i = 0; i < magnitude.length; i++) {
    frequencies.push(i * binWidth);
    const db = 20 * Math.log10(Math.max(magnitude[i], 1e-10));
    magDB.push(Math.max(db, -120));
  }
  
  return { frequencies, magnitude: magDB };
}
