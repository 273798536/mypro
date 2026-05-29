import type { Warehouse, Road, Supply } from '../types';

const supplies: Supply[] = [
  {
    id: 's1',
    type: '沙袋',
    name: '沙袋',
    quantity: 5000,
    unit: '个',
    warehouseId: 'wh1',
  },
  {
    id: 's2',
    type: '救生衣',
    name: '救生衣',
    quantity: 800,
    unit: '件',
    warehouseId: 'wh1',
  },
  {
    id: 's3',
    type: '帐篷',
    name: '帐篷',
    quantity: 200,
    unit: '顶',
    warehouseId: 'wh1',
  },
  {
    id: 's4',
    type: '沙袋',
    name: '沙袋',
    quantity: 3000,
    unit: '个',
    warehouseId: 'wh2',
  },
  {
    id: 's5',
    type: '饮用水',
    name: '净水设备',
    quantity: 50,
    unit: '台',
    warehouseId: 'wh2',
  },
  {
    id: 's6',
    type: '医疗物资',
    name: '急救包',
    quantity: 1000,
    unit: '个',
    warehouseId: 'wh2',
  },
  {
    id: 's7',
    type: '帐篷',
    name: '帐篷',
    quantity: 150,
    unit: '顶',
    warehouseId: 'wh3',
  },
  {
    id: 's8',
    type: '发电机',
    name: '发电机组',
    quantity: 20,
    unit: '台',
    warehouseId: 'wh3',
  },
];

function h(x: number, z: number): number {
  return (
    Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2 +
    Math.sin(x * 0.1 + z * 0.1) * 3 +
    Math.cos(x * 0.05) * Math.sin(z * 0.08) * 1.5
  );
}

const warehouses: Warehouse[] = [
  {
    id: 'wh1',
    name: '城北应急物资中心',
    position: [-8, h(-8, -8) + 0.6, -8],
    elevation: 45,
    supplies: supplies.filter((s) => s.warehouseId === 'wh1'),
    serviceRadius: 15,
    status: 'normal',
  },
  {
    id: 'wh2',
    name: '河东应急储备站',
    position: [12, h(12, -5) + 0.6, -5],
    elevation: 32,
    supplies: supplies.filter((s) => s.warehouseId === 'wh2'),
    serviceRadius: 12,
    status: 'isolated',
  },
  {
    id: 'wh3',
    name: '南山物资中转站',
    position: [5, h(5, 12) + 0.6, 12],
    elevation: 78,
    supplies: supplies.filter((s) => s.warehouseId === 'wh3'),
    serviceRadius: 10,
    status: 'normal',
  },
];

const roads: Road[] = [
  {
    id: 'rd1',
    name: '北城大道',
    waypoints: [
      [-8, h(-8, -8) + 0.15, -8],
      [2, h(2, -6) + 0.15, -6],
      [12, h(12, -5) + 0.15, -5],
    ],
    slopeAngle: 3,
    status: 'interrupted',
    interruptReason: '暴雨导致路面塌陷，东西向车道阻断',
    connectedWarehouseIds: ['wh1', 'wh2'],
  },
  {
    id: 'rd2',
    name: '河东滨河路',
    waypoints: [
      [12, h(12, -5) + 0.15, -5],
      [10, h(10, 2) + 0.15, 2],
      [5, h(5, 12) + 0.15, 12],
    ],
    slopeAngle: 5,
    status: 'interrupted',
    interruptReason: '洪水漫过路面，水深1.2米，车辆无法通行',
    connectedWarehouseIds: ['wh2', 'wh3'],
  },
  {
    id: 'rd3',
    name: '南山盘山路',
    waypoints: [
      [2, h(2, -6) + 0.15, -6],
      [3, h(3, 3) + 0.15, 3],
      [5, h(5, 12) + 0.15, 12],
    ],
    slopeAngle: 18,
    status: 'slope_limited',
    slopeLimitedReason: '坡度18°超过重型运输车安全限值15°，仅允许轻型车辆通行',
    connectedWarehouseIds: ['wh1', 'wh3'],
  },
  {
    id: 'rd4',
    name: '河东支路',
    waypoints: [
      [12, h(12, -5) + 0.15, -5],
      [14, h(14, 0) + 0.15, 0],
      [10, h(10, 8) + 0.15, 8],
    ],
    slopeAngle: 7,
    status: 'interrupted',
    interruptReason: '山体滑坡掩埋路基约50米，预计48小时内无法抢通',
    connectedWarehouseIds: ['wh2', 'wh3'],
  },
  {
    id: 'rd5',
    name: '城东环路',
    waypoints: [
      [-8, h(-8, -8) + 0.15, -8],
      [-2, h(-2, 0) + 0.15, 0],
      [5, h(5, 12) + 0.15, 12],
    ],
    slopeAngle: 12,
    status: 'open',
    connectedWarehouseIds: ['wh1', 'wh3'],
  },
];

export const mockWarehouses = warehouses;
export const mockRoads = roads;
export const mockSupplies = supplies;
