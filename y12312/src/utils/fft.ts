import { WindowType } from '../types';

export class FFT {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private reverseTable: Uint32Array;

  constructor(size: number) {
    if ((size & (size - 1)) !== 0) {
      throw new Error('FFT size must be a power of 2');
    }
    this.size = size;
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    this.reverseTable = new Uint32Array(size);

    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos((2 * Math.PI * i) / size);
      this.sinTable[i] = Math.sin((2 * Math.PI * i) / size);
    }

    let limit = 1;
    let bit = size / 2;
    while (limit < size) {
      for (let i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit <<= 1;
      bit >>= 1;
    }
  }

  forward(real: Float32Array, imag: Float32Array): void {
    const { size, cosTable, sinTable, reverseTable } = this;

    for (let i = 0; i < size; i++) {
      const j = reverseTable[i];
      if (j > i) {
        const tempReal = real[i];
        const tempImag = imag[i];
        real[i] = real[j];
        imag[i] = imag[j];
        real[j] = tempReal;
        imag[j] = tempImag;
      }
    }

    let halfSize = 1;
    while (halfSize < size) {
      const phaseShiftStepReal = cosTable[halfSize];
      const phaseShiftStepImag = -sinTable[halfSize];
      let currentPhaseShiftReal = 1;
      let currentPhaseShiftImag = 0;

      for (let fftStep = 0; fftStep < halfSize; fftStep++) {
        for (let i = fftStep; i < size; i += halfSize * 2) {
          const off = i + halfSize;
          const tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
          const ti = currentPhaseShiftImag * real[off] + currentPhaseShiftReal * imag[off];
          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;
        }
        const tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
      }
      halfSize <<= 1;
    }
  }

  inverse(real: Float32Array, imag: Float32Array): void {
    for (let i = 0; i < this.size; i++) {
      imag[i] = -imag[i];
    }
    this.forward(real, imag);
    for (let i = 0; i < this.size; i++) {
      real[i] /= this.size;
      imag[i] /= -this.size;
    }
  }

  getSize(): number {
    return this.size;
  }
}

export function createWindow(size: number, type: WindowType): Float32Array {
  const window = new Float32Array(size);
  const N = size;

  switch (type) {
    case 'hann':
      for (let n = 0; n < N; n++) {
        window[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
      }
      break;
    case 'hamming':
      for (let n = 0; n < N; n++) {
        window[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
      }
      break;
    case 'blackman':
      for (let n = 0; n < N; n++) {
        window[n] = 
          0.42 
          - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) 
          + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1));
      }
      break;
    case 'rectangular':
    default:
      window.fill(1);
      break;
  }

  return window;
}

export function applyWindow(signal: Float32Array, window: Float32Array): Float32Array {
  const result = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    result[i] = signal[i] * window[i];
  }
  return result;
}

export function computeMagnitude(real: Float32Array, imag: Float32Array): Float32Array {
  const size = real.length / 2 + 1;
  const magnitude = new Float32Array(size);
  
  for (let i = 0; i < size; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  
  return magnitude;
}

export function magnitudeToDB(magnitude: Float32Array, reference: number = 1): Float32Array {
  const db = new Float32Array(magnitude.length);
  const minDB = -120;
  
  for (let i = 0; i < magnitude.length; i++) {
    const value = 20 * Math.log10(Math.max(magnitude[i] / reference, 1e-10));
    db[i] = Math.max(value, minDB);
  }
  
  return db;
}

export function computeBinFrequencies(fftSize: number, sampleRate: number): number[] {
  const frequencies: number[] = [];
  const binCount = fftSize / 2 + 1;
  const binWidth = sampleRate / fftSize;
  
  for (let i = 0; i < binCount; i++) {
    frequencies.push(i * binWidth);
  }
  
  return frequencies;
}

export function computeSpectrum(
  signal: Float32Array,
  fftSize: number,
  windowType: WindowType,
  sampleRate: number
): { magnitude: Float32Array; binFrequencies: number[]; timeData: Float32Array } {
  const window = createWindow(fftSize, windowType);
  const fft = new FFT(fftSize);
  
  const paddedSignal = new Float32Array(fftSize);
  const copyLength = Math.min(signal.length, fftSize);
  paddedSignal.set(signal.subarray(0, copyLength));
  
  const windowedSignal = applyWindow(paddedSignal, window);
  
  const real = new Float32Array(windowedSignal);
  const imag = new Float32Array(fftSize);
  
  fft.forward(real, imag);
  
  const magnitude = computeMagnitude(real, imag);
  const binFrequencies = computeBinFrequencies(fftSize, sampleRate);
  
  return {
    magnitude,
    binFrequencies,
    timeData: windowedSignal,
  };
}

export function computeAverageSpectrum(
  signal: Float32Array,
  fftSize: number,
  windowType: WindowType,
  sampleRate: number,
  overlap: number = 0.5
): { magnitude: Float32Array; binFrequencies: number[] } {
  const hopSize = Math.floor(fftSize * (1 - overlap));
  const numFrames = Math.floor((signal.length - fftSize) / hopSize) + 1;
  
  if (numFrames <= 1) {
    return computeSpectrum(signal, fftSize, windowType, sampleRate);
  }
  
  const window = createWindow(fftSize, windowType);
  const fft = new FFT(fftSize);
  const binCount = fftSize / 2 + 1;
  const avgMagnitude = new Float32Array(binCount);
  
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize;
    const frameData = signal.subarray(start, start + fftSize);
    
    const windowed = applyWindow(frameData, window);
    const real = new Float32Array(windowed);
    const imag = new Float32Array(fftSize);
    
    fft.forward(real, imag);
    const magnitude = computeMagnitude(real, imag);
    
    for (let i = 0; i < binCount; i++) {
      avgMagnitude[i] += magnitude[i];
    }
  }
  
  for (let i = 0; i < binCount; i++) {
    avgMagnitude[i] /= numFrames;
  }
  
  return {
    magnitude: avgMagnitude,
    binFrequencies: computeBinFrequencies(fftSize, sampleRate),
  };
}
