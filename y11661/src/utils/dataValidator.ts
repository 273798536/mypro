import type { Shelf, RobotTrajectory, Alert, Position3D, Dimensions } from '../types';

const WAREHOUSE_BOUNDS = {
  minX: -50,
  maxX: 50,
  minY: 0,
  maxY: 10,
  minZ: -50,
  maxZ: 50,
};

const NORMAL_SHELF_DIMENSIONS = {
  minWidth: 1,
  maxWidth: 5,
  minHeight: 1,
  maxHeight: 8,
  minDepth: 0.5,
  maxDepth: 3,
};

export function createAlert(
  type: Alert['type'],
  severity: Alert['severity'],
  message: string,
  source: Alert['source'],
  position?: Position3D
): Alert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message,
    source,
    timestamp: Date.now(),
    resolved: false,
    position,
  };
}

export function validateCoordinate(
  position: Position3D,
  source: Alert['source'],
  objectId: string
): Alert | null {
  const { x, y, z } = position;
  const issues: string[] = [];

  if (x < WAREHOUSE_BOUNDS.minX || x > WAREHOUSE_BOUNDS.maxX) {
    issues.push(`X坐标 ${x.toFixed(2)} 超出仓库范围 [${WAREHOUSE_BOUNDS.minX}, ${WAREHOUSE_BOUNDS.maxX}]`);
  }
  if (y < WAREHOUSE_BOUNDS.minY || y > WAREHOUSE_BOUNDS.maxY) {
    issues.push(`Y坐标 ${y.toFixed(2)} 超出仓库范围 [${WAREHOUSE_BOUNDS.minY}, ${WAREHOUSE_BOUNDS.maxY}]`);
  }
  if (z < WAREHOUSE_BOUNDS.minZ || z > WAREHOUSE_BOUNDS.maxZ) {
    issues.push(`Z坐标 ${z.toFixed(2)} 超出仓库范围 [${WAREHOUSE_BOUNDS.minZ}, ${WAREHOUSE_BOUNDS.maxZ}]`);
  }

  if (Math.abs(x) > Math.abs(z) * 2 && Math.abs(x) > 30) {
    issues.push('疑似X/Z坐标翻转，请检查数据导入方向');
    if (issues.length > 0) {
      return createAlert(
        'coordinate_flip',
        'error',
        `对象 ${objectId}: ${issues.join('; ')}`,
        source,
        position
      );
    }
  }

  if (issues.length > 0) {
    return createAlert(
      'out_of_bounds',
      'warning',
      `对象 ${objectId}: ${issues.join('; ')}`,
      source,
      position
    );
  }

  return null;
}

export function validateDimensions(
  dimensions: Dimensions,
  source: Alert['source'],
  shelfCode: string
): Alert | null {
  const { width, height, depth } = dimensions;
  const issues: string[] = [];

  if (width < NORMAL_SHELF_DIMENSIONS.minWidth || width > NORMAL_SHELF_DIMENSIONS.maxWidth) {
    issues.push(`宽度 ${width} 超出正常范围 [${NORMAL_SHELF_DIMENSIONS.minWidth}, ${NORMAL_SHELF_DIMENSIONS.maxWidth}]`);
  }
  if (height < NORMAL_SHELF_DIMENSIONS.minHeight || height > NORMAL_SHELF_DIMENSIONS.maxHeight) {
    issues.push(`高度 ${height} 超出正常范围 [${NORMAL_SHELF_DIMENSIONS.minHeight}, ${NORMAL_SHELF_DIMENSIONS.maxHeight}]`);
  }
  if (depth < NORMAL_SHELF_DIMENSIONS.minDepth || depth > NORMAL_SHELF_DIMENSIONS.maxDepth) {
    issues.push(`深度 ${depth} 超出正常范围 [${NORMAL_SHELF_DIMENSIONS.minDepth}, ${NORMAL_SHELF_DIMENSIONS.maxDepth}]`);
  }

  if (width < depth) {
    issues.push('宽度小于深度，疑似方向翻转');
  }

  if (issues.length > 0) {
    return createAlert(
      'data_invalid',
      'warning',
      `货架 ${shelfCode} 尺寸异常: ${issues.join('; ')}`,
      source
    );
  }

  return null;
}

export function validateHeatValue(
  heatValue: number,
  source: Alert['source'],
  shelfCode: string,
  previousHeat?: number
): Alert | null {
  if (isNaN(heatValue) || heatValue < 0) {
    return createAlert(
      'data_invalid',
      'error',
      `货架 ${shelfCode} 热度值 ${heatValue} 无效，必须为非负数`,
      source
    );
  }

  if (heatValue > 1000) {
    return createAlert(
      'heat_overflow',
      'warning',
      `货架 ${shelfCode} 热度值 ${heatValue} 异常偏高，请检查是否数据叠加错误`,
      source
    );
  }

  if (previousHeat !== undefined && heatValue > previousHeat * 3) {
    return createAlert(
      'heat_overflow',
      'warning',
      `货架 ${shelfCode} 热度骤增 ${heatValue}（前值 ${previousHeat}），疑似数据重复导入`,
      source
    );
  }

  return null;
}

export function checkShelfOverlap(shelves: Shelf[]): Alert[] {
  const alerts: Alert[] = [];

  for (let i = 0; i < shelves.length; i++) {
    for (let j = i + 1; j < shelves.length; j++) {
      const a = shelves[i];
      const b = shelves[j];

      const overlap = isAABBOverlapping(
        {
          minX: a.position.x - a.dimensions.width / 2,
          maxX: a.position.x + a.dimensions.width / 2,
          minZ: a.position.z - a.dimensions.depth / 2,
          maxZ: a.position.z + a.dimensions.depth / 2,
        },
        {
          minX: b.position.x - b.dimensions.width / 2,
          maxX: b.position.x + b.dimensions.width / 2,
          minZ: b.position.z - b.dimensions.depth / 2,
          maxZ: b.position.z + b.dimensions.depth / 2,
        }
      );

      if (overlap) {
        alerts.push(
          createAlert(
            'data_invalid',
            'warning',
            `货架 ${a.code} 与 ${b.code} 位置重叠，请检查坐标数据`,
            {
              fileName: a.source.fileName,
              lineNumber: a.source.lineNumber,
              field: 'position',
              rawValue: JSON.stringify(a.position),
            },
            a.position
          )
        );
      }
    }
  }

  return alerts;
}

interface AABB2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function isAABBOverlapping(a: AABB2D, b: AABB2D): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

export function pointInAABB(point: Position3D, aabb: AABB2D & { minY?: number; maxY?: number }): boolean {
  return (
    point.x >= aabb.minX &&
    point.x <= aabb.maxX &&
    point.z >= aabb.minZ &&
    point.z <= aabb.maxZ &&
    (aabb.minY === undefined || point.y >= aabb.minY) &&
    (aabb.maxY === undefined || point.y <= aabb.maxY)
  );
}

export function lineIntersectsAABB(
  p1: Position3D,
  p2: Position3D,
  aabb: AABB2D & { minY?: number; maxY?: number }
): boolean {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;

  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) > 0.0001) {
    const t1 = (aabb.minX - p1.x) / dx;
    const t2 = (aabb.maxX - p1.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (p1.x < aabb.minX || p1.x > aabb.maxX) {
    return false;
  }

  if (Math.abs(dz) > 0.0001) {
    const t1 = (aabb.minZ - p1.z) / dz;
    const t2 = (aabb.maxZ - p1.z) / dz;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (p1.z < aabb.minZ || p1.z > aabb.maxZ) {
    return false;
  }

  return tMin <= tMax;
}

export function detectTrajectoryCollisions(
  trajectories: RobotTrajectory[],
  shelves: Shelf[],
  aisleWidth: number = 2
): Alert[] {
  const alerts: Alert[] = [];

  for (let i = 0; i < trajectories.length - 1; i++) {
    const current = trajectories[i];
    const next = trajectories[i + 1];

    for (const shelf of shelves) {
      const shelfAABB = {
        minX: shelf.position.x - shelf.dimensions.width / 2 - 0.1,
        maxX: shelf.position.x + shelf.dimensions.width / 2 + 0.1,
        minZ: shelf.position.z - shelf.dimensions.depth / 2 - 0.1,
        maxZ: shelf.position.z + shelf.dimensions.depth / 2 + 0.1,
      };

      if (lineIntersectsAABB(current.position, next.position, shelfAABB)) {
        alerts.push(
          createAlert(
            'trajectory_collision',
            'error',
            `机器人 ${current.robotId} 轨迹在 ${new Date(current.timestamp).toLocaleTimeString()} 疑似穿越货架 ${shelf.code}`,
            {
              fileName: current.source.fileName,
              lineNumber: current.source.lineNumber,
              field: 'position',
              rawValue: JSON.stringify(current.position),
            },
            current.position
          )
        );
        break;
      }
    }
  }

  return alerts;
}

export function validateAllShelves(shelves: Shelf[]): Alert[] {
  const alerts: Alert[] = [];
  const heatMap = new Map<string, number>();

  for (const shelf of shelves) {
    const coordAlert = validateCoordinate(
      shelf.position,
      {
        fileName: shelf.source.fileName,
        lineNumber: shelf.source.lineNumber,
        field: 'position',
        rawValue: JSON.stringify(shelf.position),
      },
      shelf.code
    );
    if (coordAlert) alerts.push(coordAlert);

    const dimAlert = validateDimensions(
      shelf.dimensions,
      {
        fileName: shelf.source.fileName,
        lineNumber: shelf.source.lineNumber,
        field: 'dimensions',
        rawValue: JSON.stringify(shelf.dimensions),
      },
      shelf.code
    );
    if (dimAlert) alerts.push(dimAlert);

    const heatAlert = validateHeatValue(
      shelf.heatValue,
      {
        fileName: shelf.source.fileName,
        lineNumber: shelf.source.lineNumber,
        field: 'heatValue',
        rawValue: String(shelf.heatValue),
      },
      shelf.code,
      heatMap.get(shelf.code)
    );
    if (heatAlert) alerts.push(heatAlert);

    heatMap.set(shelf.code, shelf.heatValue);
  }

  alerts.push(...checkShelfOverlap(shelves));

  return alerts;
}
