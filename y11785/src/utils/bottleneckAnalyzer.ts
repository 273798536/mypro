import { NetworkNode, NetworkEdge, DemandPoint, BottleneckEdge, AnalysisResult } from '../types';
import { DinicMaxFlow, findSourceAndSinkNodes } from './maxFlow';

export function analyzeNetwork(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  demands: DemandPoint[]
): AnalysisResult {
  const startTime = performance.now();
  
  const { sourceId, sinkId } = findSourceAndSinkNodes(nodes, demands);
  
  if (!sourceId || !sinkId) {
    return {
      maxFlow: 0,
      bottlenecks: [],
      anomalies: [],
      edgeFlows: {},
      computeTime: performance.now() - startTime,
      timestamp: Date.now()
    };
  }

  const dinic = new DinicMaxFlow(nodes, edges);
  const { maxFlow, edgeFlows } = dinic.compute(sourceId, sinkId);
  
  const bottlenecks = identifyBottlenecks(edges, edgeFlows, maxFlow);
  
  return {
    maxFlow,
    bottlenecks,
    anomalies: [],
    edgeFlows,
    computeTime: performance.now() - startTime,
    timestamp: Date.now()
  };
}

function identifyBottlenecks(
  edges: NetworkEdge[],
  edgeFlows: Record<string, number>,
  totalFlow: number
): BottleneckEdge[] {
  const bottlenecks: BottleneckEdge[] = [];

  edges.forEach((edge) => {
    if (edge.disabled || edge.capacity <= 0) return;
    
    const flow = edgeFlows[edge.id] || 0;
    const utilization = edge.capacity > 0 ? flow / edge.capacity : 0;
    
    if (utilization >= 0.7) {
      const impact = calculateImpact(edge, flow, utilization, totalFlow);
      const explanation = generateExplanation(edge, flow, utilization, impact);
      
      bottlenecks.push({
        edgeId: edge.id,
        flow,
        capacity: edge.capacity,
        utilization,
        impact,
        explanation
      });
    }
  });

  return bottlenecks.sort((a, b) => b.impact - a.impact);
}

function calculateImpact(
  edge: NetworkEdge,
  flow: number,
  utilization: number,
  totalFlow: number
): number {
  const remainingCapacity = edge.capacity - flow;
  const flowRatio = totalFlow > 0 ? flow / totalFlow : 0;
  
  const utilizationScore = utilization * 0.4;
  const flowRatioScore = flowRatio * 0.4;
  const tightnessScore = remainingCapacity < 10 ? 0.2 : (10 - remainingCapacity) / 50 * 0.2;
  
  return utilizationScore + flowRatioScore + tightnessScore;
}

function generateExplanation(
  edge: NetworkEdge,
  flow: number,
  utilization: number,
  impact: number
): string {
  const utilizationPercent = (utilization * 100).toFixed(1);
  const remaining = edge.capacity - flow;
  
  let severity = '';
  if (utilization >= 0.95) {
    severity = '严重瓶颈';
  } else if (utilization >= 0.9) {
    severity = '高风险瓶颈';
  } else if (utilization >= 0.8) {
    severity = '中等瓶颈';
  } else {
    severity = '潜在瓶颈';
  }
  
  let recommendation = '';
  if (utilization >= 0.95) {
    recommendation = '建议立即扩容或分流，否则将严重制约整体网络吞吐量';
  } else if (utilization >= 0.9) {
    recommendation = '建议尽快扩容，该线路已接近饱和状态';
  } else if (utilization >= 0.8) {
    recommendation = '建议制定扩容计划，当前流量已占用大部分容量';
  } else {
    recommendation = '建议持续监控，预留扩容时间窗口';
  }
  
  return `${severity}：当前流量 ${flow} / 容量 ${edge.capacity}，利用率 ${utilizationPercent}%，剩余容量 ${remaining.toFixed(1)}。${recommendation}。`;
}

export function getBottleneckSeverity(utilization: number): 'critical' | 'high' | 'medium' | 'low' {
  if (utilization >= 0.95) return 'critical';
  if (utilization >= 0.9) return 'high';
  if (utilization >= 0.8) return 'medium';
  return 'low';
}

export function getBottleneckColor(utilization: number): string {
  const severity = getBottleneckSeverity(utilization);
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#f59e0b';
    case 'low': return '#84cc16';
    default: return '#10b981';
  }
}

export function getUtilizationGradient(utilization: number): string {
  const percent = Math.min(utilization * 100, 100);
  if (percent >= 90) return 'from-red-500 to-red-600';
  if (percent >= 70) return 'from-orange-500 to-orange-600';
  if (percent >= 50) return 'from-yellow-500 to-yellow-600';
  return 'from-green-500 to-green-600';
}
