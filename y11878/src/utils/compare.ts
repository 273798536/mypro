import type { Scenario, Route } from '@/types';
import { runFullAnalysis } from './bottleneck';

export function compareScenarios(
  base: Scenario,
  modified: Scenario
): {
  flowDiff: number;
  flowDiffPercent: number;
  bottleneckChanges: { routeId: string; before: number; after: number }[];
  improvedRoutes: string[];
  newBottlenecks: string[];
  resolvedBottlenecks: string[];
} {
  const flowDiff = modified.result.maxFlow - base.result.maxFlow;
  const flowDiffPercent =
    base.result.maxFlow > 0 ? (flowDiff / base.result.maxFlow) * 100 : 0;

  const bottleneckChanges: { routeId: string; before: number; after: number }[] = [];
  const baseBottleneckIds = new Set(base.result.bottleneckRoutes.map((r) => r.id));
  const modifiedBottleneckIds = new Set(modified.result.bottleneckRoutes.map((r) => r.id));

  const allRouteIds = new Set([
    ...base.routes.map((r) => r.id),
    ...modified.routes.map((r) => r.id),
  ]);

  allRouteIds.forEach((routeId) => {
    const beforeRoute = base.routes.find((r) => r.id === routeId);
    const afterRoute = modified.routes.find((r) => r.id === routeId);
    if (!beforeRoute || !afterRoute) return;

    const before = beforeRoute.capacity > 0 ? (base.result.routeFlows[routeId] || 0) / beforeRoute.capacity : 0;
    const after = afterRoute.capacity > 0 ? (modified.result.routeFlows[routeId] || 0) / afterRoute.capacity : 0;

    if (Math.abs(before - after) > 0.01) {
      bottleneckChanges.push({ routeId, before, after });
    }
  });

  const improvedRoutes: string[] = [];
  baseBottleneckIds.forEach((id) => {
    if (!modifiedBottleneckIds.has(id)) {
      improvedRoutes.push(id);
    }
  });

  const newBottlenecks: string[] = [];
  modifiedBottleneckIds.forEach((id) => {
    if (!baseBottleneckIds.has(id)) {
      newBottlenecks.push(id);
    }
  });

  const resolvedBottlenecks: string[] = [];
  baseBottleneckIds.forEach((id) => {
    if (!modifiedBottleneckIds.has(id)) {
      resolvedBottlenecks.push(id);
    }
  });

  return {
    flowDiff,
    flowDiffPercent,
    bottleneckChanges,
    improvedRoutes,
    newBottlenecks,
    resolvedBottlenecks,
  };
}

export function createScenario(
  name: string,
  nodes: any[],
  routes: any[]
): Scenario {
  const result = runFullAnalysis(nodes, routes);
  return {
    id: `scenario-${Date.now()}`,
    name,
    createdAt: Date.now(),
    nodes: JSON.parse(JSON.stringify(nodes)),
    routes: JSON.parse(JSON.stringify(routes)),
    result,
  };
}
