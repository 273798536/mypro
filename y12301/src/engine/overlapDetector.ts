import { BuildingBlock, AnomalyItem } from '../types';

interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

function getBuildingAABB(building: BuildingBlock): AABB {
  return {
    minX: building.position.x - building.dimensions.width / 2,
    maxX: building.position.x + building.dimensions.width / 2,
    minZ: building.position.z - building.dimensions.depth / 2,
    maxZ: building.position.z + building.dimensions.depth / 2,
    minY: building.position.y,
    maxY: building.position.y + building.dimensions.height,
  };
}

function calculateOverlapVolume(a: AABB, b: AABB): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapZ = Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
  const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return overlapX * overlapZ * overlapY;
}

function calculateOverlapArea(a: AABB, b: AABB): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapZ = Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
  return overlapX * overlapZ;
}

export function detectOverlaps(buildings: BuildingBlock[]): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const pairKey = `${buildings[i].id}-${buildings[j].id}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const aabbA = getBuildingAABB(buildings[i]);
      const aabbB = getBuildingAABB(buildings[j]);
      const overlapVolume = calculateOverlapVolume(aabbA, aabbB);
      const overlapArea = calculateOverlapArea(aabbA, aabbB);

      if (overlapVolume > 0) {
        const buildingAVolume =
          buildings[i].dimensions.width *
          buildings[i].dimensions.depth *
          buildings[i].dimensions.height;
        const overlapRatio = overlapVolume / buildingAVolume;

        const centerX = (buildings[i].position.x + buildings[j].position.x) / 2;
        const centerZ = (buildings[i].position.z + buildings[j].position.z) / 2;
        const centerY =
          (buildings[i].dimensions.height + buildings[j].dimensions.height) / 4;

        const suggestion = generateOverlapSuggestion(
          buildings[i],
          buildings[j],
          overlapArea,
          overlapRatio
        );

        anomalies.push({
          id: `overlap-${buildings[i].id}-${buildings[j].id}`,
          type: 'overlap',
          severity: overlapRatio > 0.3 ? 'error' : 'warning',
          relatedEntities: [buildings[i].id, buildings[j].id],
          reason: `${buildings[i].name} 与 ${buildings[j].name} 发生体块重叠，重叠面积约 ${overlapArea.toFixed(1)} ㎡，重叠体积约 ${overlapVolume.toFixed(1)} m³`,
          suggestion,
          position: { x: centerX, y: centerY, z: centerZ },
          overlapVolume,
          resolved: false,
        });
      }
    }
  }

  return anomalies;
}

function generateOverlapSuggestion(
  a: BuildingBlock,
  b: BuildingBlock,
  overlapArea: number,
  overlapRatio: number
): string {
  const suggestions: string[] = [];

  if (overlapRatio > 0.5) {
    suggestions.push('【严重】两建筑体块大面积重合，需重新考虑布局方案');
    suggestions.push(`建议将 ${a.name} 或 ${b.name} 整体移位`);
  } else if (overlapRatio > 0.2) {
    suggestions.push('建议调整其中一栋建筑的位置');
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    if (Math.abs(dx) > Math.abs(dz)) {
      suggestions.push(`可尝试沿X轴方向移动 ${dx > 0 ? b.name : a.name} 约 ${Math.abs(dx) / 2 + 5}m`);
    } else {
      suggestions.push(`可尝试沿Z轴方向移动 ${dz > 0 ? b.name : a.name} 约 ${Math.abs(dz) / 2 + 5}m`);
    }
  } else {
    suggestions.push('轻微重叠，可微调建筑位置解决');
    suggestions.push('或考虑调整建筑尺寸以消除重叠');
  }

  suggestions.push('也可考虑合并两建筑为一个综合体');

  return suggestions.join('；');
}
