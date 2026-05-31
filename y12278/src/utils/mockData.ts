import type { ShipModel, CargoGrid, CargoCell, CargoItem, BallastVersion, WeatherEvidence, ManualCheckRecord, StabilityResult } from '../types';

export const mockShipModel: ShipModel = {
  id: 'SHIP-001',
  name: '远洋号散货船',
  length: 180,
  width: 32,
  depth: 15,
  draft: 9.5,
  displacement: 45000,
  lightShipWeight: 12000,
  lightShipCG: { x: 0, y: 0, z: 6 },
  modelConfig: {
    hullColor: '#0A2463',
    deckColor: '#3E5C76',
  },
  remark: '初始模型，2024年12月修订',
  createdAt: '2024-12-01T08:00:00Z',
};

export const mockCargoGrid: CargoGrid = {
  id: 'GRID-001',
  shipModelId: 'SHIP-001',
  rows: 4,
  cols: 2,
  layers: 2,
  cellWidth: 14,
  cellLength: 20,
  cellHeight: 5,
  gridConfig: {
    origin: { x: -40, y: -14, z: 0 },
  },
  createdAt: '2024-12-01T08:00:00Z',
};

const cellId = (row: number, col: number, layer: number) => 
  `CELL-${layer}-${row}-${col}`;

export const mockCargoCells: CargoCell[] = [
  { id: cellId(0, 0, 0), gridId: 'GRID-001', row: 0, col: 0, layer: 0, maxCapacity: 800, currentLoad: 750, cargoName: '铁矿石', status: 'loaded', centerOfGravity: { x: -30, y: -7, z: 2.5 } },
  { id: cellId(0, 1, 0), gridId: 'GRID-001', row: 0, col: 1, layer: 0, maxCapacity: 800, currentLoad: 600, cargoName: '铁矿石', status: 'loaded', centerOfGravity: { x: -30, y: 7, z: 2.5 } },
  { id: cellId(1, 0, 0), gridId: 'GRID-001', row: 1, col: 0, layer: 0, maxCapacity: 800, currentLoad: 850, cargoName: '煤炭', status: 'overload', centerOfGravity: { x: -10, y: -7, z: 2.5 } },
  { id: cellId(1, 1, 0), gridId: 'GRID-001', row: 1, col: 1, layer: 0, maxCapacity: 800, currentLoad: 780, cargoName: '煤炭', status: 'loaded', centerOfGravity: { x: -10, y: 7, z: 2.5 } },
  { id: cellId(2, 0, 0), gridId: 'GRID-001', row: 2, col: 0, layer: 0, maxCapacity: 800, currentLoad: 720, cargoName: '谷物', status: 'loaded', centerOfGravity: { x: 10, y: -7, z: 2.5 } },
  { id: cellId(2, 1, 0), gridId: 'GRID-001', row: 2, col: 1, layer: 0, maxCapacity: 800, currentLoad: 680, cargoName: '谷物', status: 'loaded', centerOfGravity: { x: 10, y: 7, z: 2.5 } },
  { id: cellId(3, 0, 0), gridId: 'GRID-001', row: 3, col: 0, layer: 0, maxCapacity: 800, currentLoad: 300, cargoName: '钢材', status: 'loaded', centerOfGravity: { x: 30, y: -7, z: 2.5 } },
  { id: cellId(3, 1, 0), gridId: 'GRID-001', row: 3, col: 1, layer: 0, maxCapacity: 800, currentLoad: 400, cargoName: '钢材', status: 'loaded', centerOfGravity: { x: 30, y: 7, z: 2.5 } },
  { id: cellId(0, 0, 1), gridId: 'GRID-001', row: 0, col: 0, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: -30, y: -7, z: 7.5 } },
  { id: cellId(0, 1, 1), gridId: 'GRID-001', row: 0, col: 1, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: -30, y: 7, z: 7.5 } },
  { id: cellId(1, 0, 1), gridId: 'GRID-001', row: 1, col: 0, layer: 1, maxCapacity: 700, currentLoad: 650, cargoName: '集装箱', status: 'loaded', centerOfGravity: { x: -10, y: -7, z: 7.5 } },
  { id: cellId(1, 1, 1), gridId: 'GRID-001', row: 1, col: 1, layer: 1, maxCapacity: 700, currentLoad: 680, cargoName: '集装箱', status: 'warning', centerOfGravity: { x: -10, y: 7, z: 7.5 } },
  { id: cellId(2, 0, 1), gridId: 'GRID-001', row: 2, col: 0, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: 10, y: -7, z: 7.5 } },
  { id: cellId(2, 1, 1), gridId: 'GRID-001', row: 2, col: 1, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: 10, y: 7, z: 7.5 } },
  { id: cellId(3, 0, 1), gridId: 'GRID-001', row: 3, col: 0, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: 30, y: -7, z: 7.5 } },
  { id: cellId(3, 1, 1), gridId: 'GRID-001', row: 3, col: 1, layer: 1, maxCapacity: 700, currentLoad: 0, cargoName: '', status: 'empty', centerOfGravity: { x: 30, y: 7, z: 7.5 } },
];

export const mockCargoItems: CargoItem[] = [
  { id: 'ITEM-001', name: '铁矿石', weight: 50, category: '矿石', color: '#8B4513' },
  { id: 'ITEM-002', name: '煤炭', weight: 40, category: '能源', color: '#2C2C2C' },
  { id: 'ITEM-003', name: '谷物', weight: 25, category: '粮食', color: '#F4D03F' },
  { id: 'ITEM-004', name: '钢材', weight: 80, category: '金属', color: '#707B7C' },
  { id: 'ITEM-005', name: '集装箱', weight: 30, category: '货物', color: '#3498DB' },
];

export const mockBallastVersions: BallastVersion[] = [
  {
    id: 'BALLAST-v1',
    shipModelId: 'SHIP-001',
    version: 'v1.0.0',
    foreTank: 800,
    aftTank: 1200,
    portTank: 600,
    starboardTank: 600,
    totalBallast: 3200,
    remark: '初始压载水配置',
    operator: '张三',
    createdAt: '2025-05-20T09:00:00Z',
    isDeleted: false,
  },
  {
    id: 'BALLAST-v2',
    shipModelId: 'SHIP-001',
    version: 'v1.0.1',
    foreTank: 1000,
    aftTank: 1000,
    portTank: 700,
    starboardTank: 500,
    totalBallast: 3200,
    remark: '调整前后舱配比，平衡纵倾',
    operator: '李四',
    createdAt: '2025-05-25T14:30:00Z',
    isDeleted: false,
  },
  {
    id: 'BALLAST-v3',
    shipModelId: 'SHIP-001',
    version: 'v1.0.2',
    foreTank: 900,
    aftTank: 1100,
    portTank: 750,
    starboardTank: 450,
    totalBallast: 3200,
    remark: '根据最新装载情况微调，补充压载水新版本',
    operator: '王五',
    createdAt: '2025-05-30T10:15:00Z',
    isDeleted: false,
  },
];

export const mockWeatherEvidence: WeatherEvidence = {
  id: 'WEATHER-001',
  stabilityResultId: 'STAB-001',
  weatherLevel: 4,
  windForce: 6,
  waveHeight: 2.5,
  influenceFactor: 1.2,
  recordedAt: '2025-05-30T11:00:00Z',
};

export const mockManualChecks: ManualCheckRecord[] = [
  {
    id: 'CHECK-001',
    stabilityResultId: 'STAB-001',
    checker: '李安全',
    checkItem: 'gravityOffset',
    checkResult: 'confirmed',
    originalValue: { distance: 0.45, direction: '右舷' },
    remark: '经人工复核，重心偏移计算正确，在允许范围内',
    signature: 'LIANQUAN_20250530',
    createdAt: '2025-05-30T11:30:00Z',
  },
  {
    id: 'CHECK-002',
    stabilityResultId: 'STAB-001',
    checker: '李安全',
    checkItem: 'overload',
    checkResult: 'adjusted',
    originalValue: { cellId: 'CELL-0-1-0', overload: 50 },
    adjustedValue: { cellId: 'CELL-0-1-0', overload: 50, action: '移除50吨煤炭至2号舱' },
    remark: '1号舱下层左舷超载50吨，建议转移部分货物',
    signature: 'LIANQUAN_20250530',
    createdAt: '2025-05-30T11:45:00Z',
  },
];

export const mockStabilityResult: StabilityResult = {
  id: 'STAB-001',
  shipModelId: 'SHIP-001',
  cargoGridId: 'GRID-001',
  ballastVersionId: 'BALLAST-v3',
  GM: 0.85,
  heelAngle: 2.3,
  trimAngle: -1.5,
  centerOfGravity: { x: -0.8, y: 0.45, z: 5.2 },
  centerOfBuoyancy: { x: -0.5, y: 0, z: 4.5 },
  displacement: 38500,
  modelConclusion: 'warning',
  gridConclusion: 'danger',
  isConsistent: false,
  overloadCells: ['CELL-1-0-0'],
  gravityOffset: {
    distance: 0.45,
    direction: '右舷',
    allowable: 0.8,
  },
  weatherEvidenceId: 'WEATHER-001',
  manualCheckIds: ['CHECK-001', 'CHECK-002'],
  createdAt: '2025-05-30T11:00:00Z',
};

export const weatherLevelDescriptions: Record<number, { name: string; color: string }> = {
  1: { name: '无浪', color: '#27AE60' },
  2: { name: '微浪', color: '#2ECC71' },
  3: { name: '轻浪', color: '#F1C40F' },
  4: { name: '中浪', color: '#F39C12' },
  5: { name: '大浪', color: '#E67E22' },
  6: { name: '巨浪', color: '#E74C3C' },
  7: { name: '狂浪', color: '#C0392B' },
};
