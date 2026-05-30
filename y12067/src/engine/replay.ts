import type { GameSnapshot, Operation, CrowdParticle, GameEvent, ScoreDetail, ExitFlowInfo } from "@/types";

export function createSnapshot(
  step: number,
  elapsed: number,
  crowdState: CrowdParticle[],
  exitFlows: ExitFlowInfo[],
  evacuated: number,
  events: GameEvent[],
  score: ScoreDetail,
  operations: Operation[],
  elevatorStates: Record<string, boolean>,
  broadcastAreas: string[]
): GameSnapshot {
  return {
    step,
    elapsed,
    crowdState: crowdState.map((p) => ({ ...p })),
    exitFlows: exitFlows.map((f) => ({ ...f })),
    evacuated,
    events: events.map((e) => ({ ...e })),
    score: { total: score.total, deductions: score.deductions.map((d) => ({ ...d })) },
    operations: operations.map((o) => ({
      ...o,
      crowdSnapshot: o.crowdSnapshot.map((p) => ({ ...p })),
    })),
    elevatorStates: { ...elevatorStates },
    broadcastAreas: [...broadcastAreas],
  };
}

export function restoreSnapshot(
  snapshot: GameSnapshot
): {
  crowdState: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  evacuated: number;
  events: GameEvent[];
  score: ScoreDetail;
  operations: Operation[];
  elevatorStates: Record<string, boolean>;
  broadcastAreas: string[];
} {
  return {
    crowdState: snapshot.crowdState.map((p) => ({ ...p })),
    exitFlows: snapshot.exitFlows.map((f) => ({ ...f })),
    evacuated: snapshot.evacuated,
    events: snapshot.events.map((e) => ({ ...e })),
    score: {
      total: snapshot.score.total,
      deductions: snapshot.score.deductions.map((d) => ({ ...d })),
    },
    operations: snapshot.operations.map((o) => ({
      ...o,
      crowdSnapshot: o.crowdSnapshot.map((p) => ({ ...p })),
    })),
    elevatorStates: { ...snapshot.elevatorStates },
    broadcastAreas: [...snapshot.broadcastAreas],
  };
}

export function findTriggerStep(
  deductions: ScoreDeduction[],
  eventType: string,
  affectedArea: string
): number {
  const match = deductions.find(
    (d) => d.eventType === eventType && d.affectedArea === affectedArea
  );
  return match ? match.step : -1;
}
