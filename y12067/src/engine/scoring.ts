import type { ScoreDetail, ScoreDeduction, GameEvent, GameSnapshot } from "@/types";

export function calculateScore(
  baseScore: number,
  deductions: ScoreDeduction[]
): ScoreDetail {
  const total = Math.max(0, baseScore + deductions.reduce((sum, d) => sum + d.points, 0));
  return { total, deductions };
}

export function evaluateGame(
  snapshots: GameSnapshot[],
  totalPeople: number,
  evacuated: number,
  timeLimit: number,
  elapsed: number
): {
  passed: boolean;
  score: ScoreDetail;
  coreReason: string;
} {
  const allDeductions = snapshots.flatMap((s) => s.score.deductions);
  const score = calculateScore(100, allDeductions);

  const evacuationRate = totalPeople > 0 ? evacuated / totalPeople : 0;
  const overtime = elapsed > timeLimit;

  let passed = score.total >= 60 && evacuationRate >= 0.8 && !overtime;
  let coreReason = "";

  if (overtime) {
    coreReason = `超时${Math.floor(elapsed - timeLimit)}秒，疏散未在规定时间内完成`;
    passed = false;
  } else if (evacuationRate < 0.8) {
    coreReason = `疏散率仅${Math.floor(evacuationRate * 100)}%，未达80%安全线，${totalPeople - evacuated}人未疏散`;
    passed = false;
  } else if (score.total < 60) {
    const worstDeduction = allDeductions.sort(
      (a, b) => a.points - b.points
    )[0];
    coreReason = worstDeduction
      ? `评分${score.total}分未达60分及格线，主要失分：${worstDeduction.reason}`
      : `评分${score.total}分未达60分及格线`;
  } else {
    coreReason = `疏散率${Math.floor(evacuationRate * 100)}%，评分${score.total}分，疏散任务完成`;
  }

  return { passed, score, coreReason };
}

export function buildSuggestions(
  events: GameEvent[],
  deductions: ScoreDeduction[]
): { category: string; items: { problem: string; suggestion: string; expectedEffect: string }[] }[] {
  const categories: Record<string, { problem: string; suggestion: string; expectedEffect: string }[]> = {
    elevator_misuse: [],
    broadcast_missed: [],
    congestion: [],
    crowd_reflux: [],
  };

  const seen = new Set<string>();

  for (const d of deductions) {
    const key = `${d.eventType}-${d.affectedArea}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const entry = {
      problem: d.reason,
      suggestion: d.suggestion,
      expectedEffect: getExpectedEffect(d.eventType),
    };

    if (categories[d.eventType]) {
      categories[d.eventType].push(entry);
    }
  }

  const result: { category: string; items: { problem: string; suggestion: string; expectedEffect: string }[] }[] = [];
  const categoryLabels: Record<string, string> = {
    elevator_misuse: "电梯误用",
    broadcast_missed: "广播漏发",
    congestion: "出口拥堵",
    crowd_reflux: "人群回流",
  };

  for (const [type, label] of Object.entries(categoryLabels)) {
    if (categories[type] && categories[type].length > 0) {
      result.push({ category: label, items: categories[type] });
    }
  }

  return result;
}

function getExpectedEffect(eventType: string): string {
  switch (eventType) {
    case "elevator_misuse":
      return "避免电梯困人风险，减少2分/人扣分";
    case "broadcast_missed":
      return "人群有序前往出口，减少5分扣分";
    case "congestion":
      return "缓解出口压力，降低拥堵度至80%以下";
    case "crowd_reflux":
      return "避免人群折返危险，减少5分扣分";
    default:
      return "改善疏散效率";
  }
}
