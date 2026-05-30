import { NetworkNode, PipeConnection, AnomalyEvent, NodeStatus, PipeStatus } from '../types/game';

export function calculateConnectivity(
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): { connectedNodes: Set<string>; disconnectedPipes: string[] } {
  const connectedNodes = new Set<string>();
  const disconnectedPipes: string[] = [];
  
  const adjacencyList: Map<string, { nodeId: string; pipeId: string }[]> = new Map();
  
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });
  
  pipes.forEach(pipe => {
    if (pipe.status === 'connected') {
      adjacencyList.get(pipe.from)?.push({ nodeId: pipe.to, pipeId: pipe.id });
      adjacencyList.get(pipe.to)?.push({ nodeId: pipe.from, pipeId: pipe.id });
    } else {
      disconnectedPipes.push(pipe.id);
    }
  });
  
  const baseNode = nodes.find(n => n.type === 'base');
  if (!baseNode) return { connectedNodes, disconnectedPipes };
  
  const visited = new Set<string>();
  const queue: string[] = [baseNode.id];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    connectedNodes.add(current);
    
    const neighbors = adjacencyList.get(current) || [];
    neighbors.forEach(({ nodeId }) => {
      if (!visited.has(nodeId)) {
        queue.push(nodeId);
      }
    });
  }
  
  return { connectedNodes, disconnectedPipes };
}

export function calculateFlowRates(
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): { updatedPipes: PipeConnection[]; anomalies: AnomalyEvent[] } {
  const anomalies: AnomalyEvent[] = [];
  const updatedPipes = pipes.map(pipe => ({ ...pipe }));
  
  updatedPipes.forEach(pipe => {
    if (pipe.status === 'connected') {
      const fromNode = nodes.find(n => n.id === pipe.from);
      const toNode = nodes.find(n => n.id === pipe.to);
      
      if (fromNode && toNode) {
        const healthFactor = Math.min(fromNode.health, toNode.health) / 100;
        pipe.flowRate = Math.floor(pipe.maxFlow * healthFactor * (0.7 + Math.random() * 0.3));
        
        if (pipe.flowRate > pipe.maxFlow * 0.9) {
          anomalies.push({
            id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            round: 0,
            type: 'recycle_overload',
            severity: 'warning',
            message: `管道流量接近上限: ${pipe.flowRate}/${pipe.maxFlow}`,
            relatedPipeId: pipe.id,
          });
        }
      }
    } else {
      pipe.flowRate = 0;
    }
  });
  
  return { updatedPipes, anomalies };
}

export function updateNodeStatuses(
  nodes: NetworkNode[],
  connectedNodes: Set<string>
): { updatedNodes: NetworkNode[]; anomalies: AnomalyEvent[] } {
  const anomalies: AnomalyEvent[] = [];
  
  const updatedNodes = nodes.map(node => {
    const updated = { ...node };
    
    if (!connectedNodes.has(node.id)) {
      updated.status = 'disconnected';
      anomalies.push({
        id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        round: 0,
        type: 'pipe_disconnect',
        severity: 'critical',
        message: `${node.name} 已断连，无法供水`,
        relatedNodeId: node.id,
      });
    } else if (node.health < 30) {
      updated.status = 'danger';
    } else if (node.health < 60) {
      updated.status = 'warning';
    } else {
      updated.status = 'normal';
    }
    
    return updated;
  });
  
  return { updatedNodes, anomalies };
}

export function checkGreenhouseWater(
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];
  const greenhouse = nodes.find(n => n.type === 'greenhouse');
  
  if (!greenhouse) return anomalies;
  
  const inflowPipes = pipes.filter(p => p.to === 'greenhouse' && p.status === 'connected');
  const totalInflow = inflowPipes.reduce((sum, p) => sum + p.flowRate, 0);
  
  if (totalInflow < 20) {
    anomalies.push({
      id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      round: 0,
      type: 'greenhouse_drought',
      severity: greenhouse.status === 'disconnected' ? 'critical' : 'warning',
      message: `温室供水不足: 流入 ${totalInflow}，需要至少 20`,
      relatedNodeId: greenhouse.id,
    });
  }
  
  return anomalies;
}

export function checkRecyclerOverload(
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];
  const recycler = nodes.find(n => n.type === 'recycler');
  
  if (!recycler) return anomalies;
  
  const inflowPipes = pipes.filter(p => p.to === 'recycler' && p.status === 'connected');
  const totalInflow = inflowPipes.reduce((sum, p) => sum + p.flowRate, 0);
  
  if (totalInflow > recycler.capacity * 0.85) {
    anomalies.push({
      id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      round: 0,
      type: 'recycle_overload',
      severity: totalInflow > recycler.capacity ? 'critical' : 'warning',
      message: `回收机过载: 流入 ${totalInflow}，容量 ${recycler.capacity}`,
      relatedNodeId: recycler.id,
    });
  }
  
  return anomalies;
}

export function runNetworkCalculation(
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): {
  updatedNodes: NetworkNode[];
  updatedPipes: PipeConnection[];
  anomalies: AnomalyEvent[];
} {
  const { connectedNodes, disconnectedPipes } = calculateConnectivity(nodes, pipes);
  
  const { updatedNodes, anomalies: nodeAnomalies } = updateNodeStatuses(nodes, connectedNodes);
  
  const { updatedPipes, anomalies: flowAnomalies } = calculateFlowRates(updatedNodes, pipes);
  
  const greenhouseAnomalies = checkGreenhouseWater(updatedNodes, updatedPipes);
  const recyclerAnomalies = checkRecyclerOverload(updatedNodes, updatedPipes);
  
  const allAnomalies = [
    ...nodeAnomalies,
    ...flowAnomalies,
    ...greenhouseAnomalies,
    ...recyclerAnomalies,
  ];
  
  return {
    updatedNodes,
    updatedPipes,
    anomalies: allAnomalies,
  };
}
