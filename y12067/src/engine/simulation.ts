import type {
  CrowdParticle,
  Exit,
  FloorPlan,
  GameEvent,
  ExitFlowInfo,
  ScoreDeduction,
} from "@/types";
import { getExitEffectiveCapacity } from "./dataCleaner";

const CONGESTION_THRESHOLD = 0.8;
const CONGESTION_DURATION_THRESHOLD = 10;
const ELEVATOR_ATTRACT_RANGE = 5;
const FIRE_EXPAND_RATE = 0.05;
const PARTICLE_REPEL_DIST = 0.5;

let eventIdCounter = 0;
function nextEventId(): string {
  return `evt-${++eventIdCounter}`;
}

export function simulateStep(
  particles: CrowdParticle[],
  floors: FloorPlan[],
  elapsed: number,
  elevatorStates: Record<string, boolean>,
  broadcastAreas: string[],
  previousCongestionStart: Record<string, number>,
  stepNumber: number
): {
  particles: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  evacuated: number;
  events: GameEvent[];
  deductions: ScoreDeduction[];
  congestionStart: Record<string, number>;
} {
  const events: GameEvent[] = [];
  const deductions: ScoreDeduction[] = [];
  const congestionStart = { ...previousCongestionStart };
  let evacuatedCount = 0;

  const updatedParticles = particles.map((p) => ({ ...p }));

  for (const floor of floors) {
    const floorParticles = updatedParticles.filter(
      (p) => p.floorId === floor.id && !p.evacuated
    );

    const fireRadius = floor.fireSource.radius + FIRE_EXPAND_RATE * elapsed;

    for (const exit of floor.exits) {
      if (exit.status === "blocked") continue;

      const effectiveCapacity = getExitEffectiveCapacity(exit);
      const nearExit = floorParticles.filter((p) => {
        const dist = Math.hypot(p.x - exit.x, p.y - exit.y);
        return dist < 3;
      });

      const queueSize = nearExit.length;
      const flow = Math.min(effectiveCapacity / 60, queueSize);
      const congestionLevel = queueSize / effectiveCapacity;

      let evacuatedThisStep = 0;
      for (const p of nearExit) {
        if (evacuatedThisStep >= flow) break;
        const dist = Math.hypot(p.x - exit.x, p.y - exit.y);
        if (dist < 1.5) {
          p.evacuated = true;
          evacuatedThisStep++;
          evacuatedCount++;
        }
      }

      if (congestionLevel > CONGESTION_THRESHOLD) {
        if (!congestionStart[exit.id]) {
          congestionStart[exit.id] = elapsed;
        }
        const duration = elapsed - congestionStart[exit.id];
        if (duration > CONGESTION_DURATION_THRESHOLD) {
          const existingEvent = events.find((e) => e.affectedArea === exit.id && e.type === "congestion");
          if (!existingEvent) {
            events.push({
              id: nextEventId(),
              timestamp: elapsed,
              type: "congestion",
              severity: congestionLevel > 1.2 ? "critical" : "warning",
              message: `${floor.name} ${exit.direction}向出口拥堵度${Math.floor(congestionLevel * 100)}%，已持续${Math.floor(duration)}秒`,
              affectedArea: exit.id,
              suggestion: getCongestionSuggestion(exit, floors, floor),
            });
            deductions.push({
              step: stepNumber,
              reason: `${floor.name}${exit.direction}向出口拥堵超阈值，拥堵度${Math.floor(congestionLevel * 100)}%`,
              points: -3,
              eventType: "congestion",
              suggestion: getCongestionSuggestion(exit, floors, floor),
              affectedArea: exit.id,
            });
          }
        }
      } else {
        delete congestionStart[exit.id];
      }
    }

    for (const elev of floor.elevators) {
      const isUsable = elevatorStates[elev.id] !== false;
      if (isUsable) {
        const nearElevator = floorParticles.filter((p) => {
          const dist = Math.hypot(p.x - elev.x, p.y - elev.y);
          return dist < ELEVATOR_ATTRACT_RANGE && !p.evacuated;
        });

        for (const p of nearElevator) {
          if (Math.random() < 0.15) {
            p.usingElevator = true;
            p.targetX = elev.x;
            p.targetY = elev.y;
          }
        }

        const usingCount = floorParticles.filter((p) => p.usingElevator).length;
        if (usingCount > 0 && Math.random() < 0.3) {
          events.push({
            id: nextEventId(),
            timestamp: elapsed,
            type: "elevator_misuse",
            severity: "critical",
            message: `${floor.name} ${usingCount}人正在使用${elev.id}号电梯，火警期间电梯应停用`,
            affectedArea: elev.id,
            suggestion: `应立即关闭${elev.id}号电梯，引导人群改走楼梯`,
          });
          deductions.push({
            step: stepNumber,
            reason: `${floor.name}${usingCount}人误用${elev.id}号电梯`,
            points: -2 * usingCount,
            eventType: "elevator_misuse",
            suggestion: `应立即关闭${elev.id}号电梯，引导人群改走楼梯`,
            affectedArea: elev.id,
          });
        }
      }
    }

    const unguided = floorParticles.filter(
      (p) =>
        !p.evacuated &&
        !p.usingElevator &&
        p.targetX === p.x &&
        p.targetY === p.y
    );
    const floorBroadcast = broadcastAreas.filter((a) => a === floor.id);
    if (floorBroadcast.length === 0 && unguided.length > 10 && elapsed > 10) {
      if (Math.random() < 0.2) {
        events.push({
          id: nextEventId(),
          timestamp: elapsed,
          type: "broadcast_missed",
          severity: "warning",
          message: `${floor.name}未收到疏散广播，${unguided.length}人无目标移动`,
          affectedArea: floor.id,
          suggestion: `应对${floor.name}立即发送疏散广播，指引人群前往最近出口`,
        });
        deductions.push({
          step: stepNumber,
          reason: `${floor.name}未发送疏散广播，${unguided.length}人无序移动`,
          points: -5,
          eventType: "broadcast_missed",
          suggestion: `应在第${Math.max(1, stepNumber - 2)}步对${floor.name}发送疏散广播`,
          affectedArea: floor.id,
        });
      }
    }

    for (const p of floorParticles) {
      if (p.evacuated || p.usingElevator) continue;

      const distToFire = Math.hypot(
        p.x - floor.fireSource.x,
        p.y - floor.fireSource.y
      );
      if (distToFire < fireRadius + 1) {
        const nearestExit = findNearestSafeExit(p, floor, fireRadius);
        if (nearestExit) {
          p.targetX = nearestExit.x;
          p.targetY = nearestExit.y;
          if (distToFire < fireRadius) {
            p.stuck = true;
            events.push({
              id: nextEventId(),
              timestamp: elapsed,
              type: "crowd_reflux",
              severity: "critical",
              message: `${floor.name}有人员被火势逼退，出现回流`,
              affectedArea: floor.id,
              suggestion: `应更早疏散${floor.name}靠近火源区域的人群`,
            });
            deductions.push({
              step: stepNumber,
              reason: `${floor.name}人群因火势扩展被迫折返`,
              points: -5,
              eventType: "crowd_reflux",
              suggestion: `应更早疏散${floor.name}靠近火源区域的人群`,
              affectedArea: floor.id,
            });
          }
        }
      }

      applySocialForce(p, floorParticles, floor);
    }
  }

  const exitFlows = computeExitFlows(updatedParticles, floors);

  return {
    particles: updatedParticles,
    exitFlows,
    evacuated: evacuatedCount,
    events,
    deductions,
    congestionStart,
  };
}

function findNearestSafeExit(
  particle: CrowdParticle,
  floor: FloorPlan,
  fireRadius: number
): Exit | null {
  let best: Exit | null = null;
  let bestDist = Infinity;
  for (const exit of floor.exits) {
    if (exit.status === "blocked") continue;
    const distToExit = Math.hypot(particle.x - exit.x, particle.y - exit.y);
    const exitDistToFire = Math.hypot(
      exit.x - floor.fireSource.x,
      exit.y - floor.fireSource.y
    );
    if (exitDistToFire > fireRadius + 2 && distToExit < bestDist) {
      best = exit;
      bestDist = distToExit;
    }
  }
  return best;
}

function applySocialForce(
  particle: CrowdParticle,
  others: CrowdParticle[],
  floor: FloorPlan
): void {
  const dx = particle.targetX - particle.x;
  const dy = particle.targetY - particle.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.1) return;

  let fx = (dx / dist) * particle.speed * 0.1;
  let fy = (dy / dist) * particle.speed * 0.1;

  for (const other of others) {
    if (other.id === particle.id || other.evacuated) continue;
    const ox = particle.x - other.x;
    const oy = particle.y - other.y;
    const od = Math.hypot(ox, oy);
    if (od < PARTICLE_REPEL_DIST && od > 0.01) {
      const repel = 0.02 / (od * od);
      fx += (ox / od) * repel;
      fy += (oy / od) * repel;
    }
  }

  if (floor.grid[Math.floor(particle.y)]?.[Math.floor(particle.x)] === 1) {
    fx += (Math.random() - 0.5) * 0.1;
    fy += (Math.random() - 0.5) * 0.1;
  }

  particle.x = Math.max(0, Math.min(floor.width - 1, particle.x + fx));
  particle.y = Math.max(0, Math.min(floor.height - 1, particle.y + fy));
}

function computeExitFlows(
  particles: CrowdParticle[],
  floors: FloorPlan[]
): ExitFlowInfo[] {
  const flows: ExitFlowInfo[] = [];
  for (const floor of floors) {
    for (const exit of floor.exits) {
      const capacity = getExitEffectiveCapacity(exit);
      const nearCount = particles.filter(
        (p) =>
          p.floorId === floor.id &&
          !p.evacuated &&
          Math.hypot(p.x - exit.x, p.y - exit.y) < 3
      ).length;
      const flow = Math.min(capacity / 60, nearCount);
      flows.push({
        exitId: exit.id,
        flow: Math.round(flow * 10) / 10,
        queueSize: nearCount,
        capacity,
        congestionLevel: nearCount / capacity,
      });
    }
  }
  return flows;
}

function getCongestionSuggestion(
  congestedExit: Exit,
  allFloors: FloorPlan[],
  currentFloor: FloorPlan
): string {
  const alternatives = currentFloor.exits.filter(
    (e) => e.id !== congestedExit.id && e.status !== "blocked"
  );
  if (alternatives.length > 0) {
    const altNames = alternatives
      .map((e) => `${e.direction}向出口(${e.id})`)
      .join("、");
    return `应引导部分人群改走${altNames}，缓解${congestedExit.direction}向出口压力`;
  }
  const otherFloors = allFloors.filter((f) => f.id !== currentFloor.id);
  if (otherFloors.length > 0) {
    return `本层无替代出口，应优先通过楼梯疏散至${otherFloors[0].name}`;
  }
  return `出口容量不足，建议调整疏散策略`;
}

export function applyBroadcast(
  particles: CrowdParticle[],
  floorId: string,
  targetExitId: string,
  floors: FloorPlan[]
): CrowdParticle[] {
  const floor = floors.find((f) => f.id === floorId);
  if (!floor) return particles;

  const targetExit = floor.exits.find((e) => e.id === targetExitId);
  if (!targetExit) return particles;

  return particles.map((p) => {
    if (p.floorId !== floorId || p.evacuated || p.usingElevator) return p;
    return {
      ...p,
      targetX: targetExit.x + (Math.random() - 0.5),
      targetY: targetExit.y + (Math.random() - 0.5),
    };
  });
}

export function applyElevatorControl(
  particles: CrowdParticle[],
  elevatorId: string,
  disable: boolean,
  floors: FloorPlan[]
): CrowdParticle[] {
  let elevator: { x: number; y: number } | undefined;
  for (const floor of floors) {
    const found = floor.elevators.find((e) => e.id === elevatorId);
    if (found) { elevator = found; break; }
  }

  return particles.map((p) => {
    if (!p.usingElevator || !elevator) return p;
    const dist = Math.hypot(p.x - elevator.x, p.y - elevator.y);
    if (dist > 5) return p;

    if (disable) {
      const floor = floors.find((f) => f.id === p.floorId);
      const nearestStair = floor?.stairs[0];
      if (nearestStair) {
        return {
          ...p,
          usingElevator: false,
          targetX: nearestStair.x,
          targetY: nearestStair.y,
        };
      }
      return { ...p, usingElevator: false };
    }
    return p;
  });
}

export function applyExitRedirect(
  particles: CrowdParticle[],
  floorId: string,
  fromExitId: string,
  toExitId: string,
  floors: FloorPlan[]
): CrowdParticle[] {
  const floor = floors.find((f) => f.id === floorId);
  if (!floor) return particles;
  const toExit = floor.exits.find((e) => e.id === toExitId);
  if (!toExit) return particles;

  return particles.map((p) => {
    if (p.floorId !== floorId || p.evacuated) return p;
    return {
      ...p,
      targetX: toExit.x + (Math.random() - 0.5),
      targetY: toExit.y + (Math.random() - 0.5),
    };
  });
}
