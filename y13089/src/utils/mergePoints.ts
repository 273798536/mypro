import type { PointCoordinate, MergedPointGroup } from '@/types';

function calculateDistance(p1: PointCoordinate, p2: PointCoordinate): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function mergeAdjacentPoints(
  points: PointCoordinate[],
  threshold: number
): MergedPointGroup[] {
  const groups: MergedPointGroup[] = [];
  const visited = new Set<string>();

  for (const point of points) {
    if (visited.has(point.id)) continue;

    const cluster: PointCoordinate[] = [point];
    visited.add(point.id);

    const queue: PointCoordinate[] = [point];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const other of points) {
        if (visited.has(other.id)) continue;
        if (other.showcaseId !== current.showcaseId) continue;
        
        const distance = calculateDistance(current, other);
        if (distance <= threshold) {
          cluster.push(other);
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    if (cluster.length > 1) {
      const names = cluster.map((p) => p.name);
      const uniqueNames = [...new Set(names)];
      const isNameConsistent = uniqueNames.length === 1;
      
      const xs = cluster.map((p) => p.x);
      const ys = cluster.map((p) => p.y);
      const zs = cluster.map((p) => p.z);
      
      const centroid = {
        x: xs.reduce((a, b) => a + b, 0) / cluster.length,
        y: ys.reduce((a, b) => a + b, 0) / cluster.length,
        z: zs.reduce((a, b) => a + b, 0) / cluster.length
      };

      const boundingBox = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs)
      };

      groups.push({
        groupId: `GRP-${groups.length + 1}`,
        mergedName: isNameConsistent ? uniqueNames[0] : `合并组(${uniqueNames.length}个名称)`,
        points: cluster,
        isNameConsistent,
        inconsistentNames: isNameConsistent ? [] : uniqueNames,
        centroid,
        boundingBox
      });
    }
  }

  return groups;
}

export function formatOriginalPointEvidence(point: PointCoordinate): string {
  return `[${point.id}] ${point.originalName} @ (X:${point.x}, Y:${point.y}, Z:${point.z}) - 来源: ${point.sourceFile} 第${point.rowNumber}行`;
}

export function generateMergeWarning(group: MergedPointGroup): string {
  const pointEvidence = group.points.map(formatOriginalPointEvidence).join('\n  ');
  
  if (!group.isNameConsistent) {
    return `⚠️ 合并警告: 组${group.groupId}包含${group.points.length}个相邻点位，但名称不一致。\n原始点位信息:\n  ${pointEvidence}\n不一致的名称: ${group.inconsistentNames.join(', ')}\n建议: 请人工确认这些点位是否应合并，或是否存在命名错误。`;
  }
  
  return `ℹ️ 合并提示: 组${group.groupId}包含${group.points.length}个相邻点位，已自动合并。\n原始点位信息:\n  ${pointEvidence}`;
}
