import {
  ValidationIssue,
  VisitorRecord,
  ExhibitionHall,
  Route,
  Stairway,
  floors,
} from './museum-data';

export function validateFloorMismatch(
  records: VisitorRecord[],
  halls: ExhibitionHall[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const record of records) {
    if (!record.floorId) continue;
    const hall = halls.find((h) => h.id === record.hallId);
    if (hall && hall.floorId !== record.floorId) {
      const correctFloor = floors.find((f) => f.id === hall.floorId);
      const wrongFloor = floors.find((f) => f.id === record.floorId);
      issues.push({
        id: `VM-${record.id}`,
        type: 'floor_mismatch',
        severity: 'error',
        description: `记录${record.id}标注楼层为${wrongFloor?.name ?? record.floorId}，但展厅「${hall.name}」实际位于${correctFloor?.name ?? hall.floorId}`,
        affectedHalls: [hall.id],
        affectedRoutes: [],
        relatedObjectId: record.id,
      });
    }
  }
  return issues;
}

export function validateDuplicateCount(
  records: VisitorRecord[],
  halls: ExhibitionHall[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const grouped: Record<string, VisitorRecord[]> = {};
  for (const record of records) {
    const key = `${record.hallId}-${record.timestamp}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  }
  for (const [key, group] of Object.entries(grouped)) {
    if (group.length > 1) {
      const hallId = key.split('-')[0];
      const hall = halls.find((h) => h.id === hallId);
      const sources = group.map((r) => r.source).join('、');
      issues.push({
        id: `VD-${key}`,
        type: 'duplicate_count',
        severity: 'warning',
        description: `展厅「${hall?.name ?? hallId}」在时段${key}存在${group.length}条计数记录，来源：${sources}，可能造成重复统计`,
        affectedHalls: [hallId],
        affectedRoutes: [],
        relatedObjectId: key,
      });
    }
  }
  return issues;
}

export function validateRouteBreakpoints(
  routes: Route[],
  halls: ExhibitionHall[],
  stairways: Stairway[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allIds = new Set([
    ...halls.map((h) => h.id),
    ...stairways.map((s) => s.id),
  ]);

  for (const route of routes) {
    const sorted = [...route.segments].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.toId !== next.fromId) {
        const missingId = current.toId;
        const exists = allIds.has(missingId);
        if (!exists) {
          issues.push({
            id: `VB-${route.id}-${current.id}`,
            type: 'route_breakpoint',
            severity: 'error',
            description: `路线「${route.name}」段${current.order}终点${current.toId}与段${next.order}起点${next.fromId}不连续，中间对象${missingId}不存在`,
            affectedHalls: [current.fromId, next.fromId],
            affectedRoutes: [route.id],
            relatedObjectId: current.id,
          });
        } else {
          issues.push({
            id: `VB-${route.id}-${current.id}`,
            type: 'route_breakpoint',
            severity: 'warning',
            description: `路线「${route.name}」段${current.order}终点与段${next.order}起点不连续，缺少连接段（${current.toId} → ${next.fromId}）`,
            affectedHalls: [current.fromId, next.fromId],
            affectedRoutes: [route.id],
            relatedObjectId: current.id,
          });
        }
      }
    }
  }
  return issues;
}

export function runAllValidations(
  records: VisitorRecord[],
  halls: ExhibitionHall[],
  routes: Route[],
  stairways: Stairway[]
): ValidationIssue[] {
  return [
    ...validateFloorMismatch(records, halls),
    ...validateDuplicateCount(records, halls),
    ...validateRouteBreakpoints(routes, halls, stairways),
  ];
}
