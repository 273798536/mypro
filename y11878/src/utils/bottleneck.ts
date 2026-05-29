import type { Node, Route, AnalysisResult, RouteConstraint } from '@/types';
import { edmondsKarp } from './maxFlow';

export function detectIsolatedNodes(nodes: Node[], routes: Route[]): Node[] {
  const connectedNodes = new Set<string>();
  routes.forEach((route) => {
    if (route.capacity > 0 && !route.isDisabled) {
      connectedNodes.add(route.from);
      connectedNodes.add(route.to);
    }
  });
  return nodes.filter((node) => !connectedNodes.has(node.id) || node.isIsolated);
}

export function detectZeroCapacityRoutes(routes: Route[]): Route[] {
  return routes.filter((route) => route.capacity === 0 && !route.isDisabled);
}

export function detectDisabledNotEffective(routes: Route[], routeFlows: Record<string, number>): Route[] {
  return routes.filter((route) => route.isDisabled && (routeFlows[route.id] || 0) > 0);
}

export function identifyBottleneckRoutes(
  routes: Route[],
  routeFlows: Record<string, number>,
  threshold: number = 0.9
): Route[] {
  return routes
    .filter((route) => {
      if (route.capacity === 0 || route.isDisabled) return false;
      const flow = routeFlows[route.id] || 0;
      const utilization = route.capacity > 0 ? flow / route.capacity : 0;
      return utilization >= threshold;
    })
    .sort((a, b) => {
      const utilA = routeFlows[a.id] ? routeFlows[a.id] / (a.capacity || 1) : 0;
      const utilB = routeFlows[b.id] ? routeFlows[b.id] / (b.capacity || 1) : 0;
      return utilB - utilA;
    });
}

export function analyzeConstraints(
  routeId: string,
  nodes: Node[],
  routes: Route[],
  routeFlows: Record<string, number>
): RouteConstraint[] {
  const route = routes.find((r) => r.id === routeId);
  if (!route) return [];

  const constraints: RouteConstraint[] = [];
  const fromNode = nodes.find((n) => n.id === route.from);
  const toNode = nodes.find((n) => n.id === route.to);

  if (fromNode && fromNode.type !== 'demand') {
    const upstreamRoutes = routes.filter(
      (r) => r.to === fromNode.id && r.capacity > 0 && !r.isDisabled
    );
    const totalUpstreamFlow = upstreamRoutes.reduce(
      (sum, r) => sum + (routeFlows[r.id] || 0),
      0
    );
    const upstreamUtilization =
      fromNode.capacity > 0 ? totalUpstreamFlow / fromNode.capacity : 0;

    if (upstreamUtilization > 0.8) {
      constraints.push({
        type: 'upstream',
        nodeId: fromNode.id,
        nodeName: fromNode.name,
        impact: Math.round(upstreamUtilization * 100),
        description: `上游节点 ${fromNode.name} 容量利用率 ${Math.round(
          upstreamUtilization * 100
        )}%, 可能限制该线路流量`,
      });
    }
  }

  if (toNode) {
    const downstreamRoutes = routes.filter(
      (r) => r.from === toNode.id && r.capacity > 0 && !r.isDisabled
    );
    const totalDownstreamFlow = downstreamRoutes.reduce(
      (sum, r) => sum + (routeFlows[r.id] || 0),
      0
    );
    const downstreamCapacity = downstreamRoutes.reduce(
      (sum, r) => sum + r.capacity,
      0
    );
    const downstreamUtilization =
      downstreamCapacity > 0 ? totalDownstreamFlow / downstreamCapacity : 0;

    if (downstreamUtilization > 0.8) {
      constraints.push({
        type: 'downstream',
        nodeId: toNode.id,
        nodeName: toNode.name,
        impact: Math.round(downstreamUtilization * 100),
        description: `下游节点 ${toNode.name} 出口线路利用率 ${Math.round(
          downstreamUtilization * 100
        )}%, 形成堵点传导至该线路`,
      });
    }
  }

  const parallelRoutes = routes.filter(
    (r) =>
      r.from === route.from &&
      r.to === route.to &&
      r.id !== route.id &&
      r.capacity > 0 &&
      !r.isDisabled
  );
  parallelRoutes.forEach((pr) => {
    const prFlow = routeFlows[pr.id] || 0;
    const prUtil = pr.capacity > 0 ? prFlow / pr.capacity : 0;
    if (prUtil > 0.7) {
      constraints.push({
        type: 'parallel',
        nodeId: pr.id,
        nodeName: `${pr.from}→${pr.to}`,
        impact: Math.round(prUtil * 100),
        description: `并行线路 ${pr.from}→${pr.to} 也处于高负载 (${Math.round(
          prUtil * 100
        )}%), 分流能力有限`,
      });
    }
  });

  return constraints;
}

export function runFullAnalysis(nodes: Node[], routes: Route[]): AnalysisResult {
  const sourceNode = nodes.find((n) => n.isSource);
  const sinkNodes = nodes.filter((n) => n.isSink);

  if (!sourceNode || sinkNodes.length === 0) {
    return {
      maxFlow: 0,
      totalCapacity: 0,
      utilizationRate: 0,
      bottleneckRoutes: [],
      isolatedNodes: [],
      zeroCapacityRoutes: [],
      disabledNotEffective: [],
      solverSteps: [],
      routeFlows: {},
    };
  }

  const { maxFlow, solverSteps, routeFlows } = edmondsKarp(
    nodes,
    routes,
    sourceNode.id,
    sinkNodes.map((n) => n.id)
  );

  const isolatedNodes = detectIsolatedNodes(nodes, routes);
  const zeroCapacityRoutes = detectZeroCapacityRoutes(routes);
  const disabledNotEffective = detectDisabledNotEffective(routes, routeFlows);
  const bottleneckRoutes = identifyBottleneckRoutes(routes, routeFlows, 0.9);

  const updatedNodes = nodes.map((n) => ({
    ...n,
    isIsolated: isolatedNodes.some((iso) => iso.id === n.id),
  }));

  const totalCapacity = routes.reduce((sum, r) => sum + r.capacity, 0);
  const totalFlow = Object.values(routeFlows).reduce((sum, f) => sum + f, 0);
  const utilizationRate = totalCapacity > 0 ? totalFlow / totalCapacity : 0;

  const updatedRoutes = routes.map((r) => ({
    ...r,
    flow: routeFlows[r.id] || 0,
    utilization: r.capacity > 0 ? (routeFlows[r.id] || 0) / r.capacity : 0,
    isBottleneck: bottleneckRoutes.some((br) => br.id === r.id),
  }));

  return {
    maxFlow,
    totalCapacity,
    utilizationRate,
    bottleneckRoutes: updatedRoutes.filter((r) => r.isBottleneck),
    isolatedNodes: updatedNodes.filter((n) => n.isIsolated),
    zeroCapacityRoutes,
    disabledNotEffective,
    solverSteps,
    routeFlows,
  };
}
