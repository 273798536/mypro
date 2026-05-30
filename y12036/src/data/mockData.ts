import type { Ship, Port, TideTable, TideEntry } from '@/types/game'

export const INITIAL_ROUNDS = 8

const TIDE_PATTERNS: TideEntry[][] = [
  [
    { round: 1, type: 'high', level: 9, dockable: true, dangerous: false },
    { round: 2, type: 'falling', level: 6, dockable: true, dangerous: false },
    { round: 3, type: 'low', level: 2, dockable: false, dangerous: true },
    { round: 4, type: 'rising', level: 5, dockable: true, dangerous: false },
    { round: 5, type: 'high', level: 10, dockable: true, dangerous: false },
    { round: 6, type: 'falling', level: 4, dockable: false, dangerous: true },
    { round: 7, type: 'low', level: 1, dockable: false, dangerous: true },
    { round: 8, type: 'rising', level: 7, dockable: true, dangerous: false },
  ],
  [
    { round: 1, type: 'rising', level: 7, dockable: true, dangerous: false },
    { round: 2, type: 'high', level: 10, dockable: true, dangerous: false },
    { round: 3, type: 'falling', level: 5, dockable: true, dangerous: false },
    { round: 4, type: 'low', level: 2, dockable: false, dangerous: true },
    { round: 5, type: 'rising', level: 6, dockable: true, dangerous: false },
    { round: 6, type: 'high', level: 9, dockable: true, dangerous: false },
    { round: 7, type: 'falling', level: 3, dockable: false, dangerous: true },
    { round: 8, type: 'low', level: 1, dockable: false, dangerous: true },
  ],
  [
    { round: 1, type: 'low', level: 1, dockable: false, dangerous: true },
    { round: 2, type: 'rising', level: 4, dockable: true, dangerous: false },
    { round: 3, type: 'high', level: 8, dockable: true, dangerous: false },
    { round: 4, type: 'falling', level: 6, dockable: true, dangerous: false },
    { round: 5, type: 'low', level: 2, dockable: false, dangerous: true },
    { round: 6, type: 'rising', level: 5, dockable: true, dangerous: false },
    { round: 7, type: 'high', level: 9, dockable: true, dangerous: false },
    { round: 8, type: 'falling', level: 4, dockable: false, dangerous: true },
  ],
  [
    { round: 1, type: 'high', level: 8, dockable: true, dangerous: false },
    { round: 2, type: 'high', level: 9, dockable: true, dangerous: false },
    { round: 3, type: 'falling', level: 5, dockable: true, dangerous: false },
    { round: 4, type: 'low', level: 3, dockable: false, dangerous: true },
    { round: 5, type: 'rising', level: 6, dockable: true, dangerous: false },
    { round: 6, type: 'high', level: 10, dockable: true, dangerous: false },
    { round: 7, type: 'falling', level: 4, dockable: false, dangerous: true },
    { round: 8, type: 'low', level: 2, dockable: false, dangerous: true },
  ],
]

export const mockPorts: Port[] = [
  {
    id: 'port-a',
    name: '翡翠港',
    position: { x: 120, y: 180 },
    berths: [
      { id: 'berth-a1', portId: 'port-a', capacity: 2, currentShipId: null, status: 'available' },
      { id: 'berth-a2', portId: 'port-a', capacity: 1, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['燃油', '食品', '淡水'],
  },
  {
    id: 'port-b',
    name: '珊瑚码头',
    position: { x: 380, y: 100 },
    berths: [
      { id: 'berth-b1', portId: 'port-b', capacity: 2, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['建材', '机械'],
  },
  {
    id: 'port-c',
    name: '浪花湾',
    position: { x: 600, y: 200 },
    berths: [
      { id: 'berth-c1', portId: 'port-c', capacity: 3, currentShipId: null, status: 'available' },
      { id: 'berth-c2', portId: 'port-c', capacity: 1, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['燃油', '医疗', '弹药'],
  },
  {
    id: 'port-d',
    name: '龙门渡',
    position: { x: 250, y: 350 },
    berths: [
      { id: 'berth-d1', portId: 'port-d', capacity: 2, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['食品', '淡水', '建材'],
  },
  {
    id: 'port-e',
    name: '星沙岛',
    position: { x: 500, y: 380 },
    berths: [
      { id: 'berth-e1', portId: 'port-e', capacity: 1, currentShipId: null, status: 'available' },
      { id: 'berth-e2', portId: 'port-e', capacity: 1, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['燃油', '机械', '弹药'],
  },
  {
    id: 'port-f',
    name: '礁石锚地',
    position: { x: 750, y: 320 },
    berths: [
      { id: 'berth-f1', portId: 'port-f', capacity: 2, currentShipId: null, status: 'available' },
    ],
    supplyTypes: ['淡水', '食品'],
  },
]

export const mockShips: Ship[] = [
  {
    id: 'ship-1',
    name: '远洋号',
    capacity: 50,
    fuel: 60,
    maxFuel: 80,
    speed: 3,
    currentPortId: 'port-a',
    position: { x: 120, y: 180 },
    status: 'idle',
    cargo: [
      { id: 'cargo-1', type: '燃油', quantity: 20, destination: 'port-c' },
      { id: 'cargo-2', type: '食品', quantity: 15, destination: 'port-d' },
    ],
  },
  {
    id: 'ship-2',
    name: '破浪者',
    capacity: 30,
    fuel: 40,
    maxFuel: 50,
    speed: 4,
    currentPortId: 'port-b',
    position: { x: 380, y: 100 },
    status: 'idle',
    cargo: [
      { id: 'cargo-3', type: '建材', quantity: 10, destination: 'port-e' },
    ],
  },
  {
    id: 'ship-3',
    name: '潮汐猎人',
    capacity: 40,
    fuel: 25,
    maxFuel: 60,
    speed: 5,
    currentPortId: 'port-d',
    position: { x: 250, y: 350 },
    status: 'idle',
    cargo: [
      { id: 'cargo-4', type: '机械', quantity: 8, destination: 'port-f' },
      { id: 'cargo-5', type: '淡水', quantity: 12, destination: 'port-a' },
    ],
  },
  {
    id: 'ship-4',
    name: '东风渡',
    capacity: 60,
    fuel: 70,
    maxFuel: 100,
    speed: 2,
    currentPortId: 'port-c',
    position: { x: 600, y: 200 },
    status: 'idle',
    cargo: [],
  },
]

export const mockTideTables: TideTable[] = [
  {
    portId: 'port-a',
    entries: TIDE_PATTERNS[0],
    missingRanges: [],
  },
  {
    portId: 'port-b',
    entries: TIDE_PATTERNS[1],
    missingRanges: [
      { startRound: 3, endRound: 4, reason: '珊瑚码头潮汐表延迟补充' },
    ],
  },
  {
    portId: 'port-c',
    entries: TIDE_PATTERNS[2],
    missingRanges: [],
  },
  {
    portId: 'port-d',
    entries: TIDE_PATTERNS[3],
    missingRanges: [
      { startRound: 5, endRound: 6, reason: '龙门渡观测设备维护' },
    ],
  },
  {
    portId: 'port-e',
    entries: TIDE_PATTERNS[0],
    missingRanges: [
      { startRound: 7, endRound: 8, reason: '星沙岛潮汐数据待录入' },
    ],
  },
  {
    portId: 'port-f',
    entries: TIDE_PATTERNS[1],
    missingRanges: [],
  },
]
