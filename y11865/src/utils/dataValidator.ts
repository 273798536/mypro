import type { FireStation, Building, RoadEdge, Alert, RoadNode } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function detectBrokenRoads(
  edges: RoadEdge[],
  nodes: RoadNode[]
): Alert[] {
  const alerts: Alert[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((edge) => {
    if (edge.isBlocked) {
      alerts.push({
        id: generateId(),
        type: 'data',
        severity: 'warning',
        message: `道路 ${edge.id} 已标记为断路，计算时将排除此路段`,
        timestamp: Date.now(),
      });
    }

    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      alerts.push({
        id: generateId(),
        type: 'data',
        severity: 'error',
        message: `道路 ${edge.id} 的端点不存在于路网节点中`,
        timestamp: Date.now(),
      });
    }
  });

  const connectedNodes = new Set<string>();
  edges
    .filter((e) => !e.isBlocked)
    .forEach((e) => {
      connectedNodes.add(e.from);
      connectedNodes.add(e.to);
    });

  const isolatedNodes = nodes.filter((n) => !connectedNodes.has(n.id));
  if (isolatedNodes.length > 0) {
    alerts.push({
      id: generateId(),
      type: 'data',
      severity: 'warning',
      message: `检测到 ${isolatedNodes.length} 个孤立的道路节点，可能影响路径计算`,
      timestamp: Date.now(),
    });
  }

  return alerts;
}

export function detectDuplicatePopulation(buildings: Building[]): Alert[] {
  const alerts: Alert[] = [];
  const positionMap = new Map<string, Building[]>();

  buildings.forEach((building) => {
    const key = `${building.position[0].toFixed(2)},${building.position[2].toFixed(2)}`;
    const existing = positionMap.get(key) || [];
    existing.push(building);
    positionMap.set(key, existing);
  });

  positionMap.forEach((group, position) => {
    if (group.length > 1) {
      const totalPopulation = group.reduce((sum, b) => sum + b.population, 0);
      alerts.push({
        id: generateId(),
        type: 'data',
        severity: 'warning',
        message: `位置 ${position} 有 ${group.length} 栋建筑重合，总人口 ${totalPopulation}，请确认是否为重复数据`,
        timestamp: Date.now(),
      });
    }
  });

  return alerts;
}

export function validateFireStations(
  fireStations: FireStation[],
  buildings: Building[]
): Alert[] {
  const alerts: Alert[] = [];

  if (fireStations.length === 0) {
    alerts.push({
      id: generateId(),
      type: 'data',
      severity: 'error',
      message: '未配置任何消防站，无法进行覆盖分析',
      timestamp: Date.now(),
    });
  }

  fireStations.forEach((station) => {
    if (station.vehicles <= 0) {
      alerts.push({
        id: generateId(),
        type: 'data',
        severity: 'warning',
        message: `消防站 ${station.name} 车辆数为 ${station.vehicles}，可能影响响应能力`,
        timestamp: Date.now(),
      });
    }

    if (station.responseTime <= 0) {
      alerts.push({
        id: generateId(),
        type: 'data',
        severity: 'warning',
        message: `消防站 ${station.name} 响应时间设置异常`,
        timestamp: Date.now(),
      });
    }
  });

  return alerts;
}

export function validateParameters(parameters: {
  responseThreshold: number;
  speedCoefficient: number;
}): Alert[] {
  const alerts: Alert[] = [];

  if (parameters.responseThreshold < 1 || parameters.responseThreshold > 30) {
    alerts.push({
      id: generateId(),
      type: 'parameter',
      severity: 'error',
      message: `响应时间阈值 ${parameters.responseThreshold} 分钟超出合理范围 (1-30)`,
      timestamp: Date.now(),
    });
  }

  if (parameters.speedCoefficient < 0.1 || parameters.speedCoefficient > 2.0) {
    alerts.push({
      id: generateId(),
      type: 'parameter',
      severity: 'warning',
      message: `车速系数 ${parameters.speedCoefficient} 超出常规范围 (0.1-2.0)，可能导致结果异常`,
      timestamp: Date.now(),
    });
  }

  return alerts;
}

export function validateAllData(
  fireStations: FireStation[],
  buildings: Building[],
  roadNodes: RoadNode[],
  roadEdges: RoadEdge[],
  parameters: { responseThreshold: number; speedCoefficient: number }
): Alert[] {
  return [
    ...detectBrokenRoads(roadEdges, roadNodes),
    ...detectDuplicatePopulation(buildings),
    ...validateFireStations(fireStations, buildings),
    ...validateParameters(parameters),
  ];
}
