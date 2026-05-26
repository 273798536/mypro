import type { Shelf, RobotTrajectory, Aisle, OrderHeat } from '../types';

const SOURCE_FILES = {
  shelves: 'shelf_coordinates_2024.csv',
  trajectories: 'robot_trajectories_2024.json',
  aisles: 'warehouse_layout.csv',
  orderHeat: 'order_heatmap_2024.csv',
};

export function generateMockShelves(count: number = 48): Shelf[] {
  const shelves: Shelf[] = [];
  const rows = 6;
  const cols = 8;
  const shelfWidth = 3;
  const shelfDepth = 1.5;
  const aisleWidth = 4;
  const rowSpacing = shelfDepth + aisleWidth;
  const colSpacing = shelfWidth + 1;

  let lineNumber = 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const heatValue = Math.floor(Math.random() * 100);

      shelves.push({
        id: `shelf-${row}-${col}`,
        code: `R${row + 1}-C${col + 1}`,
        row: row + 1,
        col: col + 1,
        level: 1,
        position: {
          x: col * colSpacing - (cols * colSpacing) / 2,
          y: 0,
          z: row * rowSpacing - (rows * rowSpacing) / 2,
        },
        dimensions: {
          width: shelfWidth,
          height: 4 + Math.random() * 2,
          depth: shelfDepth,
        },
        heatValue,
        source: {
          fileName: SOURCE_FILES.shelves,
          lineNumber: lineNumber++,
        },
      });
    }
  }

  return shelves;
}

export function generateMockTrajectories(
  robotCount: number = 3,
  pointsPerRobot: number = 100
): RobotTrajectory[] {
  const trajectories: RobotTrajectory[] = [];
  const now = Date.now();
  let lineNumber = 2;

  for (let r = 0; r < robotCount; r++) {
    const robotId = `AGV-00${r + 1}`;
    const startX = -30 + r * 20;
    const startZ = -25 + Math.random() * 10;

    for (let i = 0; i < pointsPerRobot; i++) {
      const progress = i / pointsPerRobot;
      const baseAngle = progress * Math.PI * 4;
      const radius = 15 + r * 5;

      const status: Array<'moving' | 'waiting' | 'picking' | 'blocked'> = [
        'moving',
        'moving',
        'moving',
        'waiting',
        'picking',
      ];
      const currentStatus = status[Math.floor(Math.random() * status.length)];

      trajectories.push({
        id: `traj-${r}-${i}`,
        robotId,
        timestamp: now + progress * 3600000,
        position: {
          x: startX + Math.cos(baseAngle) * radius * (0.5 + progress * 0.5),
          y: 0.3,
          z: startZ + Math.sin(baseAngle) * radius * 0.6,
        },
        speed: currentStatus === 'moving' ? 1.5 + Math.random() : 0,
        status: currentStatus,
        source: {
          fileName: SOURCE_FILES.trajectories,
          lineNumber: lineNumber++,
        },
      });
    }
  }

  return trajectories;
}

export function generateMockAisles(count: number = 7): Aisle[] {
  const aisles: Aisle[] = [];
  let lineNumber = 2;

  for (let i = 0; i < count; i++) {
    const zPos = -25 + i * 8;
    const blockageLevel = Math.random() * 100;

    aisles.push({
      id: `aisle-${i}`,
      code: `A-${String(i + 1).padStart(2, '0')}`,
      startPoint: { x: -40, z: zPos },
      endPoint: { x: 40, z: zPos },
      width: 3,
      blockageLevel,
      source: {
        fileName: SOURCE_FILES.aisles,
        lineNumber: lineNumber++,
      },
    });
  }

  return aisles;
}

export function generateMockOrderHeat(
  shelves: Shelf[],
  days: number = 7
): OrderHeat[] {
  const orderHeats: OrderHeat[] = [];
  const now = Date.now();
  let lineNumber = 2;

  for (const shelf of shelves) {
    for (let d = 0; d < days; d++) {
      const timestamp = now - d * 86400000;
      const decayFactor = Math.pow(0.85, d);
      const pickCount = Math.floor(shelf.heatValue * decayFactor * (0.8 + Math.random() * 0.4));

      orderHeats.push({
        id: `heat-${shelf.id}-${d}`,
        shelfId: shelf.id,
        timestamp,
        pickCount,
        source: {
          fileName: SOURCE_FILES.orderHeat,
          lineNumber: lineNumber++,
        },
      });
    }
  }

  return orderHeats;
}

export interface MockDataSet {
  shelves: Shelf[];
  trajectories: RobotTrajectory[];
  aisles: Aisle[];
  orderHeats: OrderHeat[];
}

export function generateCompleteMockData(): MockDataSet {
  const shelves = generateMockShelves();
  const trajectories = generateMockTrajectories();
  const aisles = generateMockAisles();
  const orderHeats = generateMockOrderHeat(shelves);

  return { shelves, trajectories, aisles, orderHeats };
}

export const META_DATA = {
  generatedAt: new Date().toISOString(),
  version: '1.0.0',
  sourceFiles: Object.values(SOURCE_FILES),
  warehouseId: 'WH-SH-001',
  warehouseName: '上海浦东仓库',
};
