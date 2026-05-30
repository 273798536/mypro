import type { Scenario, Exit, CrowdGroup, FloorPlan, CrowdParticle } from "@/types";

const DEFAULT_EXIT_CAPACITY = 50;
const CONGESTION_KEYWORDS: Record<string, number> = {
  "拥堵": 1.5,
  "常拥堵": 1.8,
  "节假日常拥堵": 2.0,
  "密集": 1.3,
};

export function cleanScenario(scenario: Scenario): Scenario {
  const cleanedFloors = scenario.floors.map(cleanFloor);
  const cleanedGroups = scenario.crowdGroups.map(cleanCrowdGroup);
  return { ...scenario, floors: cleanedFloors, crowdGroups: cleanedGroups };
}

function cleanFloor(floor: FloorPlan): FloorPlan {
  const cleanedExits = floor.exits.map(cleanExit);
  let congestionMultiplier = 1.0;

  if (floor.notes) {
    for (const [keyword, multiplier] of Object.entries(CONGESTION_KEYWORDS)) {
      if (floor.notes.includes(keyword)) {
        congestionMultiplier = Math.max(congestionMultiplier, multiplier);
      }
    }
  }

  if (congestionMultiplier > 1.0) {
    for (const exit of cleanedExits) {
      if (floor.notes && floor.notes.includes("北侧") && exit.direction === "north") {
        exit.note = exit.note
          ? `${exit.note}；楼层备注标注拥堵系数×${congestionMultiplier}`
          : `楼层备注标注拥堵系数×${congestionMultiplier}`;
      }
      if (floor.notes && floor.notes.includes("南侧") && exit.direction === "south") {
        exit.note = exit.note
          ? `${exit.note}；楼层备注标注拥堵系数×${congestionMultiplier}`
          : `楼层备注标注拥堵系数×${congestionMultiplier}`;
      }
    }
  }

  return { ...floor, exits: cleanedExits };
}

function cleanExit(exit: Exit): Exit {
  const cleaned: Exit = { ...exit };

  if (cleaned.capacity === undefined || cleaned.capacity === null) {
    cleaned.capacity = DEFAULT_EXIT_CAPACITY;
    if (!cleaned.note) {
      cleaned.note = `容量字段缺失，已按默认${DEFAULT_EXIT_CAPACITY}人/分钟补全`;
    } else {
      cleaned.note += `；容量字段缺失，已按默认${DEFAULT_EXIT_CAPACITY}人/分钟补全`;
    }
    if (!cleaned.status) {
      cleaned.status = "missing_field";
    }
  }

  if (!cleaned.status) {
    cleaned.status = "open";
  }

  return cleaned;
}

function cleanCrowdGroup(group: CrowdGroup): CrowdGroup {
  return {
    ...group,
    arrivalTime: group.arrivalTime ?? 0,
  };
}

export function initCrowdParticles(groups: CrowdGroup[]): CrowdParticle[] {
  const particles: CrowdParticle[] = [];
  for (const group of groups) {
    if ((group.arrivalTime ?? 0) > 0) continue;
    for (let i = 0; i < group.count; i++) {
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      particles.push({
        id: `${group.id}-p${i}`,
        groupId: group.id,
        x: group.x + offsetX,
        y: group.y + offsetY,
        targetX: group.x,
        targetY: group.y,
        speed: group.speed * (0.8 + Math.random() * 0.4),
        evacuated: false,
        stuck: false,
        usingElevator: false,
        floorId: group.floorId,
      });
    }
  }
  return particles;
}

export function spawnLateCrowd(
  groups: CrowdGroup[],
  elapsed: number,
  existingIds: Set<string>
): CrowdParticle[] {
  const newParticles: CrowdParticle[] = [];
  for (const group of groups) {
    if ((group.arrivalTime ?? 0) <= 0) continue;
    if (Math.abs(elapsed - group.arrivalTime!) > 0.5) continue;
    if (existingIds.has(group.id)) continue;
    existingIds.add(group.id);
    for (let i = 0; i < group.count; i++) {
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      newParticles.push({
        id: `${group.id}-p${i}`,
        groupId: group.id,
        x: group.x + offsetX,
        y: group.y + offsetY,
        targetX: group.x,
        targetY: group.y,
        speed: group.speed * (0.8 + Math.random() * 0.4),
        evacuated: false,
        stuck: false,
        usingElevator: false,
        floorId: group.floorId,
      });
    }
  }
  return newParticles;
}

export function getExitEffectiveCapacity(exit: Exit): number {
  const base = exit.capacity ?? DEFAULT_EXIT_CAPACITY;
  let multiplier = 1.0;
  if (exit.note) {
    for (const [keyword, mult] of Object.entries(CONGESTION_KEYWORDS)) {
      if (exit.note.includes(keyword)) {
        multiplier = Math.max(multiplier, mult);
      }
    }
  }
  return Math.floor(base / multiplier);
}
