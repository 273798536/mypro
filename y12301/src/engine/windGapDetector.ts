import { BuildingBlock, WindDirection, AnomalyItem } from '../types';

interface WindCorridor {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
}

function createWindCorridor(wind: WindDirection, siteSize: number): WindCorridor {
  const rad = (wind.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dz = Math.cos(rad);

  return {
    startX: -dx * siteSize,
    startZ: -dz * siteSize,
    endX: dx * siteSize,
    endZ: dz * siteSize,
    width: 20 + wind.speed * 3,
  };
}

function pointToLineDistance(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const A = px - x1;
  const B = pz - z1;
  const C = x2 - x1;
  const D = z2 - z1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, zz;

  if (param < 0) {
    xx = x1;
    zz = z1;
  } else if (param > 1) {
    xx = x2;
    zz = z2;
  } else {
    xx = x1 + param * C;
    zz = z1 + param * D;
  }

  const dx = px - xx;
  const dz = pz - zz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function detectWindGaps(
  buildings: BuildingBlock[],
  windData: WindDirection[],
  obstructionThreshold: number = 0.4
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  for (const wind of windData) {
    if (wind.frequency < 0.15) continue;

    const corridor = createWindCorridor(wind, 150);
    const obstructingBuildings: { building: BuildingBlock; obstructionRate: number }[] = [];

    for (const building of buildings) {
      const distance = pointToLineDistance(
        building.position.x,
        building.position.z,
        corridor.startX,
        corridor.startZ,
        corridor.endX,
        corridor.endZ
      );

      const effectiveWidth = corridor.width / 2 + building.dimensions.width / 2;

      if (distance < effectiveWidth) {
        const overlapRatio = 1 - distance / effectiveWidth;
        const heightFactor = Math.min(1, building.dimensions.height / 50);
        const obstructionRate = overlapRatio * heightFactor * wind.frequency;

        if (obstructionRate > 0.15) {
          obstructingBuildings.push({ building, obstructionRate });
        }
      }
    }

    const totalObstruction = obstructingBuildings.reduce(
      (sum, b) => sum + b.obstructionRate,
      0
    );

    if (totalObstruction > obstructionThreshold) {
      const buildingNames = obstructingBuildings
        .slice(0, 3)
        .map((b) => b.building.name)
        .join('、');
      const moreCount = obstructingBuildings.length > 3 ? obstructingBuildings.length - 3 : 0;

      const windDirectionName = getWindDirectionName(wind.angle);

      anomalies.push({
        id: `wind-gap-${wind.timePeriod}-${Math.round(wind.angle)}`,
        type: 'wind_gap',
        severity: totalObstruction > 0.6 ? 'error' : 'warning',
        relatedEntities: obstructingBuildings.map((b) => b.building.id),
        reason: `${windDirectionName}风（${wind.timePeriod}）廊道受阻，遮挡率约 ${(totalObstruction * 100).toFixed(0)}%，主要受阻建筑：${buildingNames}${moreCount > 0 ? `等${moreCount}栋` : ''}`,
        suggestion: generateWindGapSuggestion(wind, obstructingBuildings, totalObstruction),
        position: {
          x: (corridor.startX + corridor.endX) / 4,
          y: 30,
          z: (corridor.startZ + corridor.endZ) / 4,
        },
        obstructionRate: totalObstruction,
        resolved: false,
      });
    }
  }

  return anomalies;
}

function getWindDirectionName(angle: number): string {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(((angle % 360) / 45) % 8);
  return directions[index];
}

function generateWindGapSuggestion(
  wind: WindDirection,
  obstructingBuildings: { building: BuildingBlock; obstructionRate: number }[],
  totalObstruction: number
): string {
  const suggestions: string[] = [];
  const windDir = getWindDirectionName(wind.angle);

  if (totalObstruction > 0.6) {
    suggestions.push(`【严重】${windDir}风廊道严重受阻，需重点优化`);
  } else {
    suggestions.push(`${windDir}风廊道存在遮挡，建议优化`);
  }

  const sorted = [...obstructingBuildings].sort(
    (a, b) => b.obstructionRate - a.obstructionRate
  );

  if (sorted.length > 0) {
    const worst = sorted[0];
    suggestions.push(
      `建议优先调整 ${worst.building.name}，可降低高度至 ${Math.max(20, worst.building.dimensions.height - 20)}m 以下`
    );

    if (sorted.length > 1) {
      suggestions.push(
        `或考虑将 ${worst.building.name} 沿垂直于风廊方向移位`
      );
    }
  }

  suggestions.push('可采用错落式布局，引导气流绕过建筑');
  suggestions.push('在迎风面设置开敞空间或底层架空');

  return suggestions.join('；');
}
