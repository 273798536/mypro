import type { FrequencyBrick, Difficulty, LevelConfig } from "@/types/game";

const VERSION = "v1.0";

export const ALL_BRICKS: FrequencyBrick[] = [
  {
    id: "low",
    label: "低频",
    freqRange: [80, 250],
    centerFreq: 165,
    color: "#ff3366",
    glowColor: "rgba(255,51,102,0.5)",
    type: "low",
    version: VERSION,
  },
  {
    id: "mid-low",
    label: "中低频",
    freqRange: [250, 500],
    centerFreq: 375,
    color: "#ff9933",
    glowColor: "rgba(255,153,51,0.5)",
    type: "mid-low",
    version: VERSION,
  },
  {
    id: "mid",
    label: "中频",
    freqRange: [500, 2000],
    centerFreq: 1250,
    color: "#33ff99",
    glowColor: "rgba(51,255,153,0.5)",
    type: "mid",
    version: VERSION,
  },
  {
    id: "mid-high",
    label: "中高频",
    freqRange: [2000, 4000],
    centerFreq: 3000,
    color: "#33ccff",
    glowColor: "rgba(51,204,255,0.5)",
    type: "mid-high",
    version: VERSION,
  },
  {
    id: "high",
    label: "高频",
    freqRange: [4000, 8000],
    centerFreq: 6000,
    color: "#3366ff",
    glowColor: "rgba(51,102,255,0.5)",
    type: "high",
    version: VERSION,
  },
  {
    id: "ultra-high",
    label: "超高频",
    freqRange: [8000, 16000],
    centerFreq: 12000,
    color: "#9966ff",
    glowColor: "rgba(153,102,255,0.5)",
    type: "high",
    version: VERSION,
  },
  {
    id: "sub-bass",
    label: "次低频",
    freqRange: [20, 80],
    centerFreq: 50,
    color: "#cc3355",
    glowColor: "rgba(204,51,85,0.5)",
    type: "low",
    version: VERSION,
  },
  {
    id: "presence",
    label: "存在频",
    freqRange: [4000, 6000],
    centerFreq: 5000,
    color: "#66ffcc",
    glowColor: "rgba(102,255,204,0.5)",
    type: "mid-high",
    version: VERSION,
  },
];

export const LEVEL_CONFIGS: Record<Difficulty, LevelConfig> = {
  beginner: {
    difficulty: "beginner",
    brickCount: 4,
    bpm: 80,
    totalBeats: 24,
    brickTypes: ALL_BRICKS.slice(0, 4),
    label: "入门",
    description: "4频段 · 慢速 · 24拍",
  },
  intermediate: {
    difficulty: "intermediate",
    brickCount: 6,
    bpm: 110,
    totalBeats: 32,
    brickTypes: ALL_BRICKS.slice(0, 6),
    label: "进阶",
    description: "6频段 · 中速 · 32拍",
  },
  master: {
    difficulty: "master",
    brickCount: 8,
    bpm: 140,
    totalBeats: 40,
    brickTypes: ALL_BRICKS,
    label: "大师",
    description: "8频段 · 快速 · 40拍",
  },
};

export function generateTargetSequence(
  difficulty: Difficulty
): string[][] {
  const config = LEVEL_CONFIGS[difficulty];
  const brickIds = config.brickTypes.map((b) => b.id);
  const result: string[][] = [];

  for (let i = 0; i < config.totalBeats; i++) {
    const count = difficulty === "beginner" ? 1 : difficulty === "intermediate" ? (i % 4 === 0 ? 2 : 1) : (i % 3 === 0 ? 2 : 1);
    const chosen: string[] = [];
    const available = [...brickIds];
    for (let j = 0; j < count && available.length > 0; j++) {
      const idx = Math.floor(Math.random() * available.length);
      chosen.push(available[idx]);
      available.splice(idx, 1);
    }
    result.push(chosen);
  }

  return result;
}

export function getBrickById(id: string): FrequencyBrick | undefined {
  return ALL_BRICKS.find((b) => b.id === id);
}
