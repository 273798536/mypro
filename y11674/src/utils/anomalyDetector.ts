import { NetworkNode, NetworkEdge, Anomaly, AnomalyType, AnomalySeverity } from '../types';

const DENSE_CLUSTER_THRESHOLD = 5;
const HIGH_RISK_PATH_THRESHOLD = 2;

function generateId(): string {
  return `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function detectDuplicateRelations(edges: NetworkEdge[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const relationMap = new Map<string, NetworkEdge[]>();

  edges.forEach(edge => {
    const key = [edge.source, edge.target, edge.relationType].sort().join('|');
    if (!relationMap.has(key)) {
      relationMap.set(key, []);
    }
    relationMap.get(key)!.push(edge);
  });

  relationMap.forEach((edgeList, key) => {
    if (edgeList.length > 1) {
      const [sourceId, targetId] = key.split('|');
      anomalies.push({
        id: generateId(),
        type: 'duplicate_relation',
        severity: 'warning',
        message: `检测到重复关系：${edgeList.length}条相同类型的关系`,
        relatedNodes: [sourceId, targetId],
        relatedEdges: edgeList.map(e => e.id),
        detectedAt: new Date().toISOString(),
      });
    }
  });

  return anomalies;
}

export function detectDenseClusters(nodes: NetworkNode[], edges: NetworkEdge[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const nodeConnections = new Map<string, number>();

  edges.forEach(edge => {
    nodeConnections.set(edge.source, (nodeConnections.get(edge.source) || 0) + 1);
    nodeConnections.set(edge.target, (nodeConnections.get(edge.target) || 0) + 1);
  });

  const denseNodes: string[] = [];
  nodeConnections.forEach((count, nodeId) => {
    if (count >= DENSE_CLUSTER_THRESHOLD) {
      denseNodes.push(nodeId);
    }
  });

  if (denseNodes.length > 0) {
    anomalies.push({
      id: generateId(),
      type: 'dense_cluster',
      severity: 'warning',
      message: `检测到节点过密：${denseNodes.length}个节点连接数超过${DENSE_CLUSTER_THRESHOLD}`,
      relatedNodes: denseNodes,
      relatedEdges: [],
      detectedAt: new Date().toISOString(),
    });
  }

  return anomalies;
}

export function detectBlacklistMissing(nodes: NetworkNode[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const blacklistNodes = nodes.filter(n => n.isBlacklist);
  
  if (blacklistNodes.length > 0) {
    anomalies.push({
      id: generateId(),
      type: 'blacklist_missing',
      severity: 'error',
      message: `检测到${blacklistNodes.length}个黑名单节点，请关注`,
      relatedNodes: blacklistNodes.map(n => n.id),
      relatedEdges: [],
      detectedAt: new Date().toISOString(),
    });
  }

  return anomalies;
}

export function detectHighRiskPaths(nodes: NetworkNode[], edges: NetworkEdge[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const highRiskNodes = nodes.filter(n => n.riskLevel === 'high' || n.riskLevel === 'critical');
  
  if (highRiskNodes.length >= HIGH_RISK_PATH_THRESHOLD) {
    const adjacencyMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, []);
      }
      if (!adjacencyMap.has(edge.target)) {
        adjacencyMap.set(edge.target, []);
      }
      adjacencyMap.get(edge.source)!.push(edge.target);
      adjacencyMap.get(edge.target)!.push(edge.source);
    });

    const visited = new Set<string>();
    const highRiskClusters: string[][] = [];

    function dfs(nodeId: string, cluster: string[]) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      cluster.push(nodeId);

      const neighbors = adjacencyMap.get(nodeId) || [];
      neighbors.forEach(neighbor => {
        const neighborNode = nodes.find(n => n.id === neighbor);
        if (neighborNode && (neighborNode.riskLevel === 'high' || neighborNode.riskLevel === 'critical') && !visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      });
    }

    highRiskNodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster: string[] = [];
        dfs(node.id, cluster);
        if (cluster.length >= HIGH_RISK_PATH_THRESHOLD) {
          highRiskClusters.push(cluster);
        }
      }
    });

    highRiskClusters.forEach((cluster, index) => {
      anomalies.push({
        id: generateId(),
        type: 'high_risk_path',
        severity: 'error',
        message: `检测到高风险路径：${index + 1}，包含${cluster.length}个高风险节点互联`,
        relatedNodes: cluster,
        relatedEdges: [],
        detectedAt: new Date().toISOString(),
      });
    });
  }

  return anomalies;
}

export function detectAllAnomalies(nodes: NetworkNode[], edges: NetworkEdge[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  anomalies.push(...detectDuplicateRelations(edges));
  anomalies.push(...detectDenseClusters(nodes, edges));
  anomalies.push(...detectBlacklistMissing(nodes));
  anomalies.push(...detectHighRiskPaths(nodes, edges));
  
  return anomalies;
}
