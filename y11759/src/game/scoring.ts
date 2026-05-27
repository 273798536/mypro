import type { Frame, GameEvent, Level, ScoreBreakdown } from './types';
import { GAME_CONSTANTS } from './types';

export function computeScore(
  level: Level,
  result: 'success' | 'escape' | 'fuel-out' | 'collision' | 'timeout',
  frames: Frame[],
  events: GameEvent[],
  enterSpeedMap: Map<string, number>
): ScoreBreakdown {
  const base = result === 'success' ? 100 : 0;

  const lastFrame = frames[frames.length - 1];
  const fuelUsed = level.fuelBudget - (lastFrame?.fuel ?? 0);
  const fuelBonus = result === 'success' ? Math.max(0, Math.round((1 - fuelUsed / level.fuelBudget) * 100)) : 0;

  const slingshotCount = countSlingshots(events, frames, enterSpeedMap, level);
  const slingshotBonus = slingshotCount * 20;

  const timeBonus =
    result === 'success' && lastFrame
      ? Math.max(0, Math.round((1 - lastFrame.t / level.timeLimit) * 40))
      : 0;

  const penalties: { label: string; value: number }[] = [];
  if (result !== 'success') {
    penalties.push({ label: '任务未完成', value: -100 });
  }

  const total = base + fuelBonus + slingshotBonus + timeBonus + penalties.reduce((s, p) => s + p.value, 0);
  return { base, fuelBonus, slingshotBonus, timeBonus, penalties, total: Math.max(0, total) };
}

function countSlingshots(
  events: GameEvent[],
  frames: Frame[],
  enterSpeedMap: Map<string, number>,
  level: Level
): number {
  let count = 0;
  for (const e of events) {
    if (e.type === 'leave-influence' && e.planet) {
      const enterSpeed = enterSpeedMap.get(e.planet) ?? 0;
      const exitFrame = frames.find((f) => f.t >= e.t);
      if (!exitFrame) continue;
      const exitSpeed = Math.sqrt(exitFrame.vx ** 2 + exitFrame.vy ** 2);
      const gain = (exitSpeed - enterSpeed) / enterSpeed;
      if (gain >= GAME_CONSTANTS.SLINGSHOT_SPEED_GAIN) {
        count++;
      }
    }
  }
  return count;
}
