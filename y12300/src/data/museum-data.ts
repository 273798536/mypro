export interface Floor {
  id: string;
  name: string;
  elevation: number;
}

export interface ExhibitionHall {
  id: string;
  name: string;
  floorId: string;
  capacity: number;
  geometry: { x: number; z: number; width: number; depth: number; height: number };
  type: 'permanent' | 'temporary';
}

export interface Stairway {
  id: string;
  name: string;
  fromFloorId: string;
  toFloorId: string;
  position: { x: number; z: number };
}

export interface VisitorRecord {
  id: string;
  hallId: string;
  timestamp: number;
  count: number;
  source: string;
  version: string;
  floorId?: string;
}

export interface RouteSegment {
  id: string;
  routeId: string;
  fromId: string;
  toId: string;
  order: number;
}

export interface Route {
  id: string;
  name: string;
  type: 'main' | 'secondary' | 'emergency';
  segments: RouteSegment[];
}

export interface ValidationIssue {
  id: string;
  type: 'floor_mismatch' | 'duplicate_count' | 'route_breakpoint';
  severity: 'warning' | 'error';
  description: string;
  affectedHalls: string[];
  affectedRoutes: string[];
  relatedObjectId: string;
}

export interface DataSource {
  id: string;
  systemName: string;
  collectionTime: string;
  version: string;
  calibrationNote: string;
}

export const floors: Floor[] = [
  { id: 'B1', name: 'B1 地下层', elevation: 0 },
  { id: 'F1', name: 'F1 一层', elevation: 4 },
  { id: 'F2', name: 'F2 二层', elevation: 8 },
];

export const halls: ExhibitionHall[] = [
  { id: 'H01', name: '古代文明馆', floorId: 'B1', capacity: 200, geometry: { x: -6, z: -4, width: 5, depth: 6, height: 3 }, type: 'permanent' },
  { id: 'H02', name: '临时展厅A', floorId: 'B1', capacity: 150, geometry: { x: 2, z: -4, width: 5, depth: 6, height: 3 }, type: 'temporary' },
  { id: 'H03', name: '青铜器馆', floorId: 'F1', capacity: 180, geometry: { x: -6, z: -4, width: 4, depth: 5, height: 3 }, type: 'permanent' },
  { id: 'H04', name: '陶瓷馆', floorId: 'F1', capacity: 160, geometry: { x: -1, z: -4, width: 4, depth: 5, height: 3 }, type: 'permanent' },
  { id: 'H05', name: '书画馆', floorId: 'F1', capacity: 120, geometry: { x: 4, z: -4, width: 4, depth: 5, height: 3 }, type: 'permanent' },
  { id: 'H06', name: '现代艺术馆', floorId: 'F2', capacity: 220, geometry: { x: -6, z: -4, width: 5, depth: 6, height: 3 }, type: 'permanent' },
  { id: 'H07', name: '摄影馆', floorId: 'F2', capacity: 140, geometry: { x: 1, z: -4, width: 4, depth: 5, height: 3 }, type: 'permanent' },
  { id: 'H08', name: '临时展厅B', floorId: 'F2', capacity: 130, geometry: { x: 6, z: -4, width: 4, depth: 5, height: 3 }, type: 'temporary' },
];

export const stairways: Stairway[] = [
  { id: 'S01', name: '西侧楼梯1', fromFloorId: 'B1', toFloorId: 'F1', position: { x: -9, z: 2 } },
  { id: 'S02', name: '西侧楼梯2', fromFloorId: 'F1', toFloorId: 'F2', position: { x: -9, z: 2 } },
  { id: 'S03', name: '东侧楼梯1', fromFloorId: 'B1', toFloorId: 'F1', position: { x: 9, z: 2 } },
  { id: 'S04', name: '东侧楼梯2', fromFloorId: 'F1', toFloorId: 'F2', position: { x: 9, z: 2 } },
];

const TIME_BASE = 9 * 3600;

export const visitorRecords: VisitorRecord[] = [
  { id: 'V01', hallId: 'H01', timestamp: TIME_BASE, count: 85, source: 'counter-a', version: 'v2.1' },
  { id: 'V02', hallId: 'H01', timestamp: TIME_BASE + 3600, count: 145, source: 'counter-a', version: 'v2.1' },
  { id: 'V03', hallId: 'H01', timestamp: TIME_BASE + 7200, count: 190, source: 'counter-a', version: 'v2.1' },
  { id: 'V04', hallId: 'H02', timestamp: TIME_BASE, count: 60, source: 'counter-b', version: 'v1.3' },
  { id: 'V05', hallId: 'H02', timestamp: TIME_BASE + 3600, count: 95, source: 'counter-b', version: 'v1.3' },
  { id: 'V06', hallId: 'H02', timestamp: TIME_BASE + 7200, count: 130, source: 'counter-b', version: 'v1.3' },
  { id: 'V07', hallId: 'H03', timestamp: TIME_BASE, count: 70, source: 'counter-a', version: 'v2.1' },
  { id: 'V08', hallId: 'H03', timestamp: TIME_BASE + 3600, count: 120, source: 'counter-a', version: 'v2.1' },
  { id: 'V09', hallId: 'H03', timestamp: TIME_BASE + 7200, count: 160, source: 'counter-a', version: 'v2.1' },
  { id: 'V10', hallId: 'H04', timestamp: TIME_BASE, count: 90, source: 'counter-c', version: 'v1.0' },
  { id: 'V11', hallId: 'H04', timestamp: TIME_BASE + 3600, count: 140, source: 'counter-c', version: 'v1.0' },
  { id: 'V12', hallId: 'H04', timestamp: TIME_BASE + 7200, count: 155, source: 'counter-c', version: 'v1.0' },
  { id: 'V13', hallId: 'H05', timestamp: TIME_BASE, count: 45, source: 'counter-a', version: 'v2.1' },
  { id: 'V14', hallId: 'H05', timestamp: TIME_BASE + 3600, count: 80, source: 'counter-a', version: 'v2.1' },
  { id: 'V15', hallId: 'H05', timestamp: TIME_BASE + 7200, count: 110, source: 'counter-a', version: 'v2.1' },
  { id: 'V16', hallId: 'H06', timestamp: TIME_BASE, count: 100, source: 'counter-b', version: 'v1.3' },
  { id: 'V17', hallId: 'H06', timestamp: TIME_BASE + 3600, count: 180, source: 'counter-b', version: 'v1.3' },
  { id: 'V18', hallId: 'H06', timestamp: TIME_BASE + 7200, count: 210, source: 'counter-b', version: 'v1.3' },
  { id: 'V19', hallId: 'H07', timestamp: TIME_BASE, count: 55, source: 'counter-c', version: 'v1.0' },
  { id: 'V20', hallId: 'H07', timestamp: TIME_BASE + 3600, count: 90, source: 'counter-c', version: 'v1.0' },
  { id: 'V21', hallId: 'H07', timestamp: TIME_BASE + 7200, count: 125, source: 'counter-c', version: 'v1.0' },
  { id: 'V22', hallId: 'H08', timestamp: TIME_BASE, count: 40, source: 'counter-b', version: 'v1.3' },
  { id: 'V23', hallId: 'H08', timestamp: TIME_BASE + 3600, count: 75, source: 'counter-b', version: 'v1.3' },
  { id: 'V24', hallId: 'H08', timestamp: TIME_BASE + 7200, count: 100, source: 'counter-b', version: 'v1.3' },
  { id: 'V25', hallId: 'H03', timestamp: TIME_BASE + 7200, count: 155, source: 'counter-c', version: 'v1.0', floorId: 'F2' },
  { id: 'V26', hallId: 'H04', timestamp: TIME_BASE + 3600, count: 138, source: 'counter-a', version: 'v2.1' },
];

export const routes: Route[] = [
  {
    id: 'R01',
    name: '主参观路线',
    type: 'main',
    segments: [
      { id: 'RS01', routeId: 'R01', fromId: 'H01', toId: 'H02', order: 1 },
      { id: 'RS02', routeId: 'R01', fromId: 'H02', toId: 'S01', order: 2 },
      { id: 'RS03', routeId: 'R01', fromId: 'S01', toId: 'H03', order: 3 },
      { id: 'RS04', routeId: 'R01', fromId: 'H03', toId: 'H04', order: 4 },
      { id: 'RS05', routeId: 'R01', fromId: 'H04', toId: 'H05', order: 5 },
      { id: 'RS06', routeId: 'R01', fromId: 'H05', toId: 'S02', order: 6 },
      { id: 'RS07', routeId: 'R01', fromId: 'S02', toId: 'H06', order: 7 },
      { id: 'RS08', routeId: 'R01', fromId: 'H06', toId: 'H07', order: 8 },
    ],
  },
  {
    id: 'R02',
    name: '快速通道',
    type: 'secondary',
    segments: [
      { id: 'RS09', routeId: 'R02', fromId: 'H01', toId: 'S03', order: 1 },
      { id: 'RS10', routeId: 'R02', fromId: 'S03', toId: 'H04', order: 2 },
      { id: 'RS11', routeId: 'R02', fromId: 'H04', toId: 'S04', order: 3 },
      { id: 'RS12', routeId: 'R02', fromId: 'S04', toId: 'H07', order: 4 },
      { id: 'RS13', routeId: 'R02', fromId: 'H07', toId: 'H08', order: 5 },
    ],
  },
  {
    id: 'R03',
    name: '应急疏散路线',
    type: 'emergency',
    segments: [
      { id: 'RS14', routeId: 'R03', fromId: 'H06', toId: 'H08', order: 1 },
      { id: 'RS15', routeId: 'R03', fromId: 'H08', toId: 'H01', order: 2 },
    ],
  },
];

export const dataSources: DataSource[] = [
  { id: 'DS01', systemName: 'counter-a', collectionTime: '2026-06-01T08:00:00', version: 'v2.1', calibrationNote: '红外双目计数器，采样间隔5min，校准日期2026-05-15' },
  { id: 'DS02', systemName: 'counter-b', collectionTime: '2026-06-01T08:00:00', version: 'v1.3', calibrationNote: 'Wi-Fi探针估算，采样间隔10min，校准日期2026-04-20' },
  { id: 'DS03', systemName: 'counter-c', collectionTime: '2026-06-01T08:00:00', version: 'v1.0', calibrationNote: '摄像头AI计数，采样间隔3min，校准日期2026-05-28' },
];

export function getHallCenter(hall: ExhibitionHall): [number, number, number] {
  const floor = floors.find((f) => f.id === hall.floorId);
  const y = floor ? floor.elevation + hall.geometry.height / 2 : 0;
  return [hall.geometry.x + hall.geometry.width / 2, y, hall.geometry.z + hall.geometry.depth / 2];
}

export function getStairwayCenter(stair: Stairway): [number, number, number] {
  const fromFloor = floors.find((f) => f.id === stair.fromFloorId);
  const toFloor = floors.find((f) => f.id === stair.toFloorId);
  const y = ((fromFloor?.elevation ?? 0) + (toFloor?.elevation ?? 0)) / 2;
  return [stair.position.x, y, stair.position.z];
}
