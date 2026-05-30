import type {
  Valve,
  InspectionRoute,
  WorkOrder,
  GallerySegment,
  DuplicateValveIssue,
  RouteCrossZoneIssue,
  OverdueWorkOrderIssue,
  AnalysisReport,
} from '@/data/types';

export function detectDuplicateValves(valves: Valve[]): DuplicateValveIssue[] {
  const grouped = new Map<string, Valve[]>();
  valves.forEach((v) => {
    const list = grouped.get(v.valveId) || [];
    list.push(v);
    grouped.set(v.valveId, list);
  });
  const issues: DuplicateValveIssue[] = [];
  grouped.forEach((valveList, valveId) => {
    if (valveList.length > 1) {
      issues.push({ type: 'duplicate_valve', valveId, valves: valveList });
    }
  });
  return issues;
}

export function detectRouteCrossZone(
  routes: InspectionRoute[],
  valves: Valve[],
  segments: GallerySegment[]
): RouteCrossZoneIssue[] {
  const segmentMap = new Map<string, GallerySegment>();
  segments.forEach((s) => segmentMap.set(s.id, s));

  function getZone(galleryId: string): string | undefined {
    return segmentMap.get(galleryId)?.radiationZone;
  }

  const issues: RouteCrossZoneIssue[] = [];
  const seen = new Set<string>();

  routes.forEach((route) => {
    const seqValves: Valve[] = [];
    const valveCounters = new Map<string, number>();

    for (const vid of route.valveSequence) {
      const count = valveCounters.get(vid) || 0;
      const matches = valves.filter((v) => v.valveId === vid);
      if (matches.length > 0) {
        const picked = matches[Math.min(count, matches.length - 1)];
        seqValves.push(picked);
      }
      valveCounters.set(vid, count + 1);
    }

    for (let i = 0; i < seqValves.length - 1; i++) {
      const fv = seqValves[i];
      const tv = seqValves[i + 1];
      const fromZone = getZone(fv.galleryId);
      const toZone = getZone(tv.galleryId);
      if (fromZone && toZone && fromZone !== toZone) {
        const dedupKey = `${route.routeId}:${fv.valveId}@${fv.galleryId}→${tv.valveId}@${tv.galleryId}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          const severity = toZone === 'red' || fromZone === 'red' ? 'critical' : 'warning';
          issues.push({
            type: 'route_cross_zone',
            routeId: route.routeId,
            fromZone: fromZone as 'green' | 'yellow' | 'red',
            toZone: toZone as 'green' | 'yellow' | 'red',
            fromValve: `${fv.valveId}@${fv.galleryId}`,
            toValve: `${tv.valveId}@${tv.galleryId}`,
            severity,
          });
        }
      }
    }
  });

  return issues;
}

export function detectOverdueWorkOrders(orders: WorkOrder[]): OverdueWorkOrderIssue[] {
  const now = new Date();
  const issues: OverdueWorkOrderIssue[] = [];
  orders.forEach((order) => {
    if (order.status === 'overdue' || (order.status !== 'completed' && new Date(order.dueDate) < now)) {
      const dueDate = new Date(order.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      issues.push({
        type: 'overdue_workorder',
        workOrderId: order.workOrderId,
        valveRef: order.valveRef,
        dueDate: order.dueDate,
        overdueDays,
      });
    }
  });
  return issues;
}

export function generateReport(
  valves: Valve[],
  routes: InspectionRoute[],
  orders: WorkOrder[],
  segments: GallerySegment[]
): AnalysisReport {
  const dupIssues = detectDuplicateValves(valves);
  const crossZoneIssues = detectRouteCrossZone(routes, valves, segments);
  const overdueIssues = detectOverdueWorkOrders(orders);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalValves: valves.length,
      duplicateValveGroups: dupIssues.length,
      duplicateValveIds: dupIssues.map((d) => d.valveId),
      routeCrossZoneIssues: crossZoneIssues.length,
      crossZoneRoutes: [...new Set(crossZoneIssues.map((c) => c.routeId))],
      overdueWorkOrders: overdueIssues.length,
      overdueWorkOrderIds: overdueIssues.map((o) => o.workOrderId),
    },
    duplicateValveDetails: dupIssues,
    routeCrossZoneDetails: crossZoneIssues,
    overdueWorkOrderDetails: overdueIssues,
  };
}
