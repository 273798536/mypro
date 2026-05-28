import type { FFTSpectrum } from '../types';

export class FFT {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private reverseTable: Int32Array;

  constructor(size: number) {
    this.size = size;
    
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos(2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(2 * Math.PI * i / size);
    }

    this.reverseTable = new Int32Array(size);
    const power = Math.log2(size);
    for (let i = 0; i < size; i++) {
      this.reverseTable[i] = this.reverseBits(i, power);
    }
  }

  private reverseBits(value: number, power: number): number {
    let reversed = 0;
    for (let i = 0; i < power; i++) {
      reversed = (reversed << 1) | (value & 1);
      value >>= 1;
    }
    return reversed;
  }

  transform(real: Float32Array, imag: Float32Array): void {
    const n = this.size;

    for (let i = 0; i < n; i++) {
      const j = this.reverseTable[i];
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }

    let size = 2;
    while (size <= n) {
      const halfSize = size / 2;
      const tableStep = n / size;

      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const idx = j * tableStep;
          const cos = this.cosTable[idx];
          const sin = this.sinTable[idx];
          
          const evenReal = real[i + j];
          const evenImag = imag[i + j];
          const oddReal = cos * real[i + j + halfSize] + sin * imag[i + j + halfSize];
          const oddImag = -sin * real[i + j + halfSize] + cos * imag[i + j + halfSize];

          real[i + j] = evenReal + oddReal;
          imag[i + j] = evenImag + oddImag;
          real[i + j + halfSize] = evenReal - oddReal;
          imag[i + j + halfSize] = evenImag - oddImag;
        }
      }
      size <<= 1;
    }
  }

  getMagnitudes(real: Float32Array, imag: Float32Array): Float32Array {
    const magnitudes = new Float32Array(this.size / 2);
    for (let i = 0; i < this.size / 2; i++) {
      magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (this.size / 2);
    }
    return magnitudes;
  }
}

export function nextPowerOfTwo(value: number): number {
  return Math.pow(2, Math.ceil(Math.log2(value)));
}

export function applyWindow(data: Float32Array, windowType: 'hann' | 'hamming' | 'blackman' = 'hann'): Float32Array {
  const n = data.length;
  const windowed = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    let windowValue: number;
    
    switch (windowType) {
      case 'hamming':
        windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
        break;
      case 'blackman':
        windowValue = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (n - 1));
        break;
      case 'hann':
      default:
        windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
        break;
    }
    
    windowed[i] = data[i] * windowValue;
  }

  return windowed;
}

export function computeFFT(
  audioData: Float32Array,
  sampleRate: number,
  fftSize: number = 2048
): FFTSpectrum {
  const paddedData = new Float32Array(fftSize);
  const copyLength = Math.min(audioData.length, fftSize);
  paddedData.set(audioData.subarray(0, copyLength));

  const windowedData = applyWindow(paddedData, 'hann');

  const real = new Float32Array(windowedData);
  const imag = new Float32Array(fftSize).fill(0);

  const fft = new FFT(fftSize);
  fft.transform(real, imag);

  const magnitudes = fft.getMagnitudes(real, imag);
  const frequencies = new Float32Array(magnitudes.length);
  
  const freqResolution = sampleRate / fftSize;
  for (let i = 0; i < magnitudes.length; i++) {
    frequencies[i] = i * freqResolution;
  }

  return {
    frequencies,
    magnitudes,
    sampleRate,
    binCount: magnitudes.length
  };
}
