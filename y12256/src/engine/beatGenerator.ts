import type { BeatNote, BeatTrackInfo, TrainInfo, PlatformInfo, TrackSwitch } from '@/types';

let noteIdCounter = 0;
let switchIdCounter = 0;

function nextNoteId(): string {
  return `note_${++noteIdCounter}`;
}

function nextSwitchId(): string {
  return `switch_${++switchIdCounter}`;
}

export function resetIds(): void {
  noteIdCounter = 0;
  switchIdCounter = 0;
}

interface SongPattern {
  bpm: number;
  durationMs: number;
  syncopationProb: number;
  switchProb: number;
  switchDelayRange: [number, number];
  conflictProb: number;
  speedChangeProb: number;
}

const DEFAULT_PATTERN: SongPattern = {
  bpm: 120,
  durationMs: 60000,
  syncopationProb: 0.15,
  switchProb: 0.2,
  switchDelayRange: [200, 800],
  speedChangeProb: 0.1,
  conflictProb: 0.15,
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickTrack(): number {
  return Math.floor(Math.random() * 4);
}

function generateSwitches(
  notes: BeatNote[],
  pattern: SongPattern
): TrackSwitch[] {
  const switches: TrackSwitch[] = [];
  const candidates = notes.filter((_, i) => i > 0 && i % 4 === 0);

  for (const note of candidates) {
    if (Math.random() < pattern.switchProb) {
      const fromTrack = note.trackIndex;
      let toTrack = pickTrack();
      while (toTrack === fromTrack) {
        toTrack = pickTrack();
      }
      const delay = randomBetween(
        pattern.switchDelayRange[0],
        pattern.switchDelayRange[1]
      );
      switches.push({
        id: nextSwitchId(),
        fromTrack,
        toTrack,
        triggerTime: note.targetTime - delay,
        arrivalDelay: delay,
        isDelivered: false,
      });
    }
  }

  return switches;
}

export function generateBeatMap(
  pattern: SongPattern = DEFAULT_PATTERN
): { notes: BeatNote[]; switches: TrackSwitch[] } {
  resetIds();
  const beatInterval = 60000 / pattern.bpm;
  const noteCount = Math.floor(pattern.durationMs / beatInterval);
  const notes: BeatNote[] = [];
  let currentBpm = pattern.bpm;
  let prevBpm = pattern.bpm;

  for (let i = 0; i < noteCount; i++) {
    const targetTime = i * beatInterval + beatInterval / 2;

    prevBpm = currentBpm;
    if (i > 0 && Math.random() < pattern.speedChangeProb) {
      const delta = randomBetween(-30, 30);
      currentBpm = Math.max(60, Math.min(200, currentBpm + delta));
    }

    const trackIndex = pickTrack();
    const isSyncopation = Math.random() < pattern.syncopationProb;

    const noteId = nextNoteId();
    const trainId = `train_${noteId}`;
    const platformId = `plat_${noteId}`;

    let hasConflict = Math.random() < pattern.conflictProb;

    const beatTrack: BeatTrackInfo = {
      noteId,
      expectedTrack: trackIndex,
      expectedTime: targetTime,
      isSyncopation,
    };

    const trainTrack = hasConflict && Math.random() < 0.5
      ? (trackIndex + randomBetween(1, 3)) % 4
      : trackIndex;

    const train: TrainInfo = {
      trainId,
      actualTrack: trainTrack,
      arrivalTime: targetTime + randomBetween(-20, 20),
      switchDelay: 0,
    };

    const platTrack = hasConflict && Math.random() > 0.5
      ? (trackIndex + randomBetween(1, 3)) % 4
      : trackIndex;

    const platform: PlatformInfo = {
      platformId,
      designatedTrack: platTrack,
      openTime: targetTime + randomBetween(-10, 10),
    };

    notes.push({
      id: noteId,
      trackIndex: trainTrack !== trackIndex ? trainTrack : trackIndex,
      targetTime,
      isSyncopation,
      bpm: currentBpm,
      sourceBeat: beatTrack,
      sourceTrain: train,
      sourcePlatform: platform,
      judged: false,
    });

    hasConflict = false;
  }

  const switches = generateSwitches(notes, pattern);

  return { notes, switches };
}
