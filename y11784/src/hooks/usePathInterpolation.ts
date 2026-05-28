import { useMemo } from 'react';
import type { PathNode, Point2D } from '@/types';
import { interpolatePath, pathLength, sortPathNodes } from '@/utils/math/pathGeometry';

export function usePathInterpolation(nodes: PathNode[], stepSize: number) {
  const sortedNodes = useMemo(() => sortPathNodes(nodes), [nodes]);

  const interpolatedPoints = useMemo<Point2D[]>(() => {
    if (sortedNodes.length < 2) return sortedNodes;
    return interpolatePath(sortedNodes, stepSize);
  }, [sortedNodes, stepSize]);

  const length = useMemo(() => pathLength(sortedNodes), [sortedNodes]);

  const nodePositions = useMemo<Array<{ t: number; point: Point2D }>>(() => {
    if (sortedNodes.length < 2) return [];
    const positions: Array<{ t: number; point: Point2D }> = [];
    let cumulativeLength = 0;

    for (let i = 0; i < sortedNodes.length; i++) {
      if (i > 0) {
        cumulativeLength += Math.sqrt(
          (sortedNodes[i].x - sortedNodes[i - 1].x) ** 2 +
            (sortedNodes[i].y - sortedNodes[i - 1].y) ** 2
        );
      }
      positions.push({
        t: length > 0 ? cumulativeLength / length : 0,
        point: sortedNodes[i],
      });
    }

    return positions;
  }, [sortedNodes, length]);

  return {
    sortedNodes,
    interpolatedPoints,
    length,
    nodePositions,
  };
}
