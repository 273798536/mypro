import type { Sample } from '../types/game';
import { audioManager } from './AudioManager';
import { useGameStore } from '../store/gameStore';
import { eventRecorder } from '../engine/EventRecorder';

export class RhythmPlayer {
  private isPlaying = false;
  private currentBeat = 0;
  private bpm = 120;
  private beatInterval: number | null = null;
  private beats: (Sample | null)[] = [];
  private lastPlaceTime = 0;
  private mismatchThreshold = 100;

  setBPM(bpm: number): void {
    this.bpm = bpm;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  setBeats(beats: (Sample | null)[]): void {
    this.beats = [...beats];
  }

  play(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentBeat = 0;
    useGameStore.getState().setRhythmPlaying(true);
    
    const beatDuration = 60000 / this.bpm;
    
    this.playCurrentBeat();
    
    this.beatInterval = window.setInterval(() => {
      this.currentBeat = (this.currentBeat + 1) % 8;
      useGameStore.getState().setCurrentBeat(this.currentBeat);
      this.playCurrentBeat();
    }, beatDuration);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    useGameStore.getState().setRhythmPlaying(false);
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  private playCurrentBeat(): void {
    const sample = this.beats[this.currentBeat];
    if (sample) {
      audioManager.playSample(sample);
    }
  }

  recordPlaceTime(): void {
    this.lastPlaceTime = Date.now();
  }

  checkRhythmMismatch(): boolean {
    if (!this.isPlaying) return false;
    
    const beatDuration = 60000 / this.bpm;
    const beatStartTime = this.getBeatStartTime();
    const timeSinceBeatStart = Date.now() - beatStartTime;
    const timeToNextBeat = beatDuration - timeSinceBeatStart;
    
    const minDistance = Math.min(timeSinceBeatStart, timeToNextBeat);
    
    if (minDistance > this.mismatchThreshold) {
      eventRecorder.recordEvent('rhythm_mismatch', {
        offset: minDistance,
        beatIndex: this.currentBeat,
      });
      useGameStore.getState().updateScore(-50, '节奏错位');
      return true;
    }
    
    return false;
  }

  private getBeatStartTime(): number {
    const beatDuration = 60000 / this.bpm;
    const now = Date.now();
    const elapsedInCycle = (now % (beatDuration * 8));
    return now - elapsedInCycle + this.currentBeat * beatDuration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentBeat(): number {
    return this.currentBeat;
  }
}

export const rhythmPlayer = new RhythmPlayer();
