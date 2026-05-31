import { Node, Wire, Anomaly, Operation } from '../types';
import {
  detectShortCircuit,
  detectOverload,
  detectPathBlockage,
  checkConnectivity,
} from './circuitAnalyzer';

export function runAllDetectors(
  nodes: Node[],
  wires: Wire[],
  currentStep: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const shortCircuit = detectShortCircuit(nodes, wires);
  if (shortCircuit) {
    shortCircuit.stepNumber = currentStep;
    anomalies.push(shortCircuit);
  }

  const overload = detectOverload(nodes, wires);
  if (overload) {
    overload.stepNumber = currentStep;
    anomalies.push(overload);
  }

  const pathBlockage = detectPathBlockage(nodes, wires);
  if (pathBlockage) {
    pathBlockage.stepNumber = currentStep;
    anomalies.push(pathBlockage);
  }

  return anomalies;
}

export function detectInvalidConnection(
  fromNode: Node | undefined,
  toNode: Node | undefined,
  wires: Wire[]
): Anomaly | null {
  if (!fromNode || !toNode) {
    return {
      id: `anomaly-${Date.now()}`,
      type: 'invalid_connection',
      severity: 'warning',
      description: '连接无效：节点不存在。',
      stepNumber: 0,
      resolved: false,
      relatedNodeIds: [],
      relatedWireIds: [],
    };
  }

  const existingWire = wires.find(
    w =>
      w.active &&
      ((w.fromNodeId === fromNode.id && w.toNodeId === toNode.id) ||
        (w.fromNodeId === toNode.id && w.toNodeId === fromNode.id))
  );

  if (existingWire) {
    return {
      id: `anomaly-${Date.now()}`,
      type: 'invalid_connection',
      severity: 'warning',
      description: `连接无效：${fromNode.label}与${toNode.label}之间已有导线。`,
      stepNumber: 0,
      resolved: false,
      relatedNodeIds: [fromNode.id, toNode.id],
      relatedWireIds: [existingWire.id],
    };
  }

  return null;
}

export function classifyAnomaly(anomaly: Anomaly): 'normal' | 'pending' | 'anomaly' {
  if (anomaly.type === 'invalid_connection') {
    return 'normal';
  }
  if (anomaly.severity === 'warning') {
    return 'pending';
  }
  return 'anomaly';
}

export function getAnomalyTypeLabel(type: Anomaly['type']): string {
  const labels: Record<Anomaly['type'], string> = {
    short_circuit: '短路蔓延',
    overload: '负载过高',
    path_blockage: '路径堵塞',
    invalid_connection: '连接无效',
  };
  return labels[type];
}

export function getSeverityColor(severity: Anomaly['severity']): string {
  const colors: Record<Anomaly['severity'], string> = {
    warning: '#F97316',
    error: '#EF4444',
    critical: '#DC2626',
  };
  return colors[severity];
}

export function resolveAnomaly(
  anomalies: Anomaly[],
  anomalyId: string,
  currentStep: number
): Anomaly[] {
  return anomalies.map(a =>
    a.id === anomalyId
      ? { ...a, resolved: true, description: `${a.description} (已在步骤${currentStep}修复)` }
      : a
  );
}

export function getUnresolvedAnomalies(anomalies: Anomaly[]): Anomaly[] {
  return anomalies.filter(a => !a.resolved);
}

export function getAnomaliesByStep(anomalies: Anomaly[], stepNumber: number): Anomaly[] {
  return anomalies.filter(a => a.stepNumber === stepNumber);
}

export function generateOperationJudgment(
  operation: Operation,
  nodes: Node[],
  wires: Wire[]
): string {
  const poweredNodes = checkConnectivity(nodes, wires);

  switch (operation.type) {
    case 'place_power': {
      const node = nodes.find(n => operation.nodeIds?.includes(n.id));
      return node
        ? `${node.label}是${node.type === 'substation' ? '变电站' : '核心节点'}，适合放置电源`
        : '放置电源站';
    }
    case 'place_wire': {
      const [fromId, toId] = operation.nodeIds || [];
      const fromNode = nodes.find(n => n.id === fromId);
      const toNode = nodes.find(n => n.id === toId);
      if (fromNode && toNode) {
        const fromPowered = poweredNodes.has(fromId);
        const toPowered = poweredNodes.has(toId);
        if (fromPowered && !toPowered) {
          return `${fromNode.label}已通电，${fromNode.label}→${toNode.label}是串联路径`;
        }
        if (fromPowered && toPowered) {
          return `${fromNode.label}和${toNode.label}都已通电，形成并联电路`;
        }
        return `连接${fromNode.label}→${toNode.label}`;
      }
      return '连接导线';
    }
    case 'place_repair': {
      const anomaly = operation.nodeIds?.[0];
      return anomaly ? `修复故障节点` : '派遣维修队';
    }
    default:
      return '执行操作';
  }
}
