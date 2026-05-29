import type { Sample, SoundType } from '../types/game';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;

  init(): void {
    if (this.isInitialized) return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
    this.isInitialized = true;
  }

  ensureContext(): void {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playSample(sample: Sample, time?: number): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const startTime = time || this.audioContext.currentTime;
    
    switch (sample.soundType) {
      case 'bass':
        this.playBass(sample.frequency, startTime);
        break;
      case 'snare':
        this.playSnare(startTime);
        break;
      case 'hihat':
        this.playHiHat(startTime);
        break;
      case 'melody':
        this.playMelody(sample.frequency, startTime);
        break;
      case 'fx':
        this.playFX(sample.frequency, startTime);
        break;
    }
  }

  private playBass(frequency: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    filter.type = 'lowpass';
    filter.frequency.value = 500;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  }

  private playSnare(startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(startTime);

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 200;
    oscGain.gain.setValueAtTime(0.3, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.1);
  }

  private playHiHat(startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(startTime);
  }

  private playMelody(frequency: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }

  private playFX(frequency: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 2, startTime + 0.2);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }

  playCollectSound(): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const startTime = this.audioContext.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, startTime);
    osc.frequency.exponentialRampToValueAtTime(880, startTime + 0.1);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }

  playErrorSound(): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const startTime = this.audioContext.currentTime;

    osc.type = 'square';
    osc.frequency.value = 150;

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  playStormSound(): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.3, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }
    noise.buffer = noiseBuffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}

export const audioManager = new AudioManager();
