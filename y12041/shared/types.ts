export type Difficulty = 'easy' | 'medium' | 'hard';
export type TimeSlot = 'day' | 'night';
export type EmotionType = 'annoyed' | 'anxious' | 'calm' | 'sleepless';

export interface SoundSource {
  id: string;
  levelId: string;
  name: string;
  dbLevel: number;
  timeSlot: TimeSlot;
  frequencyBand: string;
}

export interface ResidentEmotion {
  id: string;
  levelId: string;
  type: EmotionType;
  intensity: number;
  delayed: boolean | number;
  sourceIds: string[];
}

export interface RemixReport {
  id: string;
  levelId: string;
  combinedDb: number;
  hasOverlap: boolean | number;
  overlapMerged: boolean | number;
  violatesNightThreshold: boolean | number;
  sourceIds: string[];
}

export interface Judgment {
  id: string;
  levelId: string;
  reportId: string;
  dbStackingCorrect: boolean | number | null;
  overlapNotMerged: boolean | number | null;
  nightThresholdOk: boolean | number | null;
  emotionModifier: number;
  score: number;
  createdAt: string;
  updatedAt: string;
  emotionIds?: string[];
}

export interface LevelSummary {
  id: string;
  name: string;
  difficulty: Difficulty;
  nightThresholdDb: number;
  createdAt: string;
  sourceCount: number;
  emotionCount: number;
  reportCount: number;
}

export interface LevelDetail extends LevelSummary {
  sources: SoundSource[];
  emotions: ResidentEmotion[];
  reports: RemixReport[];
}

export interface TraceEntry {
  judgment: Judgment;
  report: RemixReport;
  emotions: ResidentEmotion[];
  sources: SoundSource[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
