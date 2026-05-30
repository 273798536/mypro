type MusicianRole = 'melody' | 'chord' | 'bass' | 'percussion';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {}

  init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeat(musicianRole: MusicianRole, volume: number, beatDuration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const normalizedVolume = volume / 100;
    const roleGain = this.ctx.createGain();
    roleGain.gain.value = normalizedVolume;
    roleGain.connect(this.masterGain);

    switch (musicianRole) {
      case 'melody':
        this.playMelody(roleGain, beatDuration);
        break;
      case 'chord':
        this.playChord(roleGain, beatDuration);
        break;
      case 'bass':
        this.playBass(roleGain, beatDuration);
        break;
      case 'percussion':
        this.playPercussion(roleGain, beatDuration);
        break;
    }
  }

  private playMelody(destination: GainNode, beatDuration: number): void {
    if (!this.ctx) return;
    const duration = 0.3 * beatDuration;
    const now = this.ctx.currentTime;

    const sine = this.ctx.createOscillator();
    sine.type = 'sine';
    sine.frequency.value = 440;

    const square = this.ctx.createOscillator();
    square.type = 'square';
    square.frequency.value = 440;

    const mixGain = this.ctx.createGain();
    mixGain.gain.setValueAtTime(0, now);
    mixGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    mixGain.gain.linearRampToValueAtTime(0, now + duration);

    sine.connect(mixGain);
    square.connect(mixGain);
    mixGain.connect(destination);

    sine.start(now);
    square.start(now);
    sine.stop(now + duration);
    square.stop(now + duration);
  }

  private playChord(destination: GainNode, beatDuration: number): void {
    if (!this.ctx) return;
    const duration = 0.25 * beatDuration;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 330;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    envGain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(envGain);
    envGain.connect(destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playBass(destination: GainNode, beatDuration: number): void {
    if (!this.ctx) return;
    const duration = 0.35 * beatDuration;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(0.6, now + 0.015);
    envGain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(envGain);
    envGain.connect(destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playPercussion(destination: GainNode, beatDuration: number): void {
    if (!this.ctx) return;
    const duration = 0.1 * beatDuration;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(1, now);
    envGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(envGain);
    envGain.connect(destination);

    source.start(now);
    source.stop(now + duration);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stop(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}

const audioEngine = new AudioEngine();

export { AudioEngine, audioEngine };
