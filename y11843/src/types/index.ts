export interface Note {
  id: string;
  time: number;
  duration: number;
  pitch: string;
  volume: number;
  part: string;
}

export interface VoicePart {
  id: string;
  name: string;
  color: string;
  isMain: boolean;
  notes: Note[];
}

export interface TrackData {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  totalDuration: number;
  parts: VoicePart[];
}

export type JudgeResult = 'perfect' | 'early' | 'late' | 'missed';

export interface JudgeRecord {
  noteId: string;
  partId: string;
  partName: string;
  judgeTime: number;
  expectedTime: number;
  result: JudgeResult;
  offset: number;
  volumeRatio: number;
}

export interface VolumeRecord {
  time: number;
  partId: string;
  partName: string;
  volume: number;
  isOverpowering: boolean;
}

export interface InputEvent {
  time: number;
  partId: string;
  volume: number;
}

export interface GameResult {
  totalScore: number;
  accuracy: number;
  perfectCount: number;
  earlyCount: number;
  lateCount: number;
  missedCount: number;
  overpowerCount: number;
  judgeRecords: JudgeRecord[];
  volumeRecords: VolumeRecord[];
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface ProblemPoint {
  time: number;
  type: 'early' | 'late' | 'missed' | 'overpower';
  partName: string;
  description: string;
}
