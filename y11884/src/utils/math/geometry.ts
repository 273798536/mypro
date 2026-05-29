import type { Vector2D, PathNode, PathValidation } from '../../types';

export function vectorLength(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v: Vector2D): Vector2D {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function dotProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function addVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVector(v: Vector2D, scalar: number): Vector2D {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function distance(a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lineSegmentsIntersect(
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  p4: Vector2D
): Vector2D | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-10) return null;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua > 0.001 && ua < 0.999 && ub > 0.001 && ub < 0.999) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
}

export function detectSelfIntersection(nodes: PathNode[]): Vector2D[] {
  const intersections: Vector2D[] = [];
  if (nodes.length < 4) return intersections;

  for (let i = 0; i < nodes.length - 1; i++) {
    for (let j = i + 2; j < nodes.length - 1; j++) {
      if (i === 0 && j === nodes.length - 2) continue;
      const intersection = lineSegmentsIntersect(
        nodes[i].position,
        nodes[i + 1].position,
        nodes[j].position,
        nodes[j + 1].position
      );
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }
  return intersections;
}

export function computePathDirection(nodes: PathNode[]): 1 | -1 {
  if (nodes.length < 3) return 1;

  let signedArea = 0;
  for (let i = 0; i < nodes.length; i++) {
    const j = (i + 1) % nodes.length;
    signedArea +=
      nodes[i].position.x * nodes[j].position.y -
      nodes[j].position.x * nodes[i].position.y;
  }

  return signedArea >= 0 ? 1 : -1;
}

export function getPathLength(nodes: PathNode[]): number {
  let length = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    length += distance(nodes[i].position, nodes[i + 1].position);
  }
  return length;
}

export function interpolatePath(nodes: PathNode[], stepSize: number): PathNode[] {
  if (nodes.length < 2) return nodes;

  const interpolated: PathNode[] = [];
  let idCounter = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    const start = nodes[i].position;
    const end = nodes[i + 1].position;
    const segmentLength = distance(start, end);
    const steps = Math.max(1, Math.ceil(segmentLength / stepSize));

    interpolated.push({
      id: `interp-${idCounter++}`,
      position: { ...start },
    });

    for (let j = 1; j < steps; j++) {
      const t = j / steps;
      interpolated.push({
        id: `interp-${idCounter++}`,
        position: {
          x: start.x + t * (end.x - start.x),
          y: start.y + t * (end.y - start.y),
        },
      });
    }
  }

  interpolated.push({
    id: `interp-${idCounter++}`,
    position: { ...nodes[nodes.length - 1].position },
  });

  return interpolated;
}

export function computeTangent(
  nodes: PathNode[],
  index: number
): Vector2D {
  if (nodes.length < 2) return { x: 1, y: 0 };

  if (index === 0) {
    return normalizeVector(
      subtractVectors(nodes[1].position, nodes[0].position)
    );
  }

  if (index === nodes.length - 1) {
    return normalizeVector(
      subtractVectors(
        nodes[nodes.length - 1].position,
        nodes[nodes.length - 2].position
      )
    );
  }

  const prev = subtractVectors(nodes[index].position, nodes[index - 1].position);
  const next = subtractVectors(nodes[index + 1].position, nodes[index].position);
  return normalizeVector({
    x: (prev.x + next.x) / 2,
    y: (prev.y + next.y) / 2,
  });
}

export function checkBounds(
  nodes: PathNode[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): Vector2D[] {
  const outOfBounds: Vector2D[] = [];
  for (const node of nodes) {
    if (
      node.position.x < bounds.minX ||
      node.position.x > bounds.maxX ||
      node.position.y < bounds.minY ||
      node.position.y > bounds.maxY
    ) {
      outOfBounds.push({ ...node.position });
    }
  }
  return outOfBounds;
}

export function validatePath(
  path: PathNode[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  stepSize: number
): PathValidation {
  const suggestions: string[] = [];
  const nodeCount = path.length;

  const intersections = detectSelfIntersection(path);
  const hasSelfIntersection = intersections.length > 0;

  if (hasSelfIntersection) {
    suggestions.push(
      `检测到 ${intersections.length} 个自交点，积分结果可能不连续`
    );
  }

  const outOfBounds = checkBounds(path, bounds);
  const isOutOfBounds = outOfBounds.length > 0;

  if (isOutOfBounds) {
    suggestions.push(
      `${outOfBounds.length} 个节点超出向量场边界，请调整路径位置`
    );
  }

  const pathLength = getPathLength(path);
  const expectedSteps = pathLength / stepSize;
  const stepSizeWarning = expectedSteps < 20;
  let recommendedStep = stepSize;

  if (stepSizeWarning) {
    recommendedStep = pathLength / 50;
    suggestions.push(
      `步长过大，建议设置为 ${recommendedStep.toFixed(3)} 以提高精度`
    );
  }

  if (nodeCount < 3) {
    suggestions.push('路径节点过少，建议添加更多节点以定义平滑曲线');
  }

  return {
    isValid: !hasSelfIntersection && !isOutOfBounds,
    nodeCount,
    hasSelfIntersection,
    intersectionPoints: intersections,
    isOutOfBounds,
    outOfBoundsPoints: outOfBounds,
    stepSizeWarning,
    recommendedStep,
    suggestions,
  };
}
