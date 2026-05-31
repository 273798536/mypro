import type { GameScore, BeatEvent, GameError, FrequencyBrick, Judgment } from "@/types/game";
import { computeSpectrumSimilarity } from "@/utils/audioEngine";

const VERSION = "v1.0";

export function judgeTiming(delta: number): Judgment {
  const absDelta = Math.abs(delta);
  if (absDelta < 80) return "perfect";
  if (absDelta < 200) return "good";
  return "miss";
}

export function calcRhythmScore(judgment: Judgment): number {
  switch (judgment) {
    case "perfect": return 1;
    case "good": return 0.7;
    case "miss": return 0;
  }
}

export function calcSpectrumScore(
  playerBrickIds: string[],
  targetBrickIds: string[],
  allBrickIds: string[]
): number {
  return computeSpectrumSimilarity(playerBrickIds, targetBrickIds, allBrickIds);
}

export function detectErrors(
  beatIndex: number,
  playerBrickIds: string[],
  targetBrickIds: string[],
  judgment: Judgment,
  availableBricks: FrequencyBrick[],
  previousJudgments: Judgment[]
): GameError[] {
  const errors: GameError[] = [];
  const brickMap = new Map(availableBricks.map((b) => [b.id, b]));

  const playerSet = new Set(playerBrickIds);
  const targetSet = new Set(targetBrickIds);

  const overlaps: string[] = [];
  const playerBricks = playerBrickIds.map((id) => brickMap.get(id)).filter(Boolean) as FrequencyBrick[];
  for (let i = 0; i < playerBricks.length; i++) {
    for (let j = i + 1; j < playerBricks.length; j++) {
      const a = playerBricks[i];
      const b = playerBricks[j];
      if (a.freqRange[0] < b.freqRange[1] && b.freqRange[0] < a.freqRange[1]) {
        overlaps.push(a.id, b.id);
      }
    }
  }
  if (overlaps.length > 0) {
    errors.push({
      id: `aliasing-${beatIndex}`,
      type: "aliasing",
      severity: "warning",
      affectedBricks: [...new Set(overlaps)],
      affectedResults: ["频谱合成分", "波形回放分"],
      description: `频段混叠：砖块 ${[...new Set(overlaps)].map((id) => brickMap.get(id)?.label || id).join("、")} 频率范围重叠，导致频谱失真`,
      deduction: [...new Set(overlaps)].length * 5,
      beatIndex,
      version: VERSION,
    });
  }

  const recentBad = previousJudgments.slice(-3);
  if (recentBad.length >= 3 && recentBad.every((j) => j === "good" || j === "miss")) {
    errors.push({
      id: `misalignment-${beatIndex}`,
      type: "misalignment",
      severity: "error",
      affectedBricks: playerBrickIds,
      affectedResults: ["节奏判定分", "波形回放分"],
      description: `节拍错位：连续3拍判定偏差，节奏判定和波形回放受影响`,
      deduction: 3 * 3,
      beatIndex,
      version: VERSION,
    });
  }

  const missedBricks = [...targetSet].filter((id) => !playerSet.has(id));
  if (targetSet.size > 0 && missedBricks.length > targetSet.size / 2) {
    errors.push({
      id: `overfilter-${beatIndex}`,
      type: "over-filtering",
      severity: "warning",
      affectedBricks: missedBricks,
      affectedResults: ["频谱合成分", "波形回放分"],
      description: `过度滤波：遗漏目标频段 ${missedBricks.map((id) => brickMap.get(id)?.label || id).join("、")}，频谱不完整`,
      deduction: missedBricks.length * 8,
      beatIndex,
      version: VERSION,
    });
  }

  return errors;
}

export function calculateFinalScore(beatEvents: BeatEvent[], totalBeats: number): GameScore {
  let totalSpectrum = 0;
  let totalRhythm = 0;
  let aliasingDeduction = 0;
  let misalignmentDeduction = 0;
  let overFilteringDeduction = 0;

  for (const event of beatEvents) {
    totalSpectrum += event.spectrumScore;
    totalRhythm += event.rhythmScore;
    for (const err of event.errors) {
      if (err.type === "aliasing") aliasingDeduction += err.deduction;
      if (err.type === "misalignment") misalignmentDeduction += err.deduction;
      if (err.type === "over-filtering") overFilteringDeduction += err.deduction;
    }
  }

  const spectrumSynthesisScore = totalBeats > 0 ? Math.round((totalSpectrum / totalBeats) * 40) : 0;
  const rhythmJudgmentScore = totalBeats > 0 ? Math.round((totalRhythm / totalBeats) * 30) : 0;

  const missedBeats = totalBeats - beatEvents.length;
  const waveformPenalty = missedBeats * 2;
  const waveformPlaybackScore = Math.max(0, 30 - waveformPenalty - Math.round((aliasingDeduction + overFilteringDeduction) * 0.2));

  const rawTotal = spectrumSynthesisScore + rhythmJudgmentScore + waveformPlaybackScore;
  const totalDeduction = aliasingDeduction + misalignmentDeduction + overFilteringDeduction;
  const totalScore = Math.max(0, Math.round(rawTotal - totalDeduction * 0.5));

  let grade: "S" | "A" | "B" | "C" | "D";
  if (totalScore >= 90) grade = "S";
  else if (totalScore >= 75) grade = "A";
  else if (totalScore >= 60) grade = "B";
  else if (totalScore >= 40) grade = "C";
  else grade = "D";

  return {
    spectrumSynthesisScore,
    rhythmJudgmentScore,
    waveformPlaybackScore,
    aliasingDeduction,
    misalignmentDeduction,
    overFilteringDeduction,
    totalScore,
    grade,
  };
}
