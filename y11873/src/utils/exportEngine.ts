import type { Warehouse, Road, ConflictAlert } from '../types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(
  warehouses: Warehouse[],
  roads: Road[],
  alerts: ConflictAlert[]
): string {
  const lines: string[] = [];

  lines.push('=== 仓库信息 ===');
  lines.push(
    'ID,名称,位置X,位置Y,位置Z,海拔,服务半径,状态,物资列表'
  );
  for (const w of warehouses) {
    const supplyInfo = w.supplies
      .map((s) => `${s.name}(${s.quantity}${s.unit})`)
      .join('; ');
    lines.push(
      [
        w.id,
        escapeCSV(w.name),
        w.position[0],
        w.position[1],
        w.position[2],
        w.elevation,
        w.serviceRadius,
        w.status,
        escapeCSV(supplyInfo),
      ].join(',')
    );
  }

  lines.push('');
  lines.push('=== 道路信息 ===');
  lines.push(
    'ID,名称,坡度,状态,中断原因,坡度受限原因,连接仓库'
  );
  for (const r of roads) {
    lines.push(
      [
        r.id,
        escapeCSV(r.name),
        r.slopeAngle,
        r.status,
        escapeCSV(r.interruptReason ?? ''),
        escapeCSV(r.slopeLimitedReason ?? ''),
        escapeCSV(r.connectedWarehouseIds.join('; ')),
      ].join(',')
    );
  }

  lines.push('');
  lines.push('=== 冲突预警 ===');
  lines.push(
    'ID,类型,严重程度,消息,原因,关联ID'
  );
  for (const a of alerts) {
    lines.push(
      [
        a.id,
        a.type,
        a.severity,
        escapeCSV(a.message),
        escapeCSV(a.reason),
        escapeCSV(a.relatedIds.join('; ')),
      ].join(',')
    );
  }

  return lines.join('\n');
}

export function exportToJSON(
  warehouses: Warehouse[],
  roads: Road[],
  alerts: ConflictAlert[]
): string {
  return JSON.stringify(
    { warehouses, roads, conflictAlerts: alerts },
    null,
    2
  );
}

export function generateInterruptReport(
  warehouses: Warehouse[],
  roads: Road[],
  alerts: ConflictAlert[]
): string {
  const interruptedRoads = roads.filter(
    (r) => r.status === 'interrupted'
  );
  const slopeLimitedRoads = roads.filter(
    (r) => r.status === 'slope_limited'
  );
  const isolatedAlerts = alerts.filter(
    (a) => a.type === 'road_interrupted'
  );

  const lines: string[] = [];

  lines.push('═══════════════════════════════════════');
  lines.push('       城市应急物资仓网 · 道路中断报告');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  lines.push('【一、道路中断概况】');
  lines.push(
    `  道路总数: ${roads.length}`
  );
  lines.push(
    `  中断道路: ${interruptedRoads.length} 条`
  );
  lines.push(
    `  坡度受限: ${slopeLimitedRoads.length} 条`
  );
  lines.push(
    `  畅通道路: ${roads.filter((r) => r.status === 'open').length} 条`
  );
  lines.push('');

  if (interruptedRoads.length > 0) {
    lines.push('【二、中断道路详情】');
    for (const road of interruptedRoads) {
      lines.push(`  ▸ ${road.name}（ID: ${road.id}）`);
      lines.push(`    中断原因: ${road.interruptReason ?? '未说明'}`);
      lines.push(
        `    连接仓库: ${road.connectedWarehouseIds.join('、')}`
      );
      lines.push('');
    }
  }

  if (isolatedAlerts.length > 0) {
    lines.push('【三、被隔离的仓库（道路中断有没有被拦住）】');
    for (const alert of isolatedAlerts) {
      lines.push(`  ✘ ${alert.message}`);
      lines.push(`    原因: ${alert.reason}`);

      const warehouseId = alert.relatedIds[0];
      const warehouse = warehouses.find((w) => w.id === warehouseId);
      if (warehouse) {
        const allRoads = roads.filter((r) =>
          r.connectedWarehouseIds.includes(warehouseId)
        );
        const hasAlternative = allRoads.some(
          (r) => r.status !== 'interrupted'
        );
        lines.push(
          `    是否存在替代路线: ${hasAlternative ? '是' : '否，完全被拦住'}`
        );
      }
      lines.push('');
    }
  } else {
    lines.push('【三、被隔离的仓库】');
    lines.push('  无仓库被隔离，所有仓库均有可用道路通行。');
    lines.push('');
  }

  lines.push('【四、各中断道路替代路线分析】');
  for (const road of interruptedRoads) {
    const connectedWarehouseIds = road.connectedWarehouseIds;
    let hasAlternativeRoute = false;
    const alternativeRoutes: string[] = [];

    for (const whId of connectedWarehouseIds) {
      const otherRoads = roads.filter(
        (r) =>
          r.connectedWarehouseIds.includes(whId) &&
          r.id !== road.id &&
          r.status !== 'interrupted'
      );
      if (otherRoads.length > 0) {
        hasAlternativeRoute = true;
        alternativeRoutes.push(
          `仓库 ${whId} 可通过 ${otherRoads.map((r) => r.name).join('、')} 绕行`
        );
      } else {
        alternativeRoutes.push(`仓库 ${whId} 无替代路线，已被拦住`);
      }
    }

    lines.push(`  ▸ ${road.name}:`);
    if (hasAlternativeRoute) {
      lines.push(`    存在替代路线: 是`);
    } else {
      lines.push(`    存在替代路线: 否，相关仓库均被拦住`);
    }
    for (const route of alternativeRoutes) {
      lines.push(`    - ${route}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════');
  lines.push('【总结】');
  if (isolatedAlerts.length > 0) {
    lines.push(
      `当前有 ${isolatedAlerts.length} 座仓库因道路中断被完全拦住，无法进行物资调配。`
    );
    lines.push('建议立即启动应急通道或空中运输方案。');
  } else {
    lines.push(
      '当前所有仓库均有可用通行路线，未出现被完全拦住的情况。'
    );
  }
  lines.push(
    `共 ${interruptedRoads.length} 条道路中断，${slopeLimitedRoads.length} 条坡度受限。`
  );
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}
