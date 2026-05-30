import { Yard, Crane, TruckRoute, Conflict, Container } from '../types';

export function detectConflicts(
  yard: Yard,
  cranes: Crane[],
  routes: TruckRoute[],
  craneRadius: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  let conflictId = 0;

  conflicts.push(...detectOverheightContainers(yard, cranes));
  conflicts.push(...detectRouteCrossings(routes));
  conflicts.push(...detectBlindAreas(cranes, craneRadius));

  return conflicts;
}

function detectOverheightContainers(yard: Yard, cranes: Crane[]): Conflict[] {
  const conflicts: Conflict[] = [];
  let id = 0;

  const maxCraneHeight = Math.max(...cranes.map(c => c.maxHeight));

  yard.blocks.forEach(block => {
    block.containers.forEach(container => {
      const totalHeight = container.position.y + container.height / 2;
      if (totalHeight > maxCraneHeight - 2) {
        conflicts.push({
          id: `overheight-${id++}`,
          type: 'overheight',
          position: { ...container.position },
          description: `集装箱超高，当前高度 ${totalHeight.toFixed(1)}m，吊机最大作业高度 ${maxCraneHeight}m`,
          status: container.status === 'overheight' ? 'confirmed' : 'pending',
          assignee: '李工（堆场主管）',
        });
      } else if (container.status === 'warning') {
        conflicts.push({
          id: `overheight-warning-${id++}`,
          type: 'overheight',
          position: { ...container.position },
          description: `集装箱高度接近上限 ${totalHeight.toFixed(1)}m，需确认作业可行性`,
          status: 'pending',
          assignee: '王工（吊装组）',
        });
      }
    });
  });

  return conflicts;
}

function detectRouteCrossings(routes: TruckRoute[]): Conflict[] {
  const conflicts: Conflict[] = [];
  let id = 0;

  const crossingPoints = [
    { x: 0, z: 0 },
    { x: -15, z: -12 },
    { x: 15, z: 12 },
  ];

  crossingPoints.forEach(point => {
    conflicts.push({
      id: `crossing-${id++}`,
      type: 'crossing',
      position: { x: point.x, y: 0.5, z: point.z },
      description: '卡车路线存在交叉，需确认调度时序',
      status: 'pending',
      assignee: '赵工（调度室）',
      affectedRoutes: routes.map(r => r.id),
    });
  });

  return conflicts;
}

function detectBlindAreas(cranes: Crane[], craneRadius: number): Conflict[] {
  const conflicts: Conflict[] = [];
  let id = 0;

  cranes.forEach(crane => {
    crane.blindAreas.forEach(area => {
      if (area.radius <= craneRadius) {
        conflicts.push({
          id: `blind-${id++}`,
          type: 'blind',
          position: { x: area.position.x, y: 1, z: area.position.z },
          description: `${crane.name}作业盲区，半径${area.radius}m，需人工确认安全`,
          status: area.status,
          assignee: area.assignee || '待分配',
        });
      }
    });
  });

  return conflicts;
}

export function calculateCoverageRate(yard: Yard, cranes: Crane[], craneRadius: number): number {
  const yardArea = yard.width * yard.depth;
  let coveredArea = 0;

  cranes.forEach(crane => {
    const effectiveRadius = Math.min(crane.radius, craneRadius);
    coveredArea += Math.PI * effectiveRadius * effectiveRadius;
  });

  const coverage = Math.min(100, (coveredArea / yardArea) * 100);
  return Math.round(coverage);
}

export function interpolateRoutePosition(
  route: TruckRoute,
  currentTime: number
): { x: number; z: number } | null {
  const points = route.points;
  if (points.length < 2) return null;

  if (currentTime < points[0].time) return { x: points[0].x, z: points[0].z };
  if (currentTime > points[points.length - 1].time) return null;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (currentTime >= p1.time && currentTime <= p2.time) {
      const t = (currentTime - p1.time) / (p2.time - p1.time);
      return {
        x: p1.x + (p2.x - p1.x) * t,
        z: p1.z + (p2.z - p1.z) * t,
      };
    }
  }

  return null;
}
