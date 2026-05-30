import type { Roof, Panel, Obstacle } from './types';

export const mockRoof: Roof = {
  id: 'roof-001',
  width: 20,
  height: 12,
  tilt: 25,
  azimuth: 180,
  notes: '混凝土坡屋顶，东南角有女儿墙，业主说去年刚做过防水。现场测量可能有±2度误差。',
  dataQuality: 'dirty',
};

export const mockPanels: Panel[] = [
  { id: 'p-001', roofId: 'roof-001', x: -8, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-002', roofId: 'roof-001', x: -6, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-003', roofId: 'roof-001', x: -4, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-004', roofId: 'roof-001', x: -2, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-005', roofId: 'roof-001', x: 0, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-006', roofId: 'roof-001', x: 2, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-007', roofId: 'roof-001', x: 4, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-008', roofId: 'roof-001', x: 6, y: -4, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: '这排组件施工时可能偏了', hasAzimuthError: true, hasSeasonMiss: false },
  { id: 'p-009', roofId: 'roof-001', x: -8, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-010', roofId: 'roof-001', x: -6, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-011', roofId: 'roof-001', x: -4, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-012', roofId: 'roof-001', x: -2, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-013', roofId: 'roof-001', x: 0, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-014', roofId: 'roof-001', x: 2, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-015', roofId: 'roof-001', x: 4, y: -1.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-016', roofId: 'roof-001', x: 6, y: -1.5, hasAzimuthError: true, hasSeasonMiss: false },
  { id: 'p-017', roofId: 'roof-001', x: -8, y: 1, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-018', roofId: 'roof-001', x: -6, y: 1, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-019', roofId: 'roof-001', x: -4, y: 1, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: '靠近烟囱，冬季上午阴影明显', hasAzimuthError: false, hasSeasonMiss: true },
  { id: 'p-020', roofId: 'roof-001', x: -2, y: 1, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: '烟囱阴影影响', hasAzimuthError: false, hasSeasonMiss: true },
  { id: 'p-021', roofId: 'roof-001', x: 0, y: 1, efficiency: 0.22, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-022', roofId: 'roof-001', x: 2, y: 1, width: 1.7, height: 1.0, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-023', roofId: 'roof-001', x: 4, y: 1, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-024', roofId: 'roof-001', x: 6, y: 1, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: true, hasSeasonMiss: false },
  { id: 'p-025', roofId: 'roof-001', x: -8, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-026', roofId: 'roof-001', x: -6, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-027', roofId: 'roof-001', x: -4, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: '冬季被烟囱挡', hasAzimuthError: false, hasSeasonMiss: true },
  { id: 'p-028', roofId: 'roof-001', x: -2, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-029', roofId: 'roof-001', x: 0, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-030', roofId: 'roof-001', x: 2, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-031', roofId: 'roof-001', x: 4, y: 3.5, width: 1.7, height: 1.0, efficiency: 0.22, model: 'JKM390N', notes: null, hasAzimuthError: false, hasSeasonMiss: false },
  { id: 'p-032', roofId: 'roof-001', x: 6, y: 3.5, hasAzimuthError: true, hasSeasonMiss: false },
];

export const mockObstacles: Obstacle[] = [
  { id: 'obs-001', roofId: 'roof-001', type: 'chimney', x: -4.5, y: 2.5, height: 2.5, notes: null, loaded: false },
  { id: 'obs-002', roofId: 'roof-001', type: 'antenna', x: 3, y: -3, height: 1.8, notes: null, loaded: false },
  { id: 'obs-003', roofId: 'roof-001', type: 'pipe', x: 5, y: 2, height: 0.5, notes: null, loaded: false },
];

export function loadObstaclesAsync(): Promise<Obstacle[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'obs-001', roofId: 'roof-001', type: 'chimney', x: -4.5, y: 2.5, height: 2.5, notes: '砖砌烟囱，截面0.8x0.8m，业主不同意挪动', loaded: true },
        { id: 'obs-002', roofId: 'roof-001', type: 'antenna', x: 3, y: -3, height: 1.8, notes: '运营商基站天线，已沟通可西移1.5m', loaded: true },
        { id: 'obs-003', roofId: 'roof-001', type: 'pipe', x: 5, y: 2, height: 0.5, notes: '排水通气管，可改走向', loaded: true },
      ]);
    }, 2500);
  });
}
