export interface SoundSource {
  id: string;
  levelId: string;
  name: string;
  dbLevel: number;
  timeSlot: "day" | "night";
  frequencyBand: string;
}

export interface ResidentEmotion {
  id: string;
  levelId: string;
  type: "annoyed" | "anxious" | "calm" | "sleepless";
  intensity: number;
  delayed: number;
  sourceIds: string[];
}

export interface RemixReport {
  id: string;
  levelId: string;
  combinedDb: number;
  hasOverlap: number;
  overlapMerged: number;
  violatesNightThreshold: number;
  sourceIds: string[];
}

export interface Judgment {
  id: string;
  levelId: string;
  reportId: string;
  dbStackingCorrect: number | null;
  overlapNotMerged: number | null;
  nightThresholdOk: number | null;
  emotionModifier: number;
  score: number;
  createdAt: string;
  updatedAt: string;
  emotionIds: string[];
}

export interface Level {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  nightThresholdDb: number;
  createdAt: string;
  sourceCount?: number;
  emotionCount?: number;
  reportCount?: number;
  sources?: SoundSource[];
  emotions?: ResidentEmotion[];
  reports?: RemixReport[];
}

export interface LevelDetail extends Level {
  sources: SoundSource[];
  emotions: ResidentEmotion[];
  reports: RemixReport[];
}

export interface ReportItem {
  judgment: Judgment;
  report: RemixReport | null;
  emotions: ResidentEmotion[];
  sources: SoundSource[];
}

export const EMOTION_LABELS: Record<string, string> = {
  annoyed: "烦躁",
  anxious: "焦虑",
  calm: "平静",
  sleepless: "失眠",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "入门",
  medium: "进阶",
  hard: "挑战",
};

export const TIMESLOT_LABELS: Record<string, string> = {
  day: "白天",
  night: "夜间",
};

export function correctDbStacking(dbLevels: number[]): number {
  if (dbLevels.length === 0) return 0;
  if (dbLevels.length === 1) return dbLevels[0];
  const sumPower = dbLevels.reduce((sum, db) => sum + Math.pow(10, db / 10), 0);
  return 10 * Math.log10(sumPower);
}
