import { SpectrumFrame, VOICE_RANGES, VoiceLabel } from '../types';

export const FFT_SIZE = 2048;
export const HOP_SIZE = 512;
export const NUM_FREQ_BINS = 128;

export function linearToDb(value: number): number {
  if (value <= 0) return -100;
  return 20 * Math.log10(value);
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function freqToBinIndex(freq: number, sampleRate: number, fftSize: number): number {
  const nyquist = sampleRate / 2;
  return Math.round((freq / nyquist) * (fftSize / 2));
}

export function binIndexToFreq(binIndex: number, sampleRate: number, fftSize: number): number {
  const nyquist = sampleRate / 2;
  return (binIndex / (fftSize / 2)) * nyquist;
}

export function generateLogFreqBins(
  minFreq: number,
  maxFreq: number,
  numBins: number,
  sampleRate: number,
  fftSize: number
): Array<{ startBin: number; endBin: number; centerFreq: number }> {
  const bins: Array<{ startBin: number; endBin: number; centerFreq: number }> = [];
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const logStep = (logMax - logMin) / numBins;

  for (let i = 0; i < numBins; i++) {
    const freqStart = Math.pow(10, logMin + i * logStep);
    const freqEnd = Math.pow(10, logMin + (i + 1) * logStep);
    const centerFreq = Math.sqrt(freqStart * freqEnd);

    const startBin = Math.max(0, freqToBinIndex(freqStart, sampleRate, fftSize));
    const endBin = Math.min(fftSize / 2 - 1, freqToBinIndex(freqEnd, sampleRate, fftSize));

    bins.push({ startBin, endBin, centerFreq });
  }

  return bins;
}

export function processFFTFrame(
  timeDomainData: Float32Array,
  sampleRate: number,
  fftSize: number = FFT_SIZE,
  numFreqBins: number = NUM_FREQ_BINS
): { frequencies: number[]; peakFrequency: number; peakEnergy: number } {
  const nyquist = sampleRate / 2;
  const numBins = fftSize / 2;

  const imaginary = new Float32Array(fftSize);
  const real = new Float32Array(timeDomainData);

  for (let i = 0; i < fftSize; i++) {
    if (i < timeDomainData.length) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      real[i] = timeDomainData[i] * window;
    } else {
      real[i] = 0;
    }
    imaginary[i] = 0;
  }

  fft(real, imaginary);

  const magnitudes = new Float32Array(numBins);
  for (let i = 0; i < numBins; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imaginary[i] * imaginary[i]) / (fftSize / 2);
  }

  const logBins = generateLogFreqBins(20, 20000, numFreqBins, sampleRate, fftSize);
  const frequencies: number[] = [];
  let peakEnergy = -100;
  let peakFreq = 0;

  for (let i = 0; i < logBins.length; i++) {
    const { startBin, endBin, centerFreq } = logBins[i];
    let sum = 0;
    let count = 0;

    for (let j = startBin; j <= endBin; j++) {
      sum += magnitudes[j];
      count++;
    }

    const avgMagnitude = count > 0 ? sum / count : 0;
    const db = linearToDb(avgMagnitude);
    frequencies.push(db);

    if (db > peakEnergy) {
      peakEnergy = db;
      peakFreq = centerFreq;
    }
  }

  return {
    frequencies,
    peakFrequency: peakFreq,
    peakEnergy,
  };
}

export function analyzeAudioBuffer(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number) => void
): { frames: SpectrumFrame[]; sampleRate: number; duration: number } {
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const channelData = audioBuffer.getChannelData(0);

  const frames: SpectrumFrame[] = [];
  const totalSamples = channelData.length;
  const numFrames = Math.floor((totalSamples - FFT_SIZE) / HOP_SIZE) + 1;

  for (let i = 0; i < numFrames; i++) {
    const startSample = i * HOP_SIZE;
    const endSample = Math.min(startSample + FFT_SIZE, totalSamples);
    const frameData = channelData.slice(startSample, endSample);

    const result = processFFTFrame(frameData, sampleRate);
    const time = (startSample + FFT_SIZE / 2) / sampleRate;

    frames.push({
      time,
      frequencies: result.frequencies,
      peakFrequency: result.peakFrequency,
      peakEnergy: result.peakEnergy,
    });

    if (onProgress && i % 10 === 0) {
      onProgress(i / numFrames);
    }
  }

  if (onProgress) {
    onProgress(1);
  }

  return { frames, sampleRate, duration };
}

export function calculateVoiceEnergies(
  frames: SpectrumFrame[],
  sampleRate: number
): VoiceLabel[] {
  if (frames.length === 0) {
    return VOICE_RANGES.map(v => ({ ...v, energy: -60 }));
  }

  const voiceEnergies: number[] = new Array(VOICE_RANGES.length).fill(-100);

  for (const frame of frames) {
    for (let v = 0; v < VOICE_RANGES.length; v++) {
      const voice = VOICE_RANGES[v];
      let voiceEnergy = -100;
      let count = 0;

      for (let f = 0; f < frame.frequencies.length; f++) {
        const freq = binIndexToFreq(f, sampleRate, FFT_SIZE);
        if (freq >= voice.freqRange[0] && freq <= voice.freqRange[1]) {
          voiceEnergy = Math.max(voiceEnergy, frame.frequencies[f]);
          count++;
        }
      }

      if (count > 0) {
        voiceEnergies[v] = Math.max(voiceEnergies[v], voiceEnergy);
      }
    }
  }

  return VOICE_RANGES.map((voice, i) => ({
    ...voice,
    energy: voiceEnergies[i] < -99 ? -60 : voiceEnergies[i],
  }));
}

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  const bits = Math.log2(n);

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len / 2;
    const wLenReal = Math.cos((-2 * Math.PI) / len);
    const wLenImag = Math.sin((-2 * Math.PI) / len);

    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;

      for (let j = 0; j < halfLen; j++) {
        const uReal = real[i + j];
        const uImag = imag[i + j];
        const tReal = wReal * real[i + j + halfLen] - wImag * imag[i + j + halfLen];
        const tImag = wReal * imag[i + j + halfLen] + wImag * real[i + j + halfLen];

        real[i + j] = uReal + tReal;
        imag[i + j] = uImag + tImag;
        real[i + j + halfLen] = uReal - tReal;
        imag[i + j + halfLen] = uImag - tImag;

        const nextWReal = wReal * wLenReal - wImag * wLenImag;
        const nextWImag = wReal * wLenImag + wImag * wLenReal;
        wReal = nextWReal;
        wImag = nextWImag;
      }
    }
  }
}
