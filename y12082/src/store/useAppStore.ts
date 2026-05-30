import { create } from 'zustand';
import { SpaceNode, PathEdge, WorkOrder, Anomaly, PlannedPath, TimePoint } from '../types';
import { mockNodes, mockEdges, mockWorkOrders, mockAnomalies, mockTimePoints } from '../data/mockData';

interface AppState {
  nodes: SpaceNode[];
  edges: PathEdge[];
  workOrders: WorkOrder[];
  anomalies: Anomaly[];
  timePoints: TimePoint[];
  
  startNode: string | null;
  endNode: string | null;
  plannedPath: PlannedPath | null;
  selectedNode: string | null;
  selectedEdge: string | null;
  
  currentTimeIndex: number;
  isPlaying: boolean;
  
  filters: {
    showClosedPaths: boolean;
    showAccessIssues: boolean;
    showAnomalies: boolean;
    showWorkOrders: boolean;
  };
  
  setStartNode: (id: string | null) => void;
  setEndNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setPlannedPath: (path: PlannedPath | null) => void;
  
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  
  setFilter: (key: keyof AppState['filters'], value: boolean) => void;
  
  resolveAnomaly: (id: string) => void;
  findPath: () => void;
}

const findPathAStar = (
  startId: string,
  endId: string,
  nodes: SpaceNode[],
  edges: PathEdge[]
): PlannedPath | null => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, { to: string; edge: PathEdge }[]>();
  
  nodes.forEach(n => adjacency.set(n.id, []));
  edges.forEach(edge => {
    if (edge.status === 'open') {
      adjacency.get(edge.from)?.push({ to: edge.to, edge });
      adjacency.get(edge.to)?.push({ to: edge.from, edge });
    }
  });
  
  const start = nodeMap.get(startId);
  const end = nodeMap.get(endId);
  if (!start || !end) return null;
  
  const heuristic = (a: SpaceNode, b: SpaceNode) => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
  };
  
  const openSet = new Set([startId]);
  const cameFrom = new Map<string, string>();
  const edgeFrom = new Map<string, string>();
  const gScore = new Map(nodes.map(n => [n.id, Infinity]));
  const fScore = new Map(nodes.map(n => [n.id, Infinity]));
  
  gScore.set(startId, 0);
  fScore.set(startId, heuristic(start, end));
  
  while (openSet.size > 0) {
    let current = '';
    let minF = Infinity;
    openSet.forEach(id => {
      const f = fScore.get(id) || Infinity;
      if (f < minF) { minF = f; current = id; }
    });
    
    if (current === endId) {
      const pathNodes: string[] = [current];
      const pathEdges: string[] = [];
      let totalDist = 0;
      let curr = current;
      
      while (cameFrom.has(curr)) {
        const prev = cameFrom.get(curr)!;
        const edgeId = edgeFrom.get(curr);
        if (edgeId) {
          pathEdges.unshift(edgeId);
          const edge = edges.find(e => e.id === edgeId);
          if (edge) totalDist += edge.distance;
        }
        pathNodes.unshift(prev);
        curr = prev;
      }
      
      return {
        nodes: pathNodes,
        edges: pathEdges,
        totalDistance: totalDist,
        estimatedTime: Math.round(totalDist / 1.2),
        hasAnomalies: false
      };
    }
    
    openSet.delete(current);
    const currentNode = nodeMap.get(current)!;
    
    for (const neighbor of adjacency.get(current) || []) {
      const tentativeG = (gScore.get(current) || 0) + neighbor.edge.distance;
      
      if (tentativeG < (gScore.get(neighbor.to) || Infinity)) {
        cameFrom.set(neighbor.to, current);
        edgeFrom.set(neighbor.to, neighbor.edge.id);
        gScore.set(neighbor.to, tentativeG);
        const neighborNode = nodeMap.get(neighbor.to)!;
        fScore.set(neighbor.to, tentativeG + heuristic(neighborNode, end));
        
        if (!openSet.has(neighbor.to)) {
          openSet.add(neighbor.to);
        }
      }
    }
  }
  
  return null;
};

export const useAppStore = create<AppState>((set, get) => ({
  nodes: mockNodes,
  edges: mockEdges,
  workOrders: mockWorkOrders,
  anomalies: mockAnomalies,
  timePoints: mockTimePoints,
  
  startNode: null,
  endNode: null,
  plannedPath: null,
  selectedNode: null,
  selectedEdge: null,
  
  currentTimeIndex: 3,
  isPlaying: false,
  
  filters: {
    showClosedPaths: false,
    showAccessIssues: true,
    showAnomalies: true,
    showWorkOrders: true
  },
  
  setStartNode: (id) => set({ startNode: id }),
  setEndNode: (id) => set({ endNode: id }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  setSelectedEdge: (id) => set({ selectedEdge: id }),
  setPlannedPath: (path) => set({ plannedPath: path }),
  
  setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setFilter: (key, value) => set(state => ({
    filters: { ...state.filters, [key]: value }
  })),
  
  resolveAnomaly: (id) => set(state => ({
    anomalies: state.anomalies.map(a => 
      a.id === id ? { ...a, resolved: true } : a
    )
  })),
  
  findPath: () => {
    const { startNode, endNode, nodes, edges } = get();
    if (startNode && endNode) {
      const path = findPathAStar(startNode, endNode, nodes, edges);
      set({ plannedPath: path });
    }
  }
}));
