import type {
  Submarine,
  OceanEnvironment,
  Obstacle,
  TreasureChest,
  GameResult,
  BoundaryType,
} from "./types";

export interface BoundaryCheckResult {
  triggered: boolean;
  result: GameResult | null;
  warning: string | null;
  boundaryType: BoundaryType | null;
}

export function checkDensityZoneChange(
  prevY: number,
  currentY: number,
  environment: OceanEnvironment
): { entered: boolean; exited: boolean; zoneId: string | null } {
  const prevDensity = getDensityAtDepth(prevY, environment);
  const currentDensity = getDensityAtDepth(currentY, environment);

  if (Math.abs(prevDensity - currentDensity) > 0.1) {
    const zone = environment.densityZones.find(
      (z) => currentY >= z.startY && currentY <= z.endY
    );
    return {
      entered: currentDensity > prevDensity,
      exited: currentDensity < prevDensity,
      zoneId: zone?.id ?? null,
    };
  }

  return { entered: false, exited: false, zoneId: null };
}

function getDensityAtDepth(y: number, environment: OceanEnvironment): number {
  for (const zone of environment.densityZones) {
    if (y >= zone.startY && y <= zone.endY) {
      return zone.density;
    }
  }
  return environment.baseDensity;
}

export function checkBoundaries(
  submarine: Submarine,
  environment: OceanEnvironment,
  obstacles: Obstacle[],
  treasure: TreasureChest | null,
  settings: { enableDensityZones: boolean; enableOxygen: boolean; enableCollision: boolean },
  targetDepth: number
): BoundaryCheckResult {
  if (submarine.y >= targetDepth - 1 && submarine.y <= targetDepth + 1 && Math.abs(submarine.vy) < 0.5) {
    return {
      triggered: true,
      result: {
        boundaryType: "SUCCESS",
        success: true,
        message: `成功到达目标深度 ${targetDepth}m！`,
        timestamp: Date.now(),
        frame: 0,
      },
      warning: null,
      boundaryType: "SUCCESS",
    };
  }

  if (environment.oxygenRemaining <= 0 && settings.enableOxygen) {
    return {
      triggered: true,
      result: {
        boundaryType: "OXYGEN_DEPLETED",
        success: false,
        message: "氧气耗尽！潜艇无法继续作业。",
        timestamp: Date.now(),
        frame: 0,
      },
      warning: null,
      boundaryType: "OXYGEN_DEPLETED",
    };
  }

  if (submarine.y >= environment.maxDepth) {
    return {
      triggered: true,
      result: {
        boundaryType: "EXCEED_MAX_DEPTH",
        success: false,
        message: `超过最大深度 ${environment.maxDepth}m！潜艇结构受损。`,
        timestamp: Date.now(),
        frame: 0,
      },
      warning: null,
      boundaryType: "EXCEED_MAX_DEPTH",
    };
  }

  if (settings.enableCollision) {
    for (const obs of obstacles) {
      if (
        submarine.x >= obs.x - 3 &&
        submarine.x <= obs.x + obs.width + 3 &&
        submarine.y >= obs.y - 1.5 &&
        submarine.y <= obs.y + obs.height + 1.5
      ) {
        return {
          triggered: true,
          result: {
            boundaryType: "COLLISION",
            success: false,
            message: `碰撞障碍物！位置 (${obs.x}, ${obs.y})，碰撞误判边界过小可能导致此问题。`,
            timestamp: Date.now(),
            frame: 0,
          },
          warning: null,
          boundaryType: "COLLISION",
        };
      }
    }
  }

  const warnings: string[] = [];

  if (settings.enableOxygen && environment.oxygenRemaining < 24) {
    warnings.push(`氧气不足：剩余 ${Math.ceil(environment.oxygenRemaining)}s`);
  }

  if (settings.enableDensityZones) {
    const zone = environment.densityZones.find(
      (z) => submarine.y >= z.startY && submarine.y <= z.endY
    );
    if (zone) {
      warnings.push(`密度突变区域：${zone.density} kg/m³`);
    }
  }

  if (settings.enableCollision) {
    for (const obs of obstacles) {
      const dx = Math.abs(submarine.x - (obs.x + obs.width / 2));
      const dy = Math.abs(submarine.y - (obs.y + obs.height / 2));
      if (dx < obs.width && dy < obs.height + 3) {
        warnings.push(`接近障碍物：(${obs.x}, ${obs.y})`);
      }
    }
  }

  return {
    triggered: false,
    result: null,
    warning: warnings.length > 0 ? warnings.join(" | ") : null,
    boundaryType: null,
  };
}

export function checkTreasureCollection(
  submarine: Submarine,
  treasure: TreasureChest | null
): boolean {
  if (!treasure || treasure.collected) return false;
  const dx = Math.abs(submarine.x - treasure.x);
  const dy = Math.abs(submarine.y - treasure.y);
  return dx < 3 && dy < 3;
}
