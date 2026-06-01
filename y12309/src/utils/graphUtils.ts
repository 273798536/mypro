import type { Building, RouteEdge, RouteGraph, BreakpointInfo, Schedule } from '@/types';

class RouteAnalyzer {
  private graph: RouteGraph;

  constructor(nodes: Building[], edges: RouteEdge[]) {
    this.graph = { nodes, edges };
  }

  private buildAdjacencyList(): Map<string, { node: string; distance: number }[]> {
    const adjacency = new Map<string, { node: string; distance: number }[]>();

    this.graph.nodes.forEach(node => {
      adjacency.set(node.id, []);
    });

    this.graph.edges
      .filter(edge => edge.isActive)
      .forEach(edge => {
        adjacency.get(edge.fromBuilding)?.push({ node: edge.toBuilding, distance: edge.distance });
        adjacency.get(edge.toBuilding)?.push({ node: edge.fromBuilding, distance: edge.distance });
      });

    return adjacency;
  }

  detectBreakpoints(): BreakpointInfo[] {
    const breakpoints: BreakpointInfo[] = [];
    const inactiveEdges = this.graph.edges.filter(edge => !edge.isActive);

    inactiveEdges.forEach(edge => {
      const fromNode = this.graph.nodes.find(n => n.id === edge.fromBuilding);
      const toNode = this.graph.nodes.find(n => n.id === edge.toBuilding);

      if (fromNode && toNode) {
        breakpoints.push({
          id: `break-${edge.id}`,
          fromBuilding: edge.fromBuilding,
          toBuilding: edge.toBuilding,
          reason: `${fromNode.name} 至 ${toNode.name} 通道临时关闭`,
          affectedRoutes: this.findAffectedRoutes(edge.fromBuilding, edge.toBuilding),
        });
      }
    });

    return breakpoints;
  }

  private findAffectedRoutes(fromId: string, toId: string): string[] {
    const affected: string[] = [];
    const adjacency = this.buildAdjacencyList();
    const tempEdges = this.graph.edges.map(e => ({ ...e }));
    const edgeToDisable = tempEdges.find(
      e => (e.fromBuilding === fromId && e.toBuilding === toId) ||
           (e.fromBuilding === toId && e.toBuilding === fromId)
    );
    
    if (edgeToDisable) {
      edgeToDisable.isActive = false;
    }

    this.graph.nodes.forEach(node => {
      if (node.id !== fromId && node.id !== toId) {
        const canReachFrom = this.canReach(fromId, node.id, tempEdges);
        const canReachTo = this.canReach(toId, node.id, tempEdges);
        if (!canReachFrom || !canReachTo) {
          if (!affected.includes(node.name)) {
            affected.push(node.name);
          }
        }
      }
    });

    return affected.slice(0, 5);
  }

  private canReach(start: string, end: string, edges: RouteEdge[]): boolean {
    if (start === end) return true;

    const visited = new Set<string>();
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      edges
        .filter(e => e.isActive)
        .forEach(edge => {
          if (edge.fromBuilding === current && !visited.has(edge.toBuilding)) {
            queue.push(edge.toBuilding);
          }
          if (edge.toBuilding === current && !visited.has(edge.fromBuilding)) {
            queue.push(edge.fromBuilding);
          }
        });
    }

    return false;
  }

  findOptimalRoute(startId: string, targetBuildings: string[]): string[] {
    if (targetBuildings.length === 0) return [startId];

    const adjacency = this.buildAdjacencyList();
    const unvisited = new Set(targetBuildings.filter(id => id !== startId));
    const route: string[] = [startId];
    let current = startId;

    while (unvisited.size > 0) {
      let nearest: string | null = null;
      let minDistance = Infinity;

      unvisited.forEach(target => {
        const distance = this.getShortestDistance(current, target, adjacency);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = target;
        }
      });

      if (nearest) {
        const path = this.getPath(current, nearest, adjacency);
        if (path.length > 1) {
          route.push(...path.slice(1));
        }
        current = nearest;
        unvisited.delete(nearest);
      } else {
        break;
      }
    }

    return route;
  }

  private getShortestDistance(start: string, end: string, adjacency: Map<string, { node: string; distance: number }[]>): number {
    const distances = new Map<string, number>();
    const visited = new Set<string>();

    this.graph.nodes.forEach(node => {
      distances.set(node.id, Infinity);
    });
    distances.set(start, 0);

    while (true) {
      let current: string | null = null;
      let minDist = Infinity;

      this.graph.nodes.forEach(node => {
        if (!visited.has(node.id) && (distances.get(node.id) ?? Infinity) < minDist) {
          minDist = distances.get(node.id) ?? Infinity;
          current = node.id;
        }
      });

      if (current === null || current === end) break;
      visited.add(current);

      adjacency.get(current)?.forEach(({ node, distance }) => {
        const newDist = (distances.get(current) ?? 0) + distance;
        if (newDist < (distances.get(node) ?? Infinity)) {
          distances.set(node, newDist);
        }
      });
    }

    return distances.get(end) ?? Infinity;
  }

  private getPath(start: string, end: string, adjacency: Map<string, { node: string; distance: number }[]>): string[] {
    const previous = new Map<string, string | null>();
    const distances = new Map<string, number>();
    const visited = new Set<string>();

    this.graph.nodes.forEach(node => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
    });
    distances.set(start, 0);

    while (true) {
      let current: string | null = null;
      let minDist = Infinity;

      this.graph.nodes.forEach(node => {
        if (!visited.has(node.id) && (distances.get(node.id) ?? Infinity) < minDist) {
          minDist = distances.get(node.id) ?? Infinity;
          current = node.id;
        }
      });

      if (current === null || current === end) break;
      visited.add(current);

      adjacency.get(current)?.forEach(({ node, distance }) => {
        const newDist = (distances.get(current) ?? 0) + distance;
        if (newDist < (distances.get(node) ?? Infinity)) {
          distances.set(node, newDist);
          previous.set(node, current);
        }
      });
    }

    const path: string[] = [];
    let current: string | null = end;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) ?? null;
    }

    return path;
  }

  checkConnectivity(buildingIds: string[]): boolean {
    if (buildingIds.length <= 1) return true;

    const adjacency = this.buildAdjacencyList();
    const visited = new Set<string>();
    const start = buildingIds[0];
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      adjacency.get(current)?.forEach(({ node }) => {
        if (!visited.has(node)) {
          queue.push(node);
        }
      });
    }

    return buildingIds.every(id => visited.has(id));
  }

  detectDuplicateCoverage(schedules: Schedule[]): { buildingId: string; inspectorIds: string[]; date: string }[] {
    const buildingScheduleMap = new Map<string, Map<string, Set<string>>>();

    schedules.forEach(schedule => {
      schedule.buildingIds.forEach(buildingId => {
        if (!buildingScheduleMap.has(schedule.date)) {
          buildingScheduleMap.set(schedule.date, new Map());
        }
        const dateMap = buildingScheduleMap.get(schedule.date)!;
        if (!dateMap.has(buildingId)) {
          dateMap.set(buildingId, new Set());
        }
        dateMap.get(buildingId)!.add(schedule.inspectorId);
      });
    });

    const duplicates: { buildingId: string; inspectorIds: string[]; date: string }[] = [];

    buildingScheduleMap.forEach((dateMap, date) => {
      dateMap.forEach((inspectors, buildingId) => {
        if (inspectors.size > 1) {
          duplicates.push({
            buildingId,
            inspectorIds: Array.from(inspectors),
            date,
          });
        }
      });
    });

    return duplicates;
  }
}

export function createRouteAnalyzer(nodes: Building[], edges: RouteEdge[]): RouteAnalyzer {
  return new RouteAnalyzer(nodes, edges);
}

export function getBuildingName(buildingId: string, buildings: Building[]): string {
  return buildings.find(b => b.id === buildingId)?.name || buildingId;
}

export function getZoneColor(zone: string): string {
  const colors: Record<string, string> = {
    A: '#3b82f6',
    B: '#10b981',
    C: '#f59e0b',
    D: '#8b5cf6',
  };
  return colors[zone] || '#6b7280';
}
