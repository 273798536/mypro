import { create } from 'zustand';
import type { Node, Route, AnalysisResult, Scenario, PendingItem } from '@/types';
import { sampleNodes, sampleRoutes } from '@/utils/sampleData';
import { runFullAnalysis } from '@/utils/bottleneck';
import { createScenario } from '@/utils/compare';
import { exportToCsv } from '@/utils/export';

interface NetworkState {
  nodes: Node[];
  routes: Route[];
  analysisResult: AnalysisResult | null;
  scenarios: Scenario[];
  selectedRouteId: string | null;
  pendingItems: PendingItem[];
  isLoading: boolean;
  setNodes: (nodes: Node[]) => void;
  setRoutes: (routes: Route[]) => void;
  loadSampleData: () => void;
  runAnalysis: () => void;
  updateRouteCapacity: (routeId: string, capacity: number) => void;
  resolvePendingItem: (itemId: string) => void;
  dismissPendingItem: (itemId: string) => void;
  saveScenario: (name: string) => void;
  deleteScenario: (scenarioId: string) => void;
  loadScenario: (scenarioId: string) => void;
  setSelectedRouteId: (routeId: string | null) => void;
  exportData: () => void;
}

function generatePendingItems(result: AnalysisResult): PendingItem[] {
  const items: PendingItem[] = [];

  result.isolatedNodes.forEach((node) => {
    items.push({
      id: `iso-${node.id}`,
      type: 'isolated',
      title: `孤立节点: ${node.name}`,
      description: `该节点无任何连通线路，请检查是否遗漏或删除`,
      relatedId: node.id,
      resolved: false,
    });
  });

  result.zeroCapacityRoutes.forEach((route) => {
    items.push({
      id: `zero-${route.id}`,
      type: 'zeroCapacity',
      title: `零容量线路: ${route.from}→${route.to}`,
      description: `线路容量为0但未禁用，可能是配置错误`,
      relatedId: route.id,
      resolved: false,
    });
  });

  result.disabledNotEffective.forEach((route) => {
    items.push({
      id: `disabled-${route.id}`,
      type: 'disabledNotEffective',
      title: `禁用未生效: ${route.from}→${route.to}`,
      description: `线路已标记禁用但仍有流量分配，请检查`,
      relatedId: route.id,
      resolved: false,
    });
  });

  return items;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  nodes: [],
  routes: [],
  analysisResult: null,
  scenarios: [],
  selectedRouteId: null,
  pendingItems: [],
  isLoading: false,

  setNodes: (nodes: Node[]) => {
    set({ nodes });
  },

  setRoutes: (routes: Route[]) => {
    set({ routes });
  },

  loadSampleData: () => {
    set({ isLoading: true });
    const nodes = JSON.parse(JSON.stringify(sampleNodes));
    const routes = JSON.parse(JSON.stringify(sampleRoutes));
    set({ nodes, routes, isLoading: false });
    get().runAnalysis();
  },

  runAnalysis: () => {
    const { nodes, routes } = get();
    if (nodes.length === 0 || routes.length === 0) return;

    set({ isLoading: true });
    const result = runFullAnalysis(nodes, routes);

    const updatedRoutes = routes.map((r) => ({
      ...r,
      flow: result.routeFlows[r.id] || 0,
      utilization: r.capacity > 0 ? (result.routeFlows[r.id] || 0) / r.capacity : 0,
      isBottleneck: result.bottleneckRoutes.some((br) => br.id === r.id),
    }));

    const updatedNodes = nodes.map((n) => ({
      ...n,
      isIsolated: result.isolatedNodes.some((iso) => iso.id === n.id),
    }));

    const pendingItems = generatePendingItems(result);

    set({
      analysisResult: result,
      routes: updatedRoutes,
      nodes: updatedNodes,
      pendingItems,
      isLoading: false,
    });
  },

  updateRouteCapacity: (routeId: string, capacity: number) => {
    const { routes } = get();
    const updatedRoutes = routes.map((r) =>
      r.id === routeId ? { ...r, capacity } : r
    );
    set({ routes: updatedRoutes });
    get().runAnalysis();
  },

  resolvePendingItem: (itemId: string) => {
    const { pendingItems } = get();
    set({
      pendingItems: pendingItems.map((item) =>
        item.id === itemId ? { ...item, resolved: true } : item
      ),
    });
  },

  dismissPendingItem: (itemId: string) => {
    const { pendingItems } = get();
    set({
      pendingItems: pendingItems.filter((item) => item.id !== itemId),
    });
  },

  saveScenario: (name: string) => {
    const { nodes, routes, scenarios } = get();
    const scenario = createScenario(name, nodes, routes);
    set({ scenarios: [...scenarios, scenario] });
  },

  deleteScenario: (scenarioId: string) => {
    const { scenarios } = get();
    set({ scenarios: scenarios.filter((s) => s.id !== scenarioId) });
  },

  loadScenario: (scenarioId: string) => {
    const { scenarios } = get();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      set({
        nodes: JSON.parse(JSON.stringify(scenario.nodes)),
        routes: JSON.parse(JSON.stringify(scenario.routes)),
        analysisResult: scenario.result,
        pendingItems: generatePendingItems(scenario.result),
      });
    }
  },

  setSelectedRouteId: (routeId: string | null) => {
    set({ selectedRouteId: routeId });
  },

  exportData: () => {
    const { nodes, routes, analysisResult } = get();
    if (!analysisResult) return;
    exportToCsv(nodes, routes, analysisResult);
  },
}));
