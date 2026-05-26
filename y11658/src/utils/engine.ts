import type {
  Coil,
  Spreader,
  Rail,
  StepEvent,
  Task,
  Vec3,
  Zone,
} from "@/types";

export function distanceOnRail(pos: Vec3, rail: Rail): number {
  let min = Infinity;
  for (const p of rail.points) {
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (d < min) min = d;
  }
  return min;
}

export function computeCogOffset(
  pos: { x: number; z: number; rot: number },
  coil: Coil,
  spreader: Spreader,
): number {
  const rad = (pos.rot * Math.PI) / 180;
  const localX = coil.cog.x;
  const localY = coil.cog.y;
  const worldX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const worldY = localX * Math.sin(rad) + localY * Math.cos(rad);
  return Math.hypot(worldX, worldY);
}

export function pointInPolygon(
  x: number,
  z: number,
  polygon: { x: number; z: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      zi = polygon[i].z;
    const xj = polygon[j].x,
      zj = polygon[j].z;
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function resolveZone(
  pos: Vec3,
  zones: Zone[],
): Zone["type"] | null {
  for (const z of zones) {
    if (pointInPolygon(pos.x, pos.z, z.polygon)) return z.type;
  }
  return null;
}

export type ValidateResult = {
  cogOffset: number;
  onRail: boolean;
  inZone: Zone["type"] | null;
  crossing: boolean;
  scoreDelta: number;
  penalty?: StepEvent["penalty"];
  terminate?: boolean;
};

export function validateStep(
  task: Task,
  coil: Coil,
  spreader: Spreader,
  rail: Rail,
  zones: Zone[],
  prev: Vec3,
  next: { x: number; y: number; z: number; rot: number },
  baseScore = 10,
): ValidateResult {
  const cogOffset = computeCogOffset(
    { x: next.x, z: next.z, rot: next.rot },
    coil,
    spreader,
  );
  const railDist = distanceOnRail({ x: next.x, y: next.y, z: next.z }, rail);
  const onRail = railDist <= 0.6;
  const inZone = resolveZone({ x: next.x, y: next.y, z: next.z }, zones);
  const crossing =
    inZone === "restricted" || inZone === "danger";

  let scoreDelta = baseScore;
  let penalty: StepEvent["penalty"] | undefined;
  let terminate = false;

  if (cogOffset > spreader.offsetLimit) {
    const amount = 30;
    scoreDelta -= amount;
    penalty = {
      type: "cog",
      amount,
      message: `重心偏移 ${cogOffset.toFixed(2)}m，超过吊具允许 ${spreader.offsetLimit}m，吊具即将脱钩。`,
    };
  }
  if (!onRail) {
    const amount = 20;
    scoreDelta -= amount;
    if (!penalty) {
      penalty = {
        type: "rail",
        amount,
        message: `行车脱离轨道（距最近轨道 ${railDist.toFixed(2)}m）。`,
      };
    } else {
      penalty = {
        type: "rail",
        amount: penalty.amount + amount,
        message: penalty.message + " 同时行车脱离轨道。",
      };
    }
  }
  if (crossing) {
    const amount = 40;
    scoreDelta -= amount;
    if (!penalty) {
      penalty = {
        type: "crossing",
        amount,
        message: `路径穿越${inZone === "danger" ? "危险" : "限制"}区，疑似有人员穿越。`,
      };
    } else {
      penalty = {
        type: "crossing",
        amount: penalty.amount + amount,
        message: penalty.message + " 同时发生人员穿越。",
      };
    }
  }
  if (inZone === "danger") {
    terminate = true;
    scoreDelta = -100;
    if (!penalty) {
      penalty = {
        type: "zone",
        amount: 100,
        message: "进入危险禁区，任务立即终止。",
      };
    } else {
      penalty = {
        type: "zone",
        amount: 100,
        message: penalty.message + " 进入危险禁区，任务终止。",
      };
    }
  }

  return { cogOffset, onRail, inZone, crossing, scoreDelta, penalty, terminate };
}

export function gradeFromScore(score: number): StepEvent["position"] extends never
  ? never
  : "S" | "A" | "B" | "C" | "F" {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "F";
}
