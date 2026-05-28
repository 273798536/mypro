import { NetworkNode, NetworkEdge, DemandPoint, Anomaly, AnalysisResult } from '../types';
import { DinicMaxFlow } from './maxFlow';

export function detectAnomalies(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  demands: DemandPoint[],
  analysisResult?: AnalysisResult
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  detectZeroCapacityEdges(edges, anomalies);
  detectIsolatedNodes(nodes, edges, anomalies);
  detectDisabledIneffectiveEdges(edges, analysisResult, anomalies);
  detectUnreachableDemands(nodes, edges, demands, anomalies);

  return anomalies;
}

function detectZeroCapacityEdges(edges: NetworkEdge[], anomalies: Anomaly[]): void {
  edges.forEach((edge) => {
    if (edge.capacity === 0 && !edge.disabled) {
      anomalies.push({
        type: 'zero_capacity',
        severity: 'error',
        targetId: edge.id,
        message: `线路 "${edge.id}" 容量为0但未被禁用，将无法传输任何流量`,
        suggestion: '建议设置合理容量或禁用该线路'
      });
    }
  });
}

function detectIsolatedNodes(nodes: NetworkNode[], edges: NetworkEdge[], anomalies: Anomaly[]): void {
  const connectedNodes = new Set<string>();

  edges.forEach((edge) => {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  });

  nodes.forEach((node) => {
    if (!connectedNodes.has(node.id)) {
      anomalies.push({
        type: 'isolated_node',
        severity: 'warning',
        targetId: node.id,
        message: `节点 "${node.name}" (${node.id}) 是孤立节点，没有任何连接线路`,
        suggestion: '建议添加连接线路或删除该节点'
      });
    }
  });
}

function detectDisabledIneffectiveEdges(
  edges: NetworkEdge[],
  analysisResult: AnalysisResult | undefined,
  anomalies: Anomaly[]
): void {
  if (!analysisResult) return;

  const { bottlenecks } = analysisResult;
  const bottleneckEdgeIds = new Set(bottlenecks.map(b => b.edgeId));

  edges.forEach((edge) => {
    if (edge.disabled && bottleneckEdgeIds.has(edge.id)) {
      anomalies.push({
        type: 'disabled_ineffective',
        severity: 'info',
        targetId: edge.id,
        message: `禁用的线路 "${edge.id}" 实际上是瓶颈边，禁用可能影响整体吞吐`,
        suggestion: '建议评估是否真的需要禁用此瓶颈线路'
      });
    }
  });
}

function detectUnreachableDemands(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  demands: DemandPoint[],
  anomalies: Anomaly[]
): void {
  const supplyNodes = demands.filter(d => d.type === 'supply' && d.amount > 0);
  const demandNodes = demands.filter(d => d.type === 'demand' && d.amount > 0);

  if (supplyNodes.length === 0 || demandNodes.length === 0) return;

  try {
    const dinic = new DinicMaxFlow(nodes, edges);
    const reachableFromSource = dinic.getReachableNodes(supplyNodes[0].nodeId);

    demandNodes.forEach((demand) => {
      if (!reachableFromSource.has(demand.nodeId)) {
        const node = nodes.find(n => n.id === demand.nodeId);
        anomalies.push({
          type: 'unreachable_demand',
          severity: 'error',
          targetId: demand.id,
          message: `需求点 "${node?.name || demand.nodeId}" 无法从供应点到达`,
          suggestion: '请检查连接线路是否被禁用或中断'
        });
      }
    });
  } catch (e) {
    // Ignore errors in anomaly detection
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'error': return 'text-red-500 bg-red-50 border-red-200';
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'info': return 'text-blue-500 bg-blue-50 border-blue-200';
    default: return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error': return 'circle-x';
    case 'warning': return 'triangle-alert';
    case 'info': return 'info';
    default: return 'circle-help';
  }
}
