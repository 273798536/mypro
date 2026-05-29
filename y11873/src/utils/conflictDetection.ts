import type { Warehouse, Road, ConflictAlert } from '../types';

export function detectIsolatedWarehouses(
  warehouses: Warehouse[],
  roads: Road[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];

  for (const warehouse of warehouses) {
    const connectedRoads = roads.filter((r) =>
      r.connectedWarehouseIds.includes(warehouse.id)
    );

    if (connectedRoads.length === 0) continue;

    const allInterrupted = connectedRoads.every(
      (r) => r.status === 'interrupted'
    );

    if (allInterrupted) {
      const interruptedRoadNames = connectedRoads
        .map((r) => r.name)
        .join('、');
      alerts.push({
        id: `isolated-${warehouse.id}`,
        type: 'road_interrupted',
        severity: 'critical',
        message: `仓库「${warehouse.name}」已被隔离`,
        reason: `仓库「${warehouse.name}」所有连接道路（${interruptedRoadNames}）均处于中断状态，无法进行物资调配，该仓库已完全隔离`,
        relatedIds: [
          warehouse.id,
          ...connectedRoads.map((r) => r.id),
        ],
        position: warehouse.position,
      });
    }
  }

  return alerts;
}

export function detectDuplicateSupplies(
  warehouses: Warehouse[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const supplyMap = new Map<
    string,
    { warehouse: Warehouse; supply: Warehouse['supplies'][number] }[]
  >();

  for (const warehouse of warehouses) {
    for (const supply of warehouse.supplies) {
      const existing = supplyMap.get(supply.type) ?? [];
      existing.push({ warehouse, supply });
      supplyMap.set(supply.type, existing);
    }
  }

  for (const [type, entries] of supplyMap) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        const distance = Math.sqrt(
          (a.warehouse.position[0] - b.warehouse.position[0]) ** 2 +
            (a.warehouse.position[2] - b.warehouse.position[2]) ** 2
        );
        const overlapRadius =
          a.warehouse.serviceRadius + b.warehouse.serviceRadius;

        if (distance < overlapRadius) {
          alerts.push({
            id: `duplicate-${type}-${a.warehouse.id}-${b.warehouse.id}`,
            type: 'supply_duplicate',
            severity: 'warning',
            message: `物资类型「${a.supply.name}」在服务半径内重复配置`,
            reason: `仓库「${a.warehouse.name}」（${a.supply.quantity}${a.supply.unit}）与仓库「${b.warehouse.name}」（${b.supply.quantity}${b.supply.unit}）均配置了「${a.supply.name}」，两仓库距离 ${distance.toFixed(1)} 小于服务半径之和 ${overlapRadius}，存在资源冗余`,
            relatedIds: [a.warehouse.id, b.warehouse.id],
            position: a.warehouse.position,
          });
        }
      }
    }
  }

  return alerts;
}

export function detectSlopeMiscalculations(
  roads: Road[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];

  for (const road of roads) {
    if (road.status === 'open' && road.slopeAngle > 15) {
      alerts.push({
        id: `slope-${road.id}`,
        type: 'slope_miscalculated',
        severity: 'warning',
        message: `道路「${road.name}」坡度异常但状态为畅通`,
        reason: `道路「${road.name}」坡度为 ${road.slopeAngle}°，超过 15° 安全阈值，但当前状态仍标记为「畅通」，应标记为「坡度受限」或确认坡度数据是否有误`,
        relatedIds: [road.id],
        position: road.waypoints[0],
      });
    }
  }

  return alerts;
}

export function runAllConflictChecks(
  warehouses: Warehouse[],
  roads: Road[]
): ConflictAlert[] {
  return [
    ...detectIsolatedWarehouses(warehouses, roads),
    ...detectDuplicateSupplies(warehouses),
    ...detectSlopeMiscalculations(roads),
  ];
}
